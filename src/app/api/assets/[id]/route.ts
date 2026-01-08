import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFromR2, getSignedDownloadUrl } from "@/lib/storage/r2";

// GET /api/assets/[id] - Get a single asset
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Generate signed URL for viewing
  let signedUrl: string | null = null;
  if (asset.r2Key) {
    try {
      signedUrl = await getSignedDownloadUrl(asset.r2Key, 3600);
    } catch (error) {
      console.error("Error generating signed URL:", error);
    }
  }

  return NextResponse.json({
    ...asset,
    signedUrl,
  });
}

// PATCH /api/assets/[id] - Update asset metadata
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const { name, elevenLabsVoiceId } = body;

  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const updatedAsset = await prisma.asset.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(elevenLabsVoiceId !== undefined && { elevenLabsVoiceId }),
    },
  });

  return NextResponse.json(updatedAsset);
}

// DELETE /api/assets/[id] - Delete an asset
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Delete from R2
  if (asset.r2Key) {
    try {
      await deleteFromR2(asset.r2Key);
    } catch (error) {
      console.error("Error deleting from R2:", error);
      // Continue with database deletion even if R2 fails
    }
  }

  // Delete from database
  await prisma.asset.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
