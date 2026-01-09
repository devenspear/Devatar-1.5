/**
 * Scene Generation Pipeline (Inngest-based)
 * Orchestrates the 5-step video generation process
 *
 * This runs as a background job via Inngest to avoid Vercel function timeouts.
 * Steps:
 * 1. Audio Generation (ElevenLabs)
 * 2. Image/Headshot Selection (Flux fallback)
 * 3. Video Generation (Kling AI)
 * 4. Lip-sync Application (Sync Labs)
 * 5. Final Upload to R2
 */

import { inngest } from "../client";
import prisma from "@/lib/db";
import { generateSpeech } from "@/lib/ai/elevenlabs";
import { generateFluxImage } from "@/lib/ai/piapi-flux";
import { submitVideoGeneration, checkVideoStatus } from "@/lib/ai/kling";
import {
  submitLipsync,
  checkLipsyncStatus,
  validateAudioDuration,
  SYNCLABS_PLAN,
  SYNCLABS_MAX_DURATION,
} from "@/lib/ai/synclabs";
import {
  uploadToR2,
  generateSceneKey,
  getSignedDownloadUrl,
} from "@/lib/storage/r2";
import { DEVEN_VOICE_ID, DEVEN_VOICE_SETTINGS } from "@/lib/avatar-identity";

// Helper function to create generation logs
async function createLog(
  sceneId: string,
  projectId: string,
  step:
    | "AUDIO_GENERATION"
    | "IMAGE_GENERATION"
    | "VIDEO_GENERATION"
    | "LIPSYNC_APPLICATION"
    | "SOUND_FX_MIXING"
    | "VIDEO_ASSEMBLY",
  level: "DEBUG" | "INFO" | "WARN" | "ERROR",
  message: string,
  provider?: string,
  extra?: {
    durationMs?: number;
    errorCode?: string;
    errorDetails?: object;
    requestPayload?: object;
    responsePayload?: object;
  }
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

export const generateScene = inngest.createFunction(
  {
    id: "generate-scene",
    retries: 2,
    onFailure: async ({ event, error }) => {
      // Mark scene as failed on permanent failure
      // The event in onFailure contains the original event in event.data.event
      const originalEvent = event.data.event as { data: { sceneId: string } };
      const sceneId = originalEvent?.data?.sceneId;
      if (!sceneId) {
        console.error("No sceneId found in failure event");
        return;
      }
      try {
        await prisma.scene.update({
          where: { id: sceneId },
          data: {
            status: "FAILED",
            failureReason: error.message,
          },
        });
      } catch (e) {
        console.error("Failed to update scene status on failure:", e);
      }
    },
  },
  { event: "scene/generate" },
  async ({ event, step }) => {
    const { sceneId } = event.data as { sceneId: string };

    // =========================================================================
    // Get scene data with headshot
    // =========================================================================
    const scene = await step.run("get-scene", async () => {
      const s = await prisma.scene.findUnique({
        where: { id: sceneId },
        include: {
          project: true,
          headshot: true,
        },
      });
      if (!s) throw new Error(`Scene not found: ${sceneId}`);
      return s;
    });

    const projectId = scene.projectId;
    const dialogue = scene.dialogue || "Hello, this is a test.";

    // =========================================================================
    // Pre-validation: Check audio duration against Sync Labs limits
    // =========================================================================
    await step.run("validate-duration", async () => {
      const validation = validateAudioDuration(dialogue.length);
      if (!validation.valid) {
        await createLog(
          sceneId,
          projectId,
          "AUDIO_GENERATION",
          "ERROR",
          validation.message || "Audio duration validation failed",
          "SyncLabs"
        );
        throw new Error(validation.message);
      }

      await createLog(
        sceneId,
        projectId,
        "AUDIO_GENERATION",
        "INFO",
        `Dialogue validated: ${dialogue.length} chars, ~${Math.round(validation.estimatedSeconds)}s estimated (max ${SYNCLABS_MAX_DURATION}s on ${SYNCLABS_PLAN} plan)`,
        "System"
      );
    });

    // =========================================================================
    // Step 1: Generate Audio (ElevenLabs)
    // =========================================================================
    const audioResult = await step.run("generate-audio", async () => {
      const startTime = Date.now();

      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "GENERATING_AUDIO" },
      });

      await createLog(
        sceneId,
        projectId,
        "AUDIO_GENERATION",
        "INFO",
        "Starting audio generation with Deven's voice",
        "ElevenLabs"
      );

      // Use Deven's professional voice clone
      const voiceId = scene.voiceId || DEVEN_VOICE_ID;

      const result = await generateSpeech(
        dialogue,
        voiceId,
        DEVEN_VOICE_SETTINGS
      );

      // Upload to R2
      const key = generateSceneKey(projectId, sceneId, "audio");
      const { url } = await uploadToR2(
        result.audioBuffer,
        key,
        result.contentType
      );

      // Estimate duration: ~150 words per minute, ~5 chars per word
      const estimatedDuration = (result.characterCount / 5 / 150) * 60;

      // Update scene
      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          audioUrl: url,
          audioDuration: estimatedDuration,
          audioModel: "eleven_multilingual_v2",
        },
      });

      await createLog(
        sceneId,
        projectId,
        "AUDIO_GENERATION",
        "INFO",
        `Audio generated: ${result.characterCount} chars, ~${Math.round(estimatedDuration)}s`,
        "ElevenLabs",
        { durationMs: Date.now() - startTime }
      );

      return { audioUrl: url, audioKey: key };
    });

    // =========================================================================
    // Step 2: Use Headshot or Generate Image (Flux)
    // =========================================================================
    const imageResult = await step.run("get-or-generate-image", async () => {
      const startTime = Date.now();

      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "GENERATING_IMAGE" },
      });

      // Check for headshot: scene-specific OR default headshot from settings
      let headshotToUse: { r2Key: string; r2Url: string | null; name: string } | null = scene.headshot;

      if (!headshotToUse) {
        // Try to get default headshot from settings
        const defaultSetting = await prisma.systemSetting.findUnique({
          where: { key: "default_headshot_id" },
        });

        if (defaultSetting?.value) {
          const defaultHeadshot = await prisma.asset.findUnique({
            where: { id: defaultSetting.value },
          });
          if (defaultHeadshot) {
            headshotToUse = {
              r2Key: defaultHeadshot.r2Key,
              r2Url: defaultHeadshot.r2Url,
              name: defaultHeadshot.name,
            };
            await createLog(
              sceneId,
              projectId,
              "IMAGE_GENERATION",
              "INFO",
              `Using default headshot: ${headshotToUse.name}`,
              "System"
            );
          }
        }
      }

      if (headshotToUse && headshotToUse.r2Key) {
        // USE DEVEN'S UPLOADED HEADSHOT - Skip AI generation!
        await createLog(
          sceneId,
          projectId,
          "IMAGE_GENERATION",
          "INFO",
          `Using uploaded headshot: ${headshotToUse.name}`,
          "Uploaded"
        );

        await prisma.scene.update({
          where: { id: sceneId },
          data: {
            imageUrl: headshotToUse.r2Url || "",
            imagePrompt: "Deven's uploaded headshot",
            imageModel: "uploaded",
          },
        });

        return {
          imageUrl: headshotToUse.r2Url || "",
          imageKey: headshotToUse.r2Key,
        };
      }

      // Fallback: Generate AI image with Flux (should rarely be used)
      await createLog(
        sceneId,
        projectId,
        "IMAGE_GENERATION",
        "INFO",
        "Generating avatar image with Flux (no headshot selected)",
        "PiAPI-Flux"
      );

      const imagePrompt = `Professional cinematic portrait of a confident business person in ${scene.environment || "modern office"}, wearing ${scene.wardrobe || "business attire"}, ${scene.moodLighting || "cinematic"} lighting, high quality, photorealistic, ultra detailed, 8k`;

      const fluxResult = await generateFluxImage(imagePrompt, {
        aspectRatio: "16:9",
      });

      // Download image from URL and upload to R2
      const imageResponse = await fetch(fluxResult.imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const key = generateSceneKey(projectId, sceneId, "image");
      const { url } = await uploadToR2(imageBuffer, key, "image/png");

      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          imageUrl: url,
          imagePrompt,
          imageModel: "Qubico/flux1-schnell",
        },
      });

      await createLog(
        sceneId,
        projectId,
        "IMAGE_GENERATION",
        "INFO",
        "Image generated via Flux",
        "PiAPI-Flux",
        { durationMs: Date.now() - startTime }
      );

      return { imageUrl: url, imageKey: key };
    });

    // =========================================================================
    // Step 3: Generate Video (Kling AI)
    // =========================================================================
    const videoTaskId = await step.run("submit-video", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "GENERATING_VIDEO" },
      });

      await createLog(
        sceneId,
        projectId,
        "VIDEO_GENERATION",
        "INFO",
        "Submitting video generation job",
        "Kling"
      );

      const videoPrompt = `${scene.movement || "subtle head movements"}, ${scene.camera || "medium close-up shot"}, professional video`;

      // Get a signed URL for the image so Kling can access it (expires in 1 hour)
      const signedImageUrl = await getSignedDownloadUrl(
        imageResult.imageKey,
        3600
      );

      const { taskId } = await submitVideoGeneration({
        imageUrl: signedImageUrl,
        prompt: videoPrompt,
        duration: 5,
        aspectRatio: "16:9",
        mode: "pro",
      });

      await prisma.scene.update({
        where: { id: sceneId },
        data: { videoPrompt },
      });

      await createLog(
        sceneId,
        projectId,
        "VIDEO_GENERATION",
        "INFO",
        `Video task submitted: ${taskId}`,
        "Kling"
      );

      return taskId;
    });

    // Poll for video completion (up to 15 minutes with optimized intervals)
    // Kling typically completes in 3-5 minutes
    let videoUrl: string | undefined;
    let rawVideoKey: string | undefined;
    let videoPollCount = 0;
    const VIDEO_MAX_POLLS = 45; // 45 polls * 20s = 15 minutes max

    for (let i = 0; i < VIDEO_MAX_POLLS; i++) {
      videoPollCount = i;
      // Poll every 20 seconds for faster detection
      await step.sleep(`wait-video-${i}`, "20s");

      const status = await step.run(`check-video-${i}`, async () => {
        const result = await checkVideoStatus(videoTaskId);

        // Log progress every 3rd poll to reduce noise, or always on completion
        const shouldLog = i % 3 === 0 || result.status === "completed" || result.status === "failed";
        if (shouldLog) {
          await createLog(
            sceneId,
            projectId,
            "VIDEO_GENERATION",
            result.status === "completed" ? "INFO" : "DEBUG",
            `Video poll #${i + 1}: ${result.status} (${result.progress || 0}%)`,
            "Kling"
          );
        }

        return result;
      });

      if (status.status === "completed" && status.videoUrl) {
        videoUrl = status.videoUrl;
        await createLog(
          sceneId,
          projectId,
          "VIDEO_GENERATION",
          "INFO",
          `Video completed successfully after ${i + 1} polls (~${Math.round((i + 1) * 20 / 60)} min)`,
          "Kling"
        );
        break;
      }

      if (status.status === "failed") {
        await createLog(
          sceneId,
          projectId,
          "VIDEO_GENERATION",
          "ERROR",
          `Video generation failed: ${status.error}`,
          "Kling"
        );
        throw new Error(`Video generation failed: ${status.error}`);
      }
    }

    if (!videoUrl) {
      await createLog(
        sceneId,
        projectId,
        "VIDEO_GENERATION",
        "ERROR",
        `Video generation timed out after ${videoPollCount + 1} polls (~${Math.round((videoPollCount + 1) * 20 / 60)} min). Task ID: ${videoTaskId}`,
        "Kling"
      );
      throw new Error(`Video generation timed out. Task ID: ${videoTaskId}`);
    }

    // Upload video to R2
    const rawVideoUrl = await step.run("upload-raw-video", async () => {
      const response = await fetch(videoUrl!);
      const buffer = await response.arrayBuffer();
      const key = generateSceneKey(projectId, sceneId, "video");
      rawVideoKey = key;
      const { url } = await uploadToR2(Buffer.from(buffer), key, "video/mp4");

      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          rawVideoUrl: url,
          videoModel: "kling",
          videoMode: "pro",
        },
      });

      await createLog(
        sceneId,
        projectId,
        "VIDEO_GENERATION",
        "INFO",
        "Video generated and uploaded successfully",
        "Kling",
        { responsePayload: { url } }
      );

      return { url, key };
    });

    // =========================================================================
    // Step 4: Apply Lip-sync (Sync Labs)
    // =========================================================================
    const lipsyncJobId = await step.run("submit-lipsync", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "APPLYING_LIPSYNC" },
      });

      await createLog(
        sceneId,
        projectId,
        "LIPSYNC_APPLICATION",
        "INFO",
        "Submitting lip-sync job",
        "SyncLabs"
      );

      // Get signed URLs for video and audio so Sync Labs can access them
      const signedVideoUrl = await getSignedDownloadUrl(rawVideoUrl.key, 3600);
      const signedAudioUrl = await getSignedDownloadUrl(
        audioResult.audioKey,
        3600
      );

      const { jobId } = await submitLipsync({
        videoUrl: signedVideoUrl,
        audioUrl: signedAudioUrl,
      });

      await createLog(
        sceneId,
        projectId,
        "LIPSYNC_APPLICATION",
        "INFO",
        `Lip-sync job submitted: ${jobId}`,
        "SyncLabs"
      );

      return jobId;
    });

    // Poll for lip-sync completion with auto-recovery
    // Uses shorter intervals initially (10s) then longer (15s) for efficiency
    let lipsyncVideoUrl: string | undefined;
    let completedWithoutUrl = false;
    let pollCount = 0;
    const MAX_POLLS = 60; // 60 polls * 10-15s = ~10-15 minutes max

    for (let i = 0; i < MAX_POLLS; i++) {
      pollCount = i;
      // Shorter intervals for first 2 minutes, then standard 15s
      const sleepDuration = i < 12 ? "10s" : "15s";
      await step.sleep(`wait-lipsync-${i}`, sleepDuration);

      const status = await step.run(`check-lipsync-${i}`, async () => {
        const result = await checkLipsyncStatus(lipsyncJobId);

        // Log with more detail
        const hasUrl = result.videoUrl ? "URL found" : "no URL";
        await createLog(
          sceneId,
          projectId,
          "LIPSYNC_APPLICATION",
          result.status === "completed" ? "INFO" : "DEBUG",
          `Lip-sync poll #${i + 1}: ${result.status} (${hasUrl})`,
          "SyncLabs"
        );

        return result;
      });

      if (status.status === "completed" && status.videoUrl) {
        lipsyncVideoUrl = status.videoUrl;
        await createLog(
          sceneId,
          projectId,
          "LIPSYNC_APPLICATION",
          "INFO",
          `Lip-sync completed successfully after ${i + 1} polls`,
          "SyncLabs"
        );
        break;
      }

      // CRITICAL: If completed but no URL, try direct API recovery
      if (status.status === "completed" && !status.videoUrl) {
        completedWithoutUrl = true;
        await createLog(
          sceneId,
          projectId,
          "LIPSYNC_APPLICATION",
          "WARN",
          `Lip-sync reports completed but no URL - attempting direct API recovery`,
          "SyncLabs"
        );

        // Try direct API call to get the URL
        const recoveryResult = await step.run(`recover-lipsync-${i}`, async (): Promise<{ success: boolean; url?: string }> => {
          const SYNCLABS_API_URL = "https://api.sync.so/v2";
          const response = await fetch(`${SYNCLABS_API_URL}/generate/${lipsyncJobId}`, {
            headers: { "x-api-key": process.env.SYNCLABS_API_KEY! },
          });

          if (!response.ok) {
            return { success: false };
          }

          const data = await response.json();
          // Try ALL possible URL field names
          const url = data.output_url || data.outputUrl || data.video_url ||
                     data.videoUrl || data.result?.url || data.output?.url ||
                     data.result || (Array.isArray(data.output) && data.output[0]?.url);

          if (url && typeof url === 'string' && url.startsWith('http')) {
            await createLog(
              sceneId,
              projectId,
              "LIPSYNC_APPLICATION",
              "INFO",
              `Recovery successful - found URL in API response`,
              "SyncLabs"
            );
            return { success: true, url };
          }

          // Log the actual response for debugging
          await createLog(
            sceneId,
            projectId,
            "LIPSYNC_APPLICATION",
            "DEBUG",
            `API response fields: ${Object.keys(data).join(', ')}`,
            "SyncLabs",
            { responsePayload: data }
          );

          return { success: false };
        });

        if (recoveryResult.success && recoveryResult.url) {
          lipsyncVideoUrl = recoveryResult.url;
          break;
        }

        // If recovery failed, wait a bit longer and try again
        await step.sleep(`wait-recovery-${i}`, "5s");
      }

      if (status.status === "failed") {
        await createLog(
          sceneId,
          projectId,
          "LIPSYNC_APPLICATION",
          "ERROR",
          `Lip-sync failed: ${status.error}`,
          "SyncLabs"
        );
        throw new Error(`Lip-sync failed: ${status.error}`);
      }
    }

    // Final recovery attempt if we timed out
    if (!lipsyncVideoUrl) {
      const finalRecovery = await step.run("final-lipsync-recovery", async (): Promise<{ success: boolean; url?: string; status?: string }> => {
        await createLog(
          sceneId,
          projectId,
          "LIPSYNC_APPLICATION",
          "WARN",
          `Polling exhausted after ${pollCount + 1} attempts - attempting final recovery`,
          "SyncLabs"
        );

        const SYNCLABS_API_URL = "https://api.sync.so/v2";
        const response = await fetch(`${SYNCLABS_API_URL}/generate/${lipsyncJobId}`, {
          headers: { "x-api-key": process.env.SYNCLABS_API_KEY! },
        });

        if (!response.ok) {
          return { success: false };
        }

        const data = await response.json();
        const url = data.output_url || data.outputUrl || data.video_url ||
                   data.videoUrl || data.result?.url || data.output?.url ||
                   data.result || (Array.isArray(data.output) && data.output[0]?.url);

        if (url && typeof url === 'string' && url.startsWith('http')) {
          return { success: true, url };
        }

        return { success: false, status: data.status };
      });

      if (finalRecovery.success && finalRecovery.url) {
        lipsyncVideoUrl = finalRecovery.url;
        await createLog(
          sceneId,
          projectId,
          "LIPSYNC_APPLICATION",
          "INFO",
          "Final recovery successful",
          "SyncLabs"
        );
      } else {
        await createLog(
          sceneId,
          projectId,
          "LIPSYNC_APPLICATION",
          "ERROR",
          `Lip-sync failed after ${pollCount + 1} polls and recovery attempts. Job status: ${finalRecovery.status || 'unknown'}`,
          "SyncLabs"
        );
        throw new Error(`Lip-sync generation failed - job may still be processing. Job ID: ${lipsyncJobId}`);
      }
    }

    // =========================================================================
    // Step 5: Upload final video to R2
    // =========================================================================
    const finalVideoUrl = await step.run("upload-final-video", async () => {
      const response = await fetch(lipsyncVideoUrl!);
      const buffer = await response.arrayBuffer();
      const key = generateSceneKey(projectId, sceneId, "final");
      const { url } = await uploadToR2(Buffer.from(buffer), key, "video/mp4");

      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          lipsyncVideoUrl: url,
          lipsyncModel: "sync-2",
          finalVideoUrl: url,
          status: "COMPLETED",
        },
      });

      await createLog(
        sceneId,
        projectId,
        "VIDEO_ASSEMBLY",
        "INFO",
        "Scene generation completed successfully",
        "Devatar",
        { responsePayload: { finalUrl: url } }
      );

      return url;
    });

    return {
      success: true,
      sceneId,
      audioUrl: audioResult.audioUrl,
      imageUrl: imageResult.imageUrl,
      rawVideoUrl: rawVideoUrl.url,
      finalVideoUrl,
    };
  }
);
