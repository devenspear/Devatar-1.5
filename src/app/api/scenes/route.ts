import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/scenes - Create a new scene
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      name,
      environment,
      wardrobe,
      movement,
      camera,
      dialogue,
      soundEffects,
      targetDuration,
      moodLighting,
      voiceId,
    } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { error: "Project ID and name are required" },
        { status: 400 }
      );
    }

    // Get the next order index
    const lastScene = await prisma.scene.findFirst({
      where: { projectId },
      orderBy: { orderIndex: "desc" },
    });

    const orderIndex = (lastScene?.orderIndex ?? -1) + 1;

    const scene = await prisma.scene.create({
      data: {
        projectId,
        name,
        orderIndex,
        environment,
        wardrobe,
        movement,
        camera,
        dialogue,
        soundEffects,
        targetDuration: targetDuration || 15,
        moodLighting: moodLighting || "cinematic",
        voiceId,
      },
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    console.error("Error creating scene:", error);
    return NextResponse.json(
      { error: "Failed to create scene" },
      { status: 500 }
    );
  }
}
