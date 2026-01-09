import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { checkLipsyncStatus } from "@/lib/ai/synclabs";
import { uploadToR2, generateSceneKey } from "@/lib/storage/r2";

/**
 * POST /api/scenes/[id]/check-lipsync
 * Checks the status of a stuck lip-sync job and recovers if completed
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { jobId } = body;

    // Get scene
    const scene = await prisma.scene.findUnique({
      where: { id },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Try to find job ID from logs if not provided
    let syncLabsJobId = jobId;
    if (!syncLabsJobId) {
      const log = await prisma.generationLog.findFirst({
        where: {
          sceneId: id,
          step: "LIPSYNC_APPLICATION",
          message: { contains: "job submitted" },
        },
        orderBy: { createdAt: "desc" },
      });

      if (log) {
        // Extract job ID from message like "Lip-sync job submitted: 3b346618-3a08-4d99-bb49-18fc4ae77b74"
        const match = log.message.match(/submitted: ([a-f0-9-]+)/);
        if (match) {
          syncLabsJobId = match[1];
        }
      }
    }

    if (!syncLabsJobId) {
      return NextResponse.json(
        { error: "No Sync Labs job ID found for this scene" },
        { status: 400 }
      );
    }

    // Check Sync Labs job status
    console.log(`Checking Sync Labs job: ${syncLabsJobId}`);
    const status = await checkLipsyncStatus(syncLabsJobId);

    console.log("Sync Labs status:", status);

    if (status.status === "completed" && status.videoUrl) {
      // Job completed - recover the video
      console.log("Job completed! Downloading video...");
      const videoResponse = await fetch(status.videoUrl);
      if (!videoResponse.ok) {
        return NextResponse.json(
          { error: `Failed to download video: ${videoResponse.status}` },
          { status: 500 }
        );
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      console.log(`Downloaded ${videoBuffer.length} bytes`);

      // Upload to R2
      const r2Key = generateSceneKey(scene.projectId, id, "final");
      const upload = await uploadToR2(videoBuffer, r2Key, "video/mp4");

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
          message: `Lip-sync completed (auto-recovered from job ${syncLabsJobId})`,
          provider: "SyncLabs",
        },
      });

      return NextResponse.json({
        success: true,
        recovered: true,
        message: "Scene recovered successfully",
        syncLabsStatus: status.status,
        finalVideoUrl: upload.url,
      });
    }

    if (status.status === "failed") {
      // Job failed - update scene status
      await prisma.scene.update({
        where: { id },
        data: {
          status: "FAILED",
          failureReason: status.error || "Lip-sync job failed",
        },
      });

      await prisma.generationLog.create({
        data: {
          sceneId: id,
          projectId: scene.projectId,
          step: "LIPSYNC_APPLICATION",
          level: "ERROR",
          message: `Lip-sync failed: ${status.error}`,
          provider: "SyncLabs",
        },
      });

      return NextResponse.json({
        success: false,
        syncLabsStatus: status.status,
        error: status.error,
      });
    }

    // Job still processing
    return NextResponse.json({
      success: true,
      recovered: false,
      syncLabsStatus: status.status,
      jobId: syncLabsJobId,
      message: `Lip-sync job is still ${status.status}. Try again in a few minutes.`,
    });
  } catch (error) {
    console.error("Error checking lip-sync:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
