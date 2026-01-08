/**
 * PiAPI Flux Image Generation Client
 * Alternative to Gemini for image generation
 */

const PIAPI_BASE_URL = "https://api.piapi.ai/api/flux";

export interface FluxImageOptions {
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  negativePrompt?: string;
}

export interface FluxImageResult {
  imageUrl: string;
  taskId: string;
}

/**
 * Generate an image using PiAPI Flux
 */
export async function generateFluxImage(
  prompt: string,
  options: FluxImageOptions = {}
): Promise<FluxImageResult> {
  const { aspectRatio = "16:9", negativePrompt } = options;

  // Map aspect ratio to width/height
  const dimensions: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:3": { width: 1152, height: 896 },
    "3:4": { width: 896, height: 1152 },
  };

  const { width, height } = dimensions[aspectRatio] || dimensions["16:9"];

  let fullPrompt = prompt;
  if (negativePrompt) {
    fullPrompt += ` --no ${negativePrompt}`;
  }

  // Submit generation task
  const response = await fetch(`${PIAPI_BASE_URL}/v1/schnell`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.PIAPI_FLUX_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      width,
      height,
      num_inference_steps: 4,
      guidance_scale: 3.5,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PiAPI Flux error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Check if it's a sync response or needs polling
  if (data.data?.images?.[0]?.url) {
    return {
      imageUrl: data.data.images[0].url,
      taskId: data.data.task_id || "sync",
    };
  }

  // If async, poll for result
  const taskId = data.data?.task_id || data.task_id;
  if (!taskId) {
    throw new Error("No task ID in response: " + JSON.stringify(data));
  }

  // Poll for completion
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await fetch(
      `${PIAPI_BASE_URL}/v1/task/${taskId}`,
      {
        headers: {
          "x-api-key": process.env.PIAPI_FLUX_KEY!,
        },
      }
    );

    if (!statusResponse.ok) {
      continue;
    }

    const statusData = await statusResponse.json();

    if (statusData.data?.status === "completed" && statusData.data?.images?.[0]?.url) {
      return {
        imageUrl: statusData.data.images[0].url,
        taskId,
      };
    }

    if (statusData.data?.status === "failed") {
      throw new Error(`Image generation failed: ${statusData.data.error || "Unknown error"}`);
    }
  }

  throw new Error("Image generation timed out");
}

/**
 * Test the PiAPI Flux connection
 */
export async function testFluxConnection(): Promise<boolean> {
  try {
    // Just check if API key is valid by making a simple request
    const response = await fetch(`${PIAPI_BASE_URL}/v1/models`, {
      headers: {
        "x-api-key": process.env.PIAPI_FLUX_KEY!,
      },
    });
    return response.ok || response.status === 404; // 404 is ok, just means endpoint doesn't exist but key works
  } catch {
    return false;
  }
}
