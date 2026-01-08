import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { inngest } from "@/inngest/client";

// POST /api/scenes/[id]/generate - Trigger scene generation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify scene exists
    const scene = await prisma.scene.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Check if already generating
    if (
      scene.status !== "DRAFT" &&
      scene.status !== "FAILED" &&
      scene.status !== "COMPLETED"
    ) {
      return NextResponse.json(
        { error: "Scene is already being generated" },
        { status: 400 }
      );
    }

    // Reset scene status
    await prisma.scene.update({
      where: { id },
      data: {
        status: "DRAFT",
        failureReason: null,
        lastAttemptAt: new Date(),
      },
    });

    // Trigger Inngest function
    await inngest.send({
      name: "scene/generate",
      data: { sceneId: id },
    });

    return NextResponse.json({
      success: true,
      message: "Generation started",
      sceneId: id,
    });
  } catch (error) {
    console.error("Error triggering generation:", error);
    return NextResponse.json(
      { error: "Failed to trigger generation" },
      { status: 500 }
    );
  }
}
