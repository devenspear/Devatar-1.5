/**
 * PiAPI Flux Image Generation Client
 * Using PiAPI's unified task endpoint
 * Docs: https://piapi.ai/docs/flux-api/text-to-image
 */

const PIAPI_BASE_URL = "https://api.piapi.ai/api/v1/task";

export interface FluxImageOptions {
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  negativePrompt?: string;
}

export interface FluxImageResult {
  imageUrl: string;
  taskId: string;
}

/**
 * Generate an image using PiAPI Flux Schnell (fast model)
 */
export async function generateFluxImage(
  prompt: string,
  options: FluxImageOptions = {}
): Promise<FluxImageResult> {
  const { aspectRatio = "16:9" } = options;

  // Map aspect ratio to width/height
  const dimensions: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:3": { width: 1152, height: 896 },
    "3:4": { width: 896, height: 1152 },
  };

  const { width, height } = dimensions[aspectRatio] || dimensions["16:9"];

  // Submit generation task
  const response = await fetch(PIAPI_BASE_URL, {
    method: "POST",
    headers: {
      "X-API-Key": process.env.PIAPI_FLUX_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Qubico/flux1-schnell",
      task_type: "txt2img",
      input: {
        prompt: prompt,
        width: width,
        height: height,
        num_inference_steps: 4,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PiAPI Flux error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const taskId = data.data?.task_id;

  if (!taskId) {
    throw new Error("No task ID in response: " + JSON.stringify(data));
  }

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await fetch(
      `https://api.piapi.ai/api/v1/task/${taskId}`,
      {
        headers: {
          "X-API-Key": process.env.PIAPI_FLUX_KEY!,
        },
      }
    );

    if (!statusResponse.ok) {
      continue;
    }

    const statusData = await statusResponse.json();
    const status = statusData.data?.status;

    if (status === "completed") {
      const imageUrl = statusData.data?.output?.image_url ||
                       statusData.data?.output?.images?.[0]?.url ||
                       statusData.data?.output?.images?.[0];

      if (imageUrl) {
        return {
          imageUrl,
          taskId,
        };
      }
      throw new Error("No image URL in completed response: " + JSON.stringify(statusData));
    }

    if (status === "failed") {
      throw new Error(`Image generation failed: ${statusData.data?.error || JSON.stringify(statusData)}`);
    }
  }

  throw new Error("Image generation timed out after 2 minutes");
}

/**
 * Test the PiAPI Flux connection
 */
export async function testFluxConnection(): Promise<boolean> {
  try {
    return !!process.env.PIAPI_FLUX_KEY;
  } catch {
    return false;
  }
}
