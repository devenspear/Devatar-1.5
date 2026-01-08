/**
 * Sync Labs API Client
 * Lip-sync video generation
 */

const SYNCLABS_API_URL = "https://api.sync.so/v2";

export interface LipsyncRequest {
  videoUrl: string;
  audioUrl: string;
  model?: "lipsync-2" | "lipsync-2-pro";
  maxCredits?: number;
}

export interface LipsyncTask {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

/**
 * Submit a lip-sync job
 */
export async function submitLipsync(
  request: LipsyncRequest
): Promise<{ jobId: string }> {
  const {
    videoUrl,
    audioUrl,
    model = "lipsync-2",
    maxCredits,
  } = request;

  const response = await fetch(`${SYNCLABS_API_URL}/generate`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.SYNCLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { type: "video", url: videoUrl },
        { type: "audio", url: audioUrl },
      ],
      options: {
        output_format: "mp4",
        ...(maxCredits && { max_credits: maxCredits }),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sync Labs API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { jobId: data.id };
}

/**
 * Check the status of a lip-sync job
 */
export async function checkLipsyncStatus(jobId: string): Promise<LipsyncTask> {
  const response = await fetch(`${SYNCLABS_API_URL}/generate/${jobId}`, {
    headers: {
      "x-api-key": process.env.SYNCLABS_API_KEY!,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sync Labs API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  let status: LipsyncTask["status"] = "pending";
  switch (data.status) {
    case "PENDING":
    case "QUEUED":
      status = "pending";
      break;
    case "PROCESSING":
      status = "processing";
      break;
    case "COMPLETED":
      status = "completed";
      break;
    case "FAILED":
    case "ERROR":
      status = "failed";
      break;
  }

  return {
    jobId,
    status,
    videoUrl: data.output_url,
    error: data.error,
  };
}

/**
 * Poll for lip-sync completion with timeout
 */
export async function waitForLipsyncCompletion(
  jobId: string,
  maxAttempts: number = 40,
  intervalMs: number = 15000
): Promise<LipsyncTask> {
  for (let i = 0; i < maxAttempts; i++) {
    const task = await checkLipsyncStatus(jobId);

    if (task.status === "completed" || task.status === "failed") {
      return task;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Lip-sync generation timed out after ${maxAttempts} attempts`);
}

/**
 * Test the Sync Labs API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${SYNCLABS_API_URL}/generate/test`, {
      headers: {
        "x-api-key": process.env.SYNCLABS_API_KEY!,
      },
    });
    // Even a 404 means the API is reachable
    return response.status !== 401 && response.status !== 403;
  } catch {
    return false;
  }
}

/**
 * Get usage information
 */
export async function getCredits(): Promise<{ used: number; total: number }> {
  const response = await fetch(`${SYNCLABS_API_URL}/usage`, {
    headers: {
      "x-api-key": process.env.SYNCLABS_API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`Sync Labs API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    used: data.credits_used || 0,
    total: data.credits_total || 0,
  };
}
