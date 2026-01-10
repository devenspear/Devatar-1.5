import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/scenes/[id] - Get a single scene
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scene = await prisma.scene.findUnique({
      where: { id },
      include: {
        project: true,
        headshot: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json(scene);
  } catch (error) {
    console.error("Error fetching scene:", error);
    return NextResponse.json(
      { error: "Failed to fetch scene" },
      { status: 500 }
    );
  }
}

// PATCH /api/scenes/[id] - Update a scene
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const scene = await prisma.scene.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(scene);
  } catch (error) {
    console.error("Error updating scene:", error);
    return NextResponse.json(
      { error: "Failed to update scene" },
      { status: 500 }
    );
  }
}

// DELETE /api/scenes/[id] - Delete a scene
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.scene.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scene:", error);
    return NextResponse.json(
      { error: "Failed to delete scene" },
      { status: 500 }
    );
  }
}
