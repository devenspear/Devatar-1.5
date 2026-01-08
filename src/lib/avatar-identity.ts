/**
 * Avatar Identity Configuration
 *
 * Devatar = Deven's Avatar
 * This file contains the core identity configuration for Deven's digital twin.
 */

// ============================================================================
// DEVEN'S VOICE IDENTITY
// ============================================================================

/**
 * DevenPro2026 - Professional voice clone created in ElevenLabs
 * High quality studio recording
 */
export const DEVEN_VOICE_ID = "h6Kw30FABVwQChfBVQXC";

/**
 * Voice settings optimized for Deven's voice clone
 */
export const DEVEN_VOICE_SETTINGS = {
  stability: 0.5,          // Balance between stability and expressiveness
  similarityBoost: 0.8,    // High similarity to original voice
  style: 0.2,              // Subtle style enhancement
  useSpeakerBoost: true,   // Enhanced clarity
};

// ============================================================================
// AVATAR IDENTITY SYSTEM
// ============================================================================

export interface AvatarIdentity {
  voiceId: string;
  voiceName: string;
  voiceSettings: typeof DEVEN_VOICE_SETTINGS;
  defaultHeadshotId?: string;
  defaultHeadshotUrl?: string;
}

/**
 * Get Deven's avatar identity configuration
 * This is the primary identity used for all video generation
 */
export function getDevenIdentity(): AvatarIdentity {
  return {
    voiceId: DEVEN_VOICE_ID,
    voiceName: "DevenPro2026",
    voiceSettings: DEVEN_VOICE_SETTINGS,
  };
}

/**
 * Get the default voice ID for generation
 * Always returns Deven's voice unless explicitly overridden
 */
export function getDefaultVoiceId(): string {
  return DEVEN_VOICE_ID;
}

// ============================================================================
// ASSET TYPES FOR AVATAR TRAINING
// ============================================================================

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];

export const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/x-m4a",
];

/**
 * Maximum file sizes for uploads
 */
export const MAX_FILE_SIZES = {
  headshot: 50 * 1024 * 1024,      // 50MB for images
  trainingVideo: 10 * 1024 * 1024 * 1024, // 10GB for training videos
  voiceSample: 100 * 1024 * 1024,   // 100MB for voice samples
};
