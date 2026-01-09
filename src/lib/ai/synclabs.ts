/**
 * Sync Labs API Client
 * Lip-sync video generation
 *
 * Plan Limits (as of Jan 2026):
 * - Hobbyist ($5/mo): 1 minute max
 * - Creator ($19/mo): 5 minutes max
 * - Growth ($49/mo): 10 minutes max
 * - Scale ($249/mo): 30 minutes max
 */

const SYNCLABS_API_URL = "https://api.sync.so/v2";

/**
 * Duration limits by plan (in seconds)
 * Update SYNCLABS_PLAN to match your current subscription
 */
export type SyncLabsPlan = "hobbyist" | "creator" | "growth" | "scale";

export const SYNCLABS_PLAN: SyncLabsPlan = "creator"; // Current plan

export const SYNCLABS_DURATION_LIMITS: Record<SyncLabsPlan, number> = {
  hobbyist: 60,    // 1 minute
  creator: 300,    // 5 minutes
  growth: 600,     // 10 minutes
  scale: 1800,     // 30 minutes
};

export const SYNCLABS_MAX_DURATION = SYNCLABS_DURATION_LIMITS[SYNCLABS_PLAN];

/**
 * Estimate audio duration from character count
 * Based on ~150 words per minute, ~5 characters per word
 * Returns duration in seconds
 */
export function estimateAudioDuration(characterCount: number): number {
  // Characters / 5 = word count, / 150 = minutes, * 60 = seconds
  return (characterCount / 5) / 150 * 60;
}

/**
 * Validate that estimated audio duration is within plan limits
 * Returns validation result with friendly message
 */
export function validateAudioDuration(characterCount: number): {
  valid: boolean;
  estimatedSeconds: number;
  maxSeconds: number;
  message?: string;
} {
  const estimatedSeconds = estimateAudioDuration(characterCount);
  const maxSeconds = SYNCLABS_MAX_DURATION;

  if (estimatedSeconds > maxSeconds) {
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
    const maxMinutes = maxSeconds / 60;
    return {
      valid: false,
      estimatedSeconds,
      maxSeconds,
      message: `Audio too long: ~${estimatedMinutes} min estimated, max ${maxMinutes} min allowed on ${SYNCLABS_PLAN} plan. Shorten dialogue or upgrade Sync Labs plan.`,
    };
  }

  return {
    valid: true,
    estimatedSeconds,
    maxSeconds,
  };
}

/**
 * Parse Sync Labs API errors into user-friendly messages
 */
export function parseSyncLabsError(statusCode: number, errorBody: string): string {
  try {
    const parsed = JSON.parse(errorBody);
    const innerCode = parsed.statusCode;
    const message = parsed.message || "";

    // Handle specific error codes
    if (innerCode === 402 || message.toLowerCase().includes("audio exceeds duration")) {
      return `Audio exceeds your Sync Labs plan limit. Current plan: ${SYNCLABS_PLAN} (max ${SYNCLABS_MAX_DURATION / 60} min). Upgrade at sync.so/billing or shorten your dialogue.`;
    }

    if (innerCode === 401 || statusCode === 401) {
      return "Sync Labs authentication failed. Check your API key in settings.";
    }

    if (innerCode === 429 || statusCode === 429) {
      return "Sync Labs rate limit exceeded. Wait a moment and try again.";
    }

    // Return the original message if we can extract it
    if (message) {
      return `Sync Labs error: ${message}`;
    }
  } catch {
    // If parsing fails, return a generic message
  }

  return `Sync Labs API error (${statusCode}): ${errorBody.substring(0, 200)}`;
}

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
    const errorBody = await response.text();
    throw new Error(parseSyncLabsError(response.status, errorBody));
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
  const rawStatus = data.status?.toUpperCase();
  switch (rawStatus) {
    case "PENDING":
    case "QUEUED":
      status = "pending";
      break;
    case "PROCESSING":
      status = "processing";
      break;
    case "COMPLETED":
    case "COMPLETE":
      status = "completed";
      break;
    case "FAILED":
    case "ERROR":
      status = "failed";
      break;
  }

  // Try multiple possible output URL field names (Sync Labs API may vary)
  const videoUrl =
    data.output_url ||
    data.outputUrl ||
    data.video_url ||
    data.videoUrl ||
    data.result?.url ||
    data.output?.url ||
    data.result ||
    (Array.isArray(data.output) && data.output[0]?.url);

  return {
    jobId,
    status,
    videoUrl,
    error: data.error || data.message,
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
