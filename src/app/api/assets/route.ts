import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2 } from "@/lib/storage/r2";
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_AUDIO_TYPES,
  MAX_FILE_SIZES,
} from "@/lib/avatar-identity";

// GET /api/assets - List all assets
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const where = type ? { type: type as any } : {};

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Convert BigInt to Number for JSON serialization
  const serializedAssets = assets.map((asset) => ({
    ...asset,
    sizeBytes: Number(asset.sizeBytes),
  }));

  return NextResponse.json(serializedAssets);
}

// POST /api/assets - Upload a new asset
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "No name provided" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "No type provided" }, { status: 400 });
    }

    // Validate asset type
    const validTypes = ["TRAINING_VIDEO", "HEADSHOT", "VOICE_SAMPLE", "BACKGROUND", "SOUND_EFFECT", "SCENE_IMAGE"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file type based on asset type
    const mimeType = file.type;
    let isValidMimeType = false;
    let maxSize = MAX_FILE_SIZES.headshot;

    switch (type) {
      case "HEADSHOT":
      case "BACKGROUND":
      case "SCENE_IMAGE":
        isValidMimeType = SUPPORTED_IMAGE_TYPES.includes(mimeType);
        maxSize = MAX_FILE_SIZES.headshot;
        break;
      case "TRAINING_VIDEO":
        isValidMimeType = SUPPORTED_VIDEO_TYPES.includes(mimeType);
        maxSize = MAX_FILE_SIZES.trainingVideo;
        break;
      case "VOICE_SAMPLE":
        isValidMimeType = SUPPORTED_AUDIO_TYPES.includes(mimeType);
        maxSize = MAX_FILE_SIZES.voiceSample;
        break;
      case "SOUND_EFFECT":
        isValidMimeType = SUPPORTED_AUDIO_TYPES.includes(mimeType);
        maxSize = MAX_FILE_SIZES.voiceSample;
        break;
    }

    if (!isValidMimeType) {
      return NextResponse.json(
        { error: `Invalid file type for ${type}: ${mimeType}` },
        { status: 400 }
      );
    }

    // Check file size
    const fileSize = file.size;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }

    // Create asset record first (in UPLOADING status)
    const asset = await prisma.asset.create({
      data: {
        name,
        type: type as any,
        status: "UPLOADING",
        r2Key: "",
        mimeType,
        sizeBytes: fileSize,
        folder: folder || null,
      },
    });

    try {
      // Generate R2 key
      const extension = mimeType.split("/")[1] || "bin";
      const r2Key = `assets/${type.toLowerCase()}/${asset.id}.${extension}`;

      // Upload to R2
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadToR2(buffer, r2Key, mimeType);

      // Update asset with R2 info
      const updatedAsset = await prisma.asset.update({
        where: { id: asset.id },
        data: {
          r2Key,
          r2Url: uploadResult.url,
          status: "READY",
        },
      });

      // Convert BigInt to Number for JSON serialization
      return NextResponse.json({
        ...updatedAsset,
        sizeBytes: Number(updatedAsset.sizeBytes),
      });
    } catch (uploadError) {
      // If upload fails, mark asset as failed
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: "FAILED" },
      });
      throw uploadError;
    }
  } catch (error) {
    console.error("Asset upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
