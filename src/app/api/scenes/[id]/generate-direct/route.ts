import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateSpeech } from "@/lib/ai/elevenlabs";
import { generateFluxImage } from "@/lib/ai/piapi-flux";
import { submitVideoGeneration, checkVideoStatus } from "@/lib/ai/kling";
import { submitLipsync, checkLipsyncStatus } from "@/lib/ai/synclabs";
import { uploadToR2, generateSceneKey, getSignedDownloadUrl } from "@/lib/storage/r2";
import { DEVEN_VOICE_ID, DEVEN_VOICE_SETTINGS } from "@/lib/avatar-identity";

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

        await prisma.scene.update({
          where: { id },
          data: { status: "GENERATING_AUDIO" },
        });

        // Use Deven's professional voice clone
        const voiceId = scene.voiceId || DEVEN_VOICE_ID;

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

        send({ step: 1, status: "completed", audioUrl: audioUpload.url });

        // STEP 2: Use Deven's Headshot or Generate Image
        let imageKey: string;
        let imageUrl: string;

        if (scene.headshot && scene.headshot.r2Key) {
          // USE DEVEN'S UPLOADED HEADSHOT - Skip AI generation!
          send({ step: 2, status: "using_headshot", message: "Using Deven's uploaded headshot..." });

          await prisma.scene.update({
            where: { id },
            data: { status: "GENERATING_IMAGE" },
          });

          imageKey = scene.headshot.r2Key;
          imageUrl = scene.headshot.r2Url || "";

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

          await prisma.scene.update({
            where: { id },
            data: { status: "GENERATING_IMAGE" },
          });

          const imagePrompt = `Professional cinematic portrait of a confident business person in ${scene.environment || "modern office"}, wearing ${scene.wardrobe || "business attire"}, ${scene.moodLighting || "cinematic"} lighting, high quality, photorealistic, ultra detailed, 8k`;

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

          send({ step: 2, status: "completed", imageUrl: imageUrl });
        }

        // STEP 3: Generate Video (Kling AI)
        send({ step: 3, status: "generating_video", message: "Generating video from image (this takes 5-15 min)..." });

        await prisma.scene.update({
          where: { id },
          data: { status: "GENERATING_VIDEO" },
        });

        const videoPrompt = `${scene.movement || "subtle head movements"}, ${scene.camera || "medium close-up shot"}, professional video`;

        // Get a signed URL for the image so Kling can access it (expires in 1 hour)
        const signedImageUrl = await getSignedDownloadUrl(imageKey, 3600);

        const videoSubmission = await submitVideoGeneration({
          imageUrl: signedImageUrl,
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
            videoModel: "kling",
            videoMode: "pro",
          },
        });

        send({ step: 3, status: "completed", videoUrl: videoUpload.url });

        // STEP 4: Apply Lip-sync
        send({ step: 4, status: "applying_lipsync", message: "Applying lip-sync (this takes 2-5 min)..." });

        await prisma.scene.update({
          where: { id },
          data: { status: "APPLYING_LIPSYNC" },
        });

        // Get signed URLs for video and audio so Sync Labs can access them
        const signedVideoUrl = await getSignedDownloadUrl(videoKey, 3600);
        const signedAudioUrl = await getSignedDownloadUrl(audioKey, 3600);

        const lipsyncSubmission = await submitLipsync({
          videoUrl: signedVideoUrl,
          audioUrl: signedAudioUrl,
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
            lipsyncModel: "lipsync-2",
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
