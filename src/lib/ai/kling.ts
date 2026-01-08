/**
 * Kling AI Video Generation Client
 * Uses PiAPI for access to Kling AI
 */

const PIAPI_BASE_URL = "https://api.piapi.ai/api/kling/v1";

export interface VideoGenerationRequest {
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  duration: 5 | 10;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  mode?: "standard" | "pro";
  cfgScale?: number;
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
  return {
    "X-API-Key": process.env.KLING_ACCESS_KEY!,
    "Content-Type": "application/json",
  };
}

/**
 * Submit a video generation job to Kling AI
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
    cfgScale = 0.5,
  } = request;

  const response = await fetch(`${PIAPI_BASE_URL}/image2video`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      model: "kling-v1-5",
      image: imageUrl,
      prompt,
      negative_prompt: negativePrompt,
      duration: duration.toString(),
      aspect_ratio: aspectRatio,
      mode,
      cfg_scale: cfgScale,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kling API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`Kling API error: ${data.message}`);
  }

  return { taskId: data.data.task_id };
}

/**
 * Check the status of a video generation task
 */
export async function checkVideoStatus(taskId: string): Promise<VideoTask> {
  const response = await fetch(`${PIAPI_BASE_URL}/task/${taskId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kling API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`Kling API error: ${data.message}`);
  }

  const task = data.data;
  let status: VideoTask["status"] = "pending";

  switch (task.task_status) {
    case "submitted":
    case "pending":
      status = "pending";
      break;
    case "processing":
      status = "processing";
      break;
    case "succeed":
      status = "completed";
      break;
    case "failed":
      status = "failed";
      break;
  }

  return {
    taskId,
    status,
    videoUrl: task.task_result?.videos?.[0]?.url,
    duration: task.task_result?.videos?.[0]?.duration,
    error: task.task_status_msg,
    progress: task.progress,
  };
}

/**
 * Poll for video completion with timeout
 * @param taskId - The task ID to poll
 * @param maxAttempts - Maximum number of polling attempts (default 60 = 30 minutes at 30s intervals)
 * @param intervalMs - Polling interval in milliseconds (default 30000 = 30 seconds)
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

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Video generation timed out after ${maxAttempts} attempts`);
}

/**
 * Test the Kling API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Try to get a task that doesn't exist - if we get a proper error response, the API is working
    const response = await fetch(`${PIAPI_BASE_URL}/task/test-connection`, {
      headers: getAuthHeaders(),
    });
    // Even a 404 means the API is reachable
    return response.status !== 401 && response.status !== 403;
  } catch {
    return false;
  }
}
