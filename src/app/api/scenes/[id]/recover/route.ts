import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateSceneKey } from "@/lib/storage/r2";

/**
 * POST /api/scenes/[id]/recover
 * Recovers a stuck scene by fetching completed video from Sync Labs
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { syncLabsJobId, outputUrl } = body;

    if (!outputUrl) {
      return NextResponse.json(
        { error: "outputUrl is required" },
        { status: 400 }
      );
    }

    // Get scene
    const scene = await prisma.scene.findUnique({
      where: { id },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Download video from Sync Labs
    console.log("Downloading video from Sync Labs...");
    const videoResponse = await fetch(outputUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download video: ${videoResponse.status}` },
        { status: 500 }
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    console.log(`Downloaded ${videoBuffer.length} bytes`);

    // Upload to R2
    console.log("Uploading to R2...");
    const r2Key = generateSceneKey(scene.projectId, id, "final");
    const upload = await uploadToR2(videoBuffer, r2Key, "video/mp4");
    console.log(`Uploaded to: ${upload.url}`);

    // Update scene status
    await prisma.scene.update({
      where: { id },
      data: {
        status: "COMPLETED",
        finalVideoUrl: upload.url,
        lipsyncVideoUrl: upload.url,
        lipsyncModel: "sync-2",
      },
    });

    // Log recovery
    await prisma.generationLog.create({
      data: {
        sceneId: id,
        projectId: scene.projectId,
        step: "LIPSYNC_APPLICATION",
        level: "INFO",
        message: `Lip-sync completed (manually recovered from job ${syncLabsJobId || "unknown"})`,
        provider: "SyncLabs",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scene recovered successfully",
      finalVideoUrl: upload.url,
    });
  } catch (error) {
    console.error("Error recovering scene:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recovery failed" },
      { status: 500 }
    );
  }
}
