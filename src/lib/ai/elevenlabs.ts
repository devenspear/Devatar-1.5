/**
 * ElevenLabs API Client
 * Text-to-speech and voice cloning
 */

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

export interface GenerateSpeechOptions {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface GenerateSpeechResult {
  audioBuffer: Buffer;
  contentType: string;
  characterCount: number;
}

/**
 * Generate speech from text using a voice
 */
export async function generateSpeech(
  text: string,
  voiceId: string,
  options: GenerateSpeechOptions = {}
): Promise<GenerateSpeechResult> {
  const {
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0,
    useSpeakerBoost = true,
  } = options;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  return {
    audioBuffer,
    contentType: "audio/mpeg",
    characterCount: text.length,
  };
}

/**
 * List all available voices
 */
export async function listVoices(): Promise<Voice[]> {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const data = await response.json();
  return data.voices;
}

/**
 * Get a specific voice by ID
 */
export async function getVoice(voiceId: string): Promise<Voice> {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Test the ElevenLabs API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get character usage quota
 */
export async function getUsage(): Promise<{
  characterCount: number;
  characterLimit: number;
}> {
  const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    characterCount: data.character_count,
    characterLimit: data.character_limit,
  };
}
