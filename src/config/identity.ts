/**
 * Identity Configuration for Digital Twin System
 *
 * This module manages identity profiles for consistent avatar generation.
 * Each identity profile contains:
 * - LoRA model configuration (for facial consistency)
 * - Voice settings (for audio generation)
 * - Trigger words (for prompt injection)
 *
 * The identity system supports:
 * - Multiple identities per account (future)
 * - Per-scene identity override
 * - Automatic trigger word injection
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface VoiceSettings {
  stability: number;        // 0.0-1.0, higher = more consistent
  similarityBoost: number;  // 0.0-1.0, higher = more like original
  style: number;           // 0.0-1.0, style exaggeration
  useSpeakerBoost: boolean; // Enhance speaker clarity
}

export interface IdentityProfile {
  id: string;
  name: string;
  displayName: string;
  description?: string;

  // LoRA Configuration
  triggerWord: string;       // e.g., "TOK_DEVEN" - activates the identity
  loraUrl: string | null;    // R2 URL to .safetensors file (null if not trained yet)
  loraScale: number;         // 0.0-1.0, strength of identity (recommend 0.85-1.0)
  baseModel: "flux-dev" | "flux-schnell";

  // Voice Configuration
  voiceId: string | null;    // ElevenLabs voice ID
  voiceSettings: VoiceSettings;
  voiceModel: "eleven_multilingual_v2" | "eleven_turbo_v2_5";

  // Metadata
  isDefault: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IdentityGenerationContext {
  identity: IdentityProfile;
  scene: {
    environment?: string;
    wardrobe?: string;
    movement?: string;
    camera?: string;
    moodLighting?: string;
  };
  overrides?: {
    loraScale?: number;
    voiceModel?: string;
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default voice settings optimized for professional narration
 */
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarityBoost: 0.8,
  style: 0.2,
  useSpeakerBoost: true,
};

/**
 * Deven's primary identity profile
 *
 * Note: loraUrl will be null until the LoRA is trained and uploaded.
 * The system gracefully falls back to headshot-based generation when
 * loraUrl is not available.
 */
export const DEVEN_IDENTITY: IdentityProfile = {
  id: "deven-primary",
  name: "deven",
  displayName: "Deven Spear",
  description: "Primary digital twin identity for Deven Spear",

  // LoRA Configuration
  triggerWord: "TOK_DEVEN",
  loraUrl: process.env.DEVEN_LORA_URL?.trim() || null, // Trim to remove any newline chars
  loraScale: 0.95,
  baseModel: "flux-dev",

  // Voice Configuration (using existing DevenPro2026 voice clone)
  voiceId: process.env.ELEVENLABS_VOICE_ID || "h6Kw30FABVwQChfBVQXC",
  voiceSettings: DEFAULT_VOICE_SETTINGS,
  voiceModel: "eleven_turbo_v2_5", // Faster, recommended for production

  // Metadata
  isDefault: true,
  isActive: true,
};

// ============================================================================
// Identity Management Functions
// ============================================================================

/**
 * Get the default identity profile
 *
 * Returns the primary identity for generation. In the future,
 * this could be user-configurable or database-driven.
 */
export function getDefaultIdentity(): IdentityProfile {
  return DEVEN_IDENTITY;
}

/**
 * Check if digital twin mode is available
 *
 * Digital twin mode requires:
 * 1. A trained LoRA model uploaded to R2
 * 2. Valid LoRA URL in configuration
 * 3. FAL_KEY environment variable set
 *
 * @returns true if digital twin generation is possible
 */
export function isDigitalTwinAvailable(): boolean {
  const identity = getDefaultIdentity();
  return !!(
    identity.loraUrl &&
    identity.loraUrl.length > 0 &&
    process.env.FAL_KEY
  );
}

/**
 * Check if a specific identity has LoRA configured
 */
export function hasLoraConfigured(identity: IdentityProfile): boolean {
  return !!(identity.loraUrl && identity.loraUrl.length > 0);
}

/**
 * Build an identity-enhanced prompt
 *
 * Automatically injects the trigger word and applies
 * forensic detail expansion for consistent results.
 *
 * @param userPrompt - The base user prompt
 * @param identity - The identity profile to use
 * @param context - Scene context for additional details
 */
export function buildIdentityPrompt(
  userPrompt: string,
  identity: IdentityProfile,
  context?: IdentityGenerationContext["scene"]
): string {
  const parts: string[] = [];

  // 1. Trigger word (most important - must be first)
  parts.push(identity.triggerWord);

  // 2. Core identity description
  parts.push("a mature professional man");

  // 3. Scene context
  if (context?.wardrobe) {
    parts.push(`wearing ${context.wardrobe}`);
  }

  if (context?.environment) {
    parts.push(`in ${context.environment}`);
  }

  // 4. User's custom prompt
  parts.push(userPrompt);

  // 5. Quality enhancers
  parts.push("high quality");
  parts.push("detailed");
  parts.push("8k resolution");
  parts.push("professional photography");

  // 6. Lighting context
  if (context?.moodLighting) {
    parts.push(`${context.moodLighting} lighting`);
  } else {
    parts.push("cinematic lighting");
  }

  return parts.join(", ");
}

/**
 * Build a video generation prompt optimized for lip-sync
 *
 * Creates prompts that minimize face movement and artifacts
 * to improve lip-sync quality downstream.
 */
export function buildVideoPrompt(
  userPrompt: string,
  context?: IdentityGenerationContext["scene"]
): string {
  const parts: string[] = [];

  // Core video instructions for stable lip-sync
  parts.push("static camera");
  parts.push("subtle breathing movement");
  parts.push("minimal head movement");
  parts.push("natural blinking");
  parts.push("professional presenter stance");

  // Scene context
  if (context?.movement) {
    parts.push(context.movement);
  }

  if (context?.camera) {
    parts.push(context.camera);
  }

  // User additions
  if (userPrompt) {
    parts.push(userPrompt);
  }

  // Quality markers
  parts.push("high fidelity");
  parts.push("smooth motion");

  return parts.join(", ");
}

/**
 * Get negative prompt for image generation
 *
 * Returns a list of terms to avoid in generation,
 * optimized for realistic human appearance.
 */
export function getNegativePrompt(): string {
  return [
    "blurry",
    "distorted",
    "deformed",
    "disfigured",
    "low quality",
    "bad anatomy",
    "extra limbs",
    "extra fingers",
    "mutated hands",
    "poorly drawn face",
    "mutation",
    "ugly",
    "watermark",
    "text",
    "signature",
    "cartoon",
    "anime",
    "illustration",
    "painting",
    "drawing",
  ].join(", ");
}

/**
 * Get the recommended LoRA scale based on scene type
 *
 * Different scenes may benefit from different LoRA strengths:
 * - Close-ups: Higher scale (0.95-1.0) for maximum identity
 * - Wide shots: Slightly lower (0.85-0.90) for flexibility
 */
export function getRecommendedLoraScale(
  sceneType: "closeup" | "medium" | "wide" | "default" = "default"
): number {
  switch (sceneType) {
    case "closeup":
      return 1.0;
    case "medium":
      return 0.95;
    case "wide":
      return 0.85;
    default:
      return 0.95;
  }
}

// ============================================================================
// Generation Mode Configuration
// ============================================================================

export type GenerationMode = "standard" | "digital-twin";

/**
 * Generation mode descriptions for UI
 */
export const GENERATION_MODES: Record<GenerationMode, {
  label: string;
  description: string;
  requirements: string[];
  recommended: boolean;
}> = {
  "standard": {
    label: "Standard Mode",
    description: "Uses uploaded headshot images for video generation. Fast and reliable.",
    requirements: ["Headshot image uploaded"],
    recommended: false,
  },
  "digital-twin": {
    label: "Digital Twin Mode",
    description: "Uses AI-trained identity model for perfect consistency. Generates unique images that maintain your exact appearance.",
    requirements: [
      "LoRA model trained and uploaded",
      "Fal.ai API key configured",
    ],
    recommended: true,
  },
};

/**
 * Get the current generation mode
 *
 * Checks system settings and availability to determine
 * which mode should be used.
 */
export function getEffectiveGenerationMode(
  requestedMode?: GenerationMode
): GenerationMode {
  // If digital twin explicitly requested, check if available
  if (requestedMode === "digital-twin") {
    if (isDigitalTwinAvailable()) {
      return "digital-twin";
    }
    console.warn("[Identity] Digital twin requested but not available, falling back to standard");
    return "standard";
  }

  // If no mode specified, use digital twin if available, otherwise standard
  if (!requestedMode) {
    return isDigitalTwinAvailable() ? "digital-twin" : "standard";
  }

  return requestedMode;
}

// ============================================================================
// Export
// ============================================================================

export {
  DEVEN_IDENTITY as DEFAULT_IDENTITY,
};
