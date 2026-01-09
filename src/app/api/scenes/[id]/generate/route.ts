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

    // Try to trigger Inngest function
    try {
      await inngest.send({
        name: "scene/generate",
        data: { sceneId: id },
      });

      return NextResponse.json({
        success: true,
        message: "Generation started via Inngest",
        sceneId: id,
        method: "inngest",
      });
    } catch (inngestError) {
      // Inngest failed - likely not configured
      console.error("Inngest send failed:", inngestError);

      // Return info about Inngest setup needed
      const errorMessage = inngestError instanceof Error ? inngestError.message : "Unknown Inngest error";
      return NextResponse.json(
        {
          error: "Inngest not configured. Please set INNGEST_EVENT_KEY in Vercel environment variables, or use /api/scenes/[id]/generate-direct for SSE-based generation.",
          details: errorMessage,
          fallbackUrl: `/api/scenes/${id}/generate-direct`,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error triggering generation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to trigger generation", details: errorMessage },
      { status: 500 }
    );
  }
}
