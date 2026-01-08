import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateSpeech } from "@/lib/ai/elevenlabs";
import { generateImage } from "@/lib/ai/gemini";
import { submitVideoGeneration, checkVideoStatus } from "@/lib/ai/kling";
import { submitLipsync, checkLipsyncStatus } from "@/lib/ai/synclabs";
import { uploadToR2, generateSceneKey } from "@/lib/storage/r2";

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

        // Get scene
        const scene = await prisma.scene.findUnique({
          where: { id },
          include: { project: true },
        });

        if (!scene) {
          send({ error: "Scene not found" });
          controller.close();
          return;
        }

        const projectId = scene.projectId;

        // STEP 1: Generate Audio
        send({ step: 1, status: "generating_audio", message: "Generating speech audio..." });

        await prisma.scene.update({
          where: { id },
          data: { status: "GENERATING_AUDIO" },
        });

        // Default voice ID: "Rachel" - ElevenLabs default voice
        const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

        const audioResult = await generateSpeech(
          scene.dialogue || "Hello, this is a test.",
          scene.voiceId || DEFAULT_VOICE_ID
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
          },
        });

        send({ step: 1, status: "completed", audioUrl: audioUpload.url });

        // STEP 2: Generate Image
        send({ step: 2, status: "generating_image", message: "Generating avatar image..." });

        await prisma.scene.update({
          where: { id },
          data: { status: "GENERATING_IMAGE" },
        });

        const imagePrompt = `Professional headshot portrait of a person in ${scene.environment || "modern office"}, wearing ${scene.wardrobe || "business attire"}, ${scene.moodLighting || "cinematic"} lighting, high quality, photorealistic`;

        const imageResult = await generateImage(imagePrompt);

        const imageKey = generateSceneKey(projectId, id, "image");
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(imageResult.imageBase64, "base64");
        const imageUpload = await uploadToR2(imageBuffer, imageKey, imageResult.mimeType);

        await prisma.scene.update({
          where: { id },
          data: {
            imageUrl: imageUpload.url,
            imagePrompt,
          },
        });

        send({ step: 2, status: "completed", imageUrl: imageUpload.url });

        // STEP 3: Generate Video (Kling AI)
        send({ step: 3, status: "generating_video", message: "Generating video from image (this takes 5-15 min)..." });

        await prisma.scene.update({
          where: { id },
          data: { status: "GENERATING_VIDEO" },
        });

        const videoPrompt = `${scene.movement || "subtle head movements"}, ${scene.camera || "medium close-up shot"}, professional video`;

        const videoSubmission = await submitVideoGeneration({
          imageUrl: imageUpload.url,
          prompt: videoPrompt,
          duration: 5,
        });

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
          },
        });

        send({ step: 3, status: "completed", videoUrl: videoUpload.url });

        // STEP 4: Apply Lip-sync
        send({ step: 4, status: "applying_lipsync", message: "Applying lip-sync (this takes 2-5 min)..." });

        await prisma.scene.update({
          where: { id },
          data: { status: "APPLYING_LIPSYNC" },
        });

        const lipsyncSubmission = await submitLipsync({
          videoUrl: videoUpload.url,
          audioUrl: audioUpload.url,
        });

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
          throw new Error("Lip-sync timed out");
        }

        const finalKey = generateSceneKey(projectId, id, "final");
        const finalBuffer = await fetch(lipsyncVideoUrl).then((r) => r.arrayBuffer());
        const finalUpload = await uploadToR2(Buffer.from(finalBuffer), finalKey, "video/mp4");

        // STEP 5: Finalize
        await prisma.scene.update({
          where: { id },
          data: {
            lipsyncVideoUrl: finalUpload.url,
            finalVideoUrl: finalUpload.url,
            status: "COMPLETED",
          },
        });

        send({ step: 5, status: "completed", finalVideoUrl: finalUpload.url, message: "Scene generation complete!" });
        controller.close();

      } catch (error) {
        const { id } = await params;

        await prisma.scene.update({
          where: { id },
          data: {
            status: "FAILED",
            failureReason: error instanceof Error ? error.message : "Unknown error",
          },
        });

        send({ error: error instanceof Error ? error.message : "Unknown error" });
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
