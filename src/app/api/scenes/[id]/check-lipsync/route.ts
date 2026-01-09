import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateSceneKey } from "@/lib/storage/r2";

const SYNCLABS_API_URL = "https://api.sync.so/v2";

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

    // Check Sync Labs job status directly to get raw response
    console.log(`Checking Sync Labs job: ${syncLabsJobId}`);
    const response = await fetch(`${SYNCLABS_API_URL}/generate/${syncLabsJobId}`, {
      headers: {
        "x-api-key": process.env.SYNCLABS_API_KEY!,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Sync Labs API error: ${response.status} - ${error}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("Sync Labs raw response:", JSON.stringify(data, null, 2));

    // Try multiple possible output URL fields
    const videoUrl = data.output_url || data.outputUrl || data.video_url || data.videoUrl || data.result?.url || data.output?.url;
    const jobStatus = data.status?.toLowerCase();
    const jobError = data.error || data.message;

    if ((jobStatus === "completed" || jobStatus === "complete") && videoUrl) {
      // Job completed - recover the video
      console.log("Job completed! Downloading video from:", videoUrl);
      const videoResponse = await fetch(videoUrl);
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
        syncLabsStatus: jobStatus,
        finalVideoUrl: upload.url,
      });
    }

    if (jobStatus === "failed" || jobStatus === "error") {
      // Job failed - update scene status
      await prisma.scene.update({
        where: { id },
        data: {
          status: "FAILED",
          failureReason: jobError || "Lip-sync job failed",
        },
      });

      await prisma.generationLog.create({
        data: {
          sceneId: id,
          projectId: scene.projectId,
          step: "LIPSYNC_APPLICATION",
          level: "ERROR",
          message: `Lip-sync failed: ${jobError}`,
          provider: "SyncLabs",
        },
      });

      return NextResponse.json({
        success: false,
        syncLabsStatus: jobStatus,
        error: jobError,
      });
    }

    // Job completed but no video URL found - return debug info
    if (jobStatus === "completed" || jobStatus === "complete") {
      return NextResponse.json({
        success: false,
        syncLabsStatus: jobStatus,
        message: "Job completed but no video URL found",
        debug: {
          availableFields: Object.keys(data),
          rawData: data,
        },
      });
    }

    // Job still processing
    return NextResponse.json({
      success: true,
      recovered: false,
      syncLabsStatus: jobStatus,
      jobId: syncLabsJobId,
      message: `Lip-sync job is still ${jobStatus}. Try again in a few minutes.`,
    });
  } catch (error) {
    console.error("Error checking lip-sync:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
