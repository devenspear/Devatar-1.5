/**
 * Kling AI Video Generation Client
 * Uses PiAPI's unified task endpoint
 * Docs: https://piapi.ai/docs/kling-api
 */

const PIAPI_BASE_URL = "https://api.piapi.ai/api/v1/task";

export interface VideoGenerationRequest {
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  duration: 5 | 10;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  mode?: "std" | "pro";
}

export interface VideoTask {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  duration?: number;
  error?: string;
  progress?: number;
}

/**
 * Get authorization headers for PiAPI
 */
function getAuthHeaders(): HeadersInit {
  // Use the same PiAPI key for all services
  const apiKey = process.env.PIAPI_FLUX_KEY || process.env.KLING_ACCESS_KEY;
  return {
    "X-API-Key": apiKey!,
    "Content-Type": "application/json",
  };
}

/**
 * Submit a video generation job to Kling AI via PiAPI
 */
export async function submitVideoGeneration(
  request: VideoGenerationRequest
): Promise<{ taskId: string }> {
  const {
    imageUrl,
    prompt,
    negativePrompt = "blurry, distorted, low quality, static, frozen",
    duration,
    aspectRatio = "16:9",
    mode = "pro",
  } = request;

  const requestBody = {
    model: "kling",
    task_type: "video_generation",
    input: {
      image_url: imageUrl,
      prompt: prompt,
      negative_prompt: negativePrompt,
      cfg_scale: 0.5,
      duration: duration,
      aspect_ratio: aspectRatio,
      mode: mode,
    },
  };

  console.log("Kling request:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(PIAPI_BASE_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kling API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (data.code !== 200 && !data.data?.task_id) {
    throw new Error(`Kling API error: ${data.message || JSON.stringify(data)}`);
  }

  return { taskId: data.data.task_id };
}

/**
 * Check the status of a video generation task
 */
export async function checkVideoStatus(taskId: string): Promise<VideoTask> {
  const response = await fetch(`${PIAPI_BASE_URL}/${taskId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kling API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (data.code !== 200 && !data.data) {
    throw new Error(`Kling API error: ${data.message || JSON.stringify(data)}`);
  }

  const task = data.data;
  let status: VideoTask["status"] = "pending";

  switch (task.status) {
    case "pending":
    case "submitted":
    case "queued":
      status = "pending";
      break;
    case "processing":
    case "running":
      status = "processing";
      break;
    case "completed":
    case "succeed":
    case "success":
      status = "completed";
      break;
    case "failed":
    case "error":
      status = "failed";
      break;
  }

  // Try to find video URL from different possible response structures
  const videoUrl = task.output?.video_url ||
                   task.output?.videos?.[0]?.url ||
                   task.output?.video ||
                   task.result?.video_url;

  // Stringify error if it's an object
  const rawError = task.error || task.message || task.error_message;
  const error = typeof rawError === 'object' ? JSON.stringify(rawError) : rawError;

  return {
    taskId,
    status,
    videoUrl,
    duration: task.output?.duration,
    error,
    progress: task.progress,
  };
}

/**
 * Poll for video completion with timeout
 */
export async function waitForVideoCompletion(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 30000
): Promise<VideoTask> {
  for (let i = 0; i < maxAttempts; i++) {
    const task = await checkVideoStatus(taskId);

    if (task.status === "completed" || task.status === "failed") {
      return task;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Video generation timed out after ${maxAttempts} attempts`);
}

/**
 * Test the Kling API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    return !!(process.env.PIAPI_FLUX_KEY || process.env.KLING_ACCESS_KEY);
  } catch {
    return false;
  }
}
