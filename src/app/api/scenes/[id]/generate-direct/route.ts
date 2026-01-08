import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateSpeech } from "@/lib/ai/elevenlabs";
import { generateFluxImage } from "@/lib/ai/piapi-flux";
import { submitVideoGeneration, checkVideoStatus } from "@/lib/ai/kling";
import { submitLipsync, checkLipsyncStatus } from "@/lib/ai/synclabs";
import { uploadToR2, generateSceneKey, getSignedDownloadUrl } from "@/lib/storage/r2";
import { DEVEN_VOICE_ID, DEVEN_VOICE_SETTINGS } from "@/lib/avatar-identity";

// Helper function to create generation logs
async function createLog(
  sceneId: string,
  projectId: string,
  step: "AUDIO_GENERATION" | "IMAGE_GENERATION" | "VIDEO_GENERATION" | "LIPSYNC_APPLICATION" | "SOUND_FX_MIXING" | "VIDEO_ASSEMBLY",
  level: "DEBUG" | "INFO" | "WARN" | "ERROR",
  message: string,
  provider?: string,
  extra?: { durationMs?: number; errorCode?: string; errorDetails?: object; requestPayload?: object; responsePayload?: object }
) {
  try {
    await prisma.generationLog.create({
      data: {
        sceneId,
        projectId,
        step,
        level,
        message,
        provider,
        durationMs: extra?.durationMs,
        errorCode: extra?.errorCode,
        errorDetails: extra?.errorDetails,
        requestPayload: extra?.requestPayload,
        responsePayload: extra?.responsePayload,
      },
    });
  } catch (e) {
    console.error("Failed to create log:", e);
  }
}

// POST /api/scenes/[id]/generate-direct - Direct generation (bypasses Inngest for testing)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { id } = await params;

        // Get scene with headshot
        const scene = await prisma.scene.findUnique({
          where: { id },
          include: {
            project: true,
            headshot: true,
          },
        });

        if (!scene) {
          send({ error: "Scene not found" });
          controller.close();
          return;
        }

        const projectId = scene.projectId;

        // STEP 1: Generate Audio using Deven's voice
        send({ step: 1, status: "generating_audio", message: "Generating speech with Deven's voice..." });
        const audioStartTime = Date.now();

        await prisma.scene.update({
          where: { id },
          data: { status: "GENERATING_AUDIO" },
        });

        // Use Deven's professional voice clone
        const voiceId = scene.voiceId || DEVEN_VOICE_ID;

        await createLog(id, projectId, "AUDIO_GENERATION", "INFO", `Starting audio generation with voice ${voiceId}`, "ElevenLabs");

        const audioResult = await generateSpeech(
          scene.dialogue || "Hello, this is a test.",
          voiceId,
          DEVEN_VOICE_SETTINGS
        );

        const audioKey = generateSceneKey(projectId, id, "audio");
        const audioUpload = await uploadToR2(audioResult.audioBuffer, audioKey, "audio/mpeg");

        // Estimate duration: ~150 words per minute, average 5 chars per word
        const estimatedDuration = (audioResult.characterCount / 5) / 150 * 60;

        await prisma.scene.update({
          where: { id },
          data: {
            audioUrl: audioUpload.url,
            audioDuration: estimatedDuration,
            audioModel: "eleven_multilingual_v2",
          },
        });

        await createLog(id, projectId, "AUDIO_GENERATION", "INFO", `Audio generated: ${audioResult.characterCount} chars`, "ElevenLabs", { durationMs: Date.now() - audioStartTime });
        send({ step: 1, status: "completed", audioUrl: audioUpload.url });

        // STEP 2: Use Deven's Headshot or Generate Image
        let imageKey: string;
        let imageUrl: string;

        // Check for headshot: scene-specific OR default headshot from settings
        let headshotToUse = scene.headshot;

        if (!headshotToUse) {
          // Try to get default headshot from settings
          const defaultSetting = await prisma.systemSetting.findUnique({
            where: { key: "default_headshot_id" },
          });

          if (defaultSetting?.value) {
            headshotToUse = await prisma.asset.findUnique({
              where: { id: defaultSetting.value },
            });
            if (headshotToUse) {
              await createLog(id, projectId, "IMAGE_GENERATION", "INFO", `Using default headshot: ${headshotToUse.name}`, "System");
            }
          }
        }

        if (headshotToUse && headshotToUse.r2Key) {
          // USE DEVEN'S UPLOADED HEADSHOT - Skip AI generation!
          send({ step: 2, status: "using_headshot", message: "Using Deven's uploaded headshot..." });

          await prisma.scene.update({
            where: { id },
            data: { status: "GENERATING_IMAGE" },
          });

          imageKey = headshotToUse.r2Key;
          imageUrl = headshotToUse.r2Url || "";

          await createLog(id, projectId, "IMAGE_GENERATION", "INFO", `Using uploaded headshot: ${headshotToUse.name}`, "Uploaded");

          await prisma.scene.update({
            where: { id },
            data: {
              imageUrl: imageUrl,
              imagePrompt: "Deven's uploaded headshot",
              imageModel: "uploaded",
            },
          });

          send({ step: 2, status: "completed", imageUrl: imageUrl, message: "Using Deven's headshot" });
        } else {
          // Fallback: Generate AI image (should rarely be used)
          send({ step: 2, status: "generating_image", message: "Generating avatar image (no headshot selected)..." });
          const imageStartTime = Date.now();

          await prisma.scene.update({
            where: { id },
            data: { status: "GENERATING_IMAGE" },
          });

          const imagePrompt = `Professional cinematic portrait of a confident business person in ${scene.environment || "modern office"}, wearing ${scene.wardrobe || "business attire"}, ${scene.moodLighting || "cinematic"} lighting, high quality, photorealistic, ultra detailed, 8k`;

          await createLog(id, projectId, "IMAGE_GENERATION", "INFO", `Starting Flux image generation`, "PiAPI-Flux");

          const imageResult = await generateFluxImage(imagePrompt, { aspectRatio: "16:9" });

          // Download image from URL and upload to R2
          const imageResponse = await fetch(imageResult.imageUrl);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          imageKey = generateSceneKey(projectId, id, "image");
          const imageUpload = await uploadToR2(imageBuffer, imageKey, "image/png");
          imageUrl = imageUpload.url;

          await prisma.scene.update({
            where: { id },
            data: {
              imageUrl: imageUrl,
              imagePrompt,
              imageModel: "Qubico/flux1-schnell",
            },
          });

          await createLog(id, projectId, "IMAGE_GENERATION", "INFO", `Image generated via Flux`, "PiAPI-Flux", { durationMs: Date.now() - imageStartTime });
          send({ step: 2, status: "completed", imageUrl: imageUrl });
        }

        // STEP 3: Generate Video (Kling AI)
        send({ step: 3, status: "generating_video", message: "Generating video from image (this takes 5-15 min)..." });
        const videoStartTime = Date.now();

        await prisma.scene.update({
          where: { id },
          data: { status: "GENERATING_VIDEO" },
        });

        const videoPrompt = `${scene.movement || "subtle head movements"}, ${scene.camera || "medium close-up shot"}, professional video`;

        await createLog(id, projectId, "VIDEO_GENERATION", "INFO", `Starting Kling video generation`, "Kling");

        // Get a signed URL for the image so Kling can access it (expires in 1 hour)
        const signedImageUrl = await getSignedDownloadUrl(imageKey, 3600);

        const videoSubmission = await submitVideoGeneration({
          imageUrl: signedImageUrl,
          prompt: videoPrompt,
          duration: 5,
        });

        await createLog(id, projectId, "VIDEO_GENERATION", "INFO", `Video task submitted: ${videoSubmission.taskId}`, "Kling");
        send({ step: 3, status: "submitted", taskId: videoSubmission.taskId, message: "Video generation submitted, polling for completion..." });

        // Poll for video completion (max 20 minutes)
        let videoUrl: string | null = null;
        for (let i = 0; i < 40; i++) {
          await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

          const videoStatus = await checkVideoStatus(videoSubmission.taskId);
          send({ step: 3, status: "polling", attempt: i + 1, taskStatus: videoStatus.status });

          if (videoStatus.status === "completed" && videoStatus.videoUrl) {
            videoUrl = videoStatus.videoUrl;
            break;
          } else if (videoStatus.status === "failed") {
            throw new Error(`Video generation failed: ${videoStatus.error}`);
          }
        }

        if (!videoUrl) {
          await createLog(id, projectId, "VIDEO_GENERATION", "ERROR", `Video generation timed out after 20 minutes`, "Kling");
          throw new Error("Video generation timed out");
        }

        const videoKey = generateSceneKey(projectId, id, "video");
        const videoBuffer = await fetch(videoUrl).then((r) => r.arrayBuffer());
        const videoUpload = await uploadToR2(Buffer.from(videoBuffer), videoKey, "video/mp4");

        await prisma.scene.update({
          where: { id },
          data: {
            rawVideoUrl: videoUpload.url,
            videoPrompt,
            videoModel: "kling",
            videoMode: "pro",
          },
        });

        await createLog(id, projectId, "VIDEO_GENERATION", "INFO", `Video completed successfully`, "Kling", { durationMs: Date.now() - videoStartTime });
        send({ step: 3, status: "completed", videoUrl: videoUpload.url });

        // STEP 4: Apply Lip-sync
        send({ step: 4, status: "applying_lipsync", message: "Applying lip-sync (this takes 2-5 min)..." });
        const lipsyncStartTime = Date.now();

        await prisma.scene.update({
          where: { id },
          data: { status: "APPLYING_LIPSYNC" },
        });

        await createLog(id, projectId, "LIPSYNC_APPLICATION", "INFO", `Starting Sync Labs lip-sync`, "SyncLabs");

        // Get signed URLs for video and audio so Sync Labs can access them
        const signedVideoUrl = await getSignedDownloadUrl(videoKey, 3600);
        const signedAudioUrl = await getSignedDownloadUrl(audioKey, 3600);

        const lipsyncSubmission = await submitLipsync({
          videoUrl: signedVideoUrl,
          audioUrl: signedAudioUrl,
        });

        await createLog(id, projectId, "LIPSYNC_APPLICATION", "INFO", `Lip-sync job submitted: ${lipsyncSubmission.jobId}`, "SyncLabs");
        send({ step: 4, status: "submitted", jobId: lipsyncSubmission.jobId, message: "Lip-sync submitted, polling for completion..." });

        // Poll for lip-sync completion (max 10 minutes)
        let lipsyncVideoUrl: string | null = null;
        for (let i = 0; i < 40; i++) {
          await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15 seconds

          const lipsyncStatus = await checkLipsyncStatus(lipsyncSubmission.jobId);
          send({ step: 4, status: "polling", attempt: i + 1, jobStatus: lipsyncStatus.status });

          if (lipsyncStatus.status === "completed" && lipsyncStatus.videoUrl) {
            lipsyncVideoUrl = lipsyncStatus.videoUrl;
            break;
          } else if (lipsyncStatus.status === "failed") {
            throw new Error(`Lip-sync failed: ${lipsyncStatus.error}`);
          }
        }

        if (!lipsyncVideoUrl) {
          await createLog(id, projectId, "LIPSYNC_APPLICATION", "ERROR", `Lip-sync timed out after 10 minutes`, "SyncLabs");
          throw new Error("Lip-sync timed out");
        }

        await createLog(id, projectId, "LIPSYNC_APPLICATION", "INFO", `Lip-sync completed`, "SyncLabs", { durationMs: Date.now() - lipsyncStartTime });

        const finalKey = generateSceneKey(projectId, id, "final");
        const finalBuffer = await fetch(lipsyncVideoUrl).then((r) => r.arrayBuffer());
        const finalUpload = await uploadToR2(Buffer.from(finalBuffer), finalKey, "video/mp4");

        // STEP 5: Finalize
        await prisma.scene.update({
          where: { id },
          data: {
            lipsyncVideoUrl: finalUpload.url,
            lipsyncModel: "lipsync-2",
            finalVideoUrl: finalUpload.url,
            status: "COMPLETED",
          },
        });

        await createLog(id, projectId, "VIDEO_ASSEMBLY", "INFO", `Scene generation completed successfully`, "Devatar");
        send({ step: 5, status: "completed", finalVideoUrl: finalUpload.url, message: "Scene generation complete!" });
        controller.close();

      } catch (error) {
        const { id } = await params;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Log the error
        try {
          const scene = await prisma.scene.findUnique({ where: { id }, select: { projectId: true } });
          if (scene) {
            await createLog(id, scene.projectId, "VIDEO_ASSEMBLY", "ERROR", errorMessage, undefined, { errorCode: "GENERATION_FAILED" });
          }
        } catch (e) {
          console.error("Failed to log error:", e);
        }

        await prisma.scene.update({
          where: { id },
          data: {
            status: "FAILED",
            failureReason: errorMessage,
          },
        });

        send({ error: errorMessage });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
