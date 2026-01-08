import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/scenes/[id]/status - Get scene generation status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scene = await prisma.scene.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        audioUrl: true,
        imageUrl: true,
        rawVideoUrl: true,
        lipsyncVideoUrl: true,
        finalVideoUrl: true,
        thumbnailUrl: true,
        failureReason: true,
        retryCount: true,
        lastAttemptAt: true,
        updatedAt: true,
      },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Get recent logs
    const logs = await prisma.generationLog.findMany({
      where: { sceneId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        level: true,
        step: true,
        message: true,
        provider: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...scene,
      logs,
    });
  } catch (error) {
    console.error("Error fetching scene status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
