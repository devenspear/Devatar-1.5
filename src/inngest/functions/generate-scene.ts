/**
 * Scene Generation Pipeline
 * Orchestrates the 5-step video generation process
 */

import { inngest } from "../client";
import prisma from "@/lib/db";
import { generateSpeech } from "@/lib/ai/elevenlabs";
import { generateCharacterImage } from "@/lib/ai/gemini";
import { submitVideoGeneration, checkVideoStatus } from "@/lib/ai/kling";
import { submitLipsync, checkLipsyncStatus } from "@/lib/ai/synclabs";
import { uploadToR2, generateSceneKey } from "@/lib/storage/r2";

export const generateScene = inngest.createFunction(
  {
    id: "generate-scene",
    retries: 2,
  },
  { event: "scene/generate" },
  async ({ event, step }) => {
    const { sceneId } = event.data as { sceneId: string };

    // Get scene data
    const scene = await step.run("get-scene", async () => {
      const s = await prisma.scene.findUnique({
        where: { id: sceneId },
        include: { project: true },
      });
      if (!s) throw new Error(`Scene not found: ${sceneId}`);
      return s;
    });

    const projectId = scene.projectId;

    // =========================================================================
    // Step 1: Generate Audio (ElevenLabs)
    // =========================================================================
    const audioResult = await step.run("generate-audio", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "GENERATING_AUDIO" },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "AUDIO_GENERATION",
          message: "Starting audio generation",
          provider: "elevenlabs",
        },
      });

      const voiceId =
        scene.voiceId ||
        scene.project.defaultVoiceId ||
        process.env.ELEVENLABS_VOICE_ID;

      if (!voiceId) {
        throw new Error("No voice ID configured");
      }

      const dialogue = scene.dialogue || "Hello, this is a test.";
      const result = await generateSpeech(dialogue, voiceId);

      // Upload to R2
      const key = generateSceneKey(projectId, sceneId, "audio");
      const { url } = await uploadToR2(result.audioBuffer, key, result.contentType);

      // Update scene
      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          audioUrl: url,
          audioDuration: Math.ceil(result.characterCount / 15), // Rough estimate
        },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "AUDIO_GENERATION",
          message: "Audio generated successfully",
          provider: "elevenlabs",
          responsePayload: { url, characters: result.characterCount },
        },
      });

      return { audioUrl: url };
    });

    // =========================================================================
    // Step 2: Generate Image (Gemini)
    // =========================================================================
    const imageResult = await step.run("generate-image", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "GENERATING_IMAGE" },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "IMAGE_GENERATION",
          message: "Starting image generation",
          provider: "gemini",
        },
      });

      const result = await generateCharacterImage({
        characterDescription:
          "Professional man, approximately 55 years old. Distinguished appearance with salt-and-pepper hair. Confident, intelligent expression. Deven Spear, a technology futurist and entrepreneur.",
        wardrobe: scene.wardrobe || "Dark navy suit, white dress shirt, no tie",
        environment:
          scene.environment || "Modern office with city skyline in background",
        pose: scene.movement || "Standing confidently, looking at camera",
        cameraAngle: scene.camera || "Medium shot",
        lighting: scene.moodLighting || "cinematic",
      });

      // Convert base64 to buffer and upload
      const imageBuffer = Buffer.from(result.imageBase64, "base64");
      const key = generateSceneKey(projectId, sceneId, "image");
      const { url } = await uploadToR2(imageBuffer, key, result.mimeType);

      // Update scene
      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          imageUrl: url,
          imagePrompt: result.revisedPrompt,
        },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "IMAGE_GENERATION",
          message: "Image generated successfully",
          provider: "gemini",
          responsePayload: { url },
        },
      });

      return { imageUrl: url };
    });

    // =========================================================================
    // Step 3: Generate Video (Kling AI)
    // =========================================================================
    const videoTaskId = await step.run("submit-video", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "GENERATING_VIDEO" },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "VIDEO_GENERATION",
          message: "Submitting video generation job",
          provider: "kling",
        },
      });

      const motionPrompt = `${scene.movement || "Standing confidently, subtle breathing movement"}. ${scene.camera || "Camera slowly pushes in"}. Professional, cinematic motion.`;

      const { taskId } = await submitVideoGeneration({
        imageUrl: imageResult.imageUrl,
        prompt: motionPrompt,
        duration: (scene.targetDuration || 10) > 7 ? 10 : 5,
        aspectRatio: "16:9",
        mode: "pro",
      });

      await prisma.scene.update({
        where: { id: sceneId },
        data: { videoPrompt: motionPrompt },
      });

      return taskId;
    });

    // Poll for video completion (up to 30 minutes)
    let videoUrl: string | undefined;
    for (let i = 0; i < 60; i++) {
      await step.sleep(`wait-video-${i}`, "30s");

      const status = await step.run(`check-video-${i}`, async () => {
        const result = await checkVideoStatus(videoTaskId);

        await prisma.generationLog.create({
          data: {
            sceneId,
            projectId,
            level: "DEBUG",
            step: "VIDEO_GENERATION",
            message: `Video status: ${result.status} (${result.progress || 0}%)`,
            provider: "kling",
          },
        });

        return result;
      });

      if (status.status === "completed" && status.videoUrl) {
        videoUrl = status.videoUrl;
        break;
      }

      if (status.status === "failed") {
        throw new Error(`Video generation failed: ${status.error}`);
      }
    }

    if (!videoUrl) {
      throw new Error("Video generation timed out");
    }

    // Upload video to R2
    const rawVideoUrl = await step.run("upload-raw-video", async () => {
      const response = await fetch(videoUrl!);
      const buffer = await response.arrayBuffer();
      const key = generateSceneKey(projectId, sceneId, "video");
      const { url } = await uploadToR2(Buffer.from(buffer), key, "video/mp4");

      await prisma.scene.update({
        where: { id: sceneId },
        data: { rawVideoUrl: url },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "VIDEO_GENERATION",
          message: "Video generated and uploaded successfully",
          provider: "kling",
          responsePayload: { url },
        },
      });

      return url;
    });

    // =========================================================================
    // Step 4: Apply Lip-sync (Sync Labs)
    // =========================================================================
    const lipsyncJobId = await step.run("submit-lipsync", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "APPLYING_LIPSYNC" },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "LIPSYNC_APPLICATION",
          message: "Submitting lip-sync job",
          provider: "synclabs",
        },
      });

      const { jobId } = await submitLipsync({
        videoUrl: rawVideoUrl,
        audioUrl: audioResult.audioUrl,
      });

      return jobId;
    });

    // Poll for lip-sync completion (up to 10 minutes)
    let lipsyncVideoUrl: string | undefined;
    for (let i = 0; i < 40; i++) {
      await step.sleep(`wait-lipsync-${i}`, "15s");

      const status = await step.run(`check-lipsync-${i}`, async () => {
        const result = await checkLipsyncStatus(lipsyncJobId);

        await prisma.generationLog.create({
          data: {
            sceneId,
            projectId,
            level: "DEBUG",
            step: "LIPSYNC_APPLICATION",
            message: `Lip-sync status: ${result.status}`,
            provider: "synclabs",
          },
        });

        return result;
      });

      if (status.status === "completed" && status.videoUrl) {
        lipsyncVideoUrl = status.videoUrl;
        break;
      }

      if (status.status === "failed") {
        throw new Error(`Lip-sync failed: ${status.error}`);
      }
    }

    if (!lipsyncVideoUrl) {
      throw new Error("Lip-sync generation timed out");
    }

    // Upload final video to R2
    const finalVideoUrl = await step.run("upload-final-video", async () => {
      const response = await fetch(lipsyncVideoUrl!);
      const buffer = await response.arrayBuffer();
      const key = generateSceneKey(projectId, sceneId, "final");
      const { url } = await uploadToR2(Buffer.from(buffer), key, "video/mp4");

      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          lipsyncVideoUrl: url,
          finalVideoUrl: url,
          status: "COMPLETED",
        },
      });

      await prisma.generationLog.create({
        data: {
          sceneId,
          projectId,
          level: "INFO",
          step: "LIPSYNC_APPLICATION",
          message: "Scene generation completed successfully",
          provider: "synclabs",
          responsePayload: { finalUrl: url },
        },
      });

      return url;
    });

    return {
      success: true,
      sceneId,
      audioUrl: audioResult.audioUrl,
      imageUrl: imageResult.imageUrl,
      rawVideoUrl,
      finalVideoUrl,
    };
  }
);
