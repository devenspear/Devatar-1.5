/**
 * Google Gemini API Client
 * Image generation for character/scene images
 */

export interface GenerateImageOptions {
  negativePrompt?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  numberOfImages?: number;
}

export interface GenerateImageResult {
  imageBase64: string;
  mimeType: string;
  revisedPrompt?: string;
}

/**
 * Generate an image using Google's Imagen 3 API
 */
export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> {
  const { negativePrompt, aspectRatio = "16:9" } = options;

  // Build the full prompt
  let fullPrompt = prompt;
  if (negativePrompt) {
    fullPrompt += ` Avoid: ${negativePrompt}`;
  }

  // Use Imagen 3 for image generation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: fullPrompt,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectRatio,
          personGeneration: "allow_adult",
          safetyFilterLevel: "block_only_high",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Imagen API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract image from response
  const predictions = data.predictions || [];
  if (!predictions[0]?.bytesBase64Encoded) {
    throw new Error("No image generated in response");
  }

  return {
    imageBase64: predictions[0].bytesBase64Encoded,
    mimeType: "image/png",
    revisedPrompt: undefined,
  };
}

/**
 * Generate a character image for avatar videos
 */
export async function generateCharacterImage(params: {
  characterDescription: string;
  wardrobe: string;
  environment: string;
  pose: string;
  cameraAngle?: string;
  lighting?: string;
}): Promise<GenerateImageResult> {
  const {
    characterDescription,
    wardrobe,
    environment,
    pose,
    cameraAngle = "medium shot",
    lighting = "cinematic",
  } = params;

  const prompt = `Generate a photorealistic cinematic image.

SUBJECT: ${characterDescription}

WARDROBE: ${wardrobe}

ENVIRONMENT: ${environment}

POSE AND FRAMING: ${pose}

CAMERA: ${cameraAngle}

LIGHTING: ${lighting}

STYLE: Ultra-realistic, cinematic quality. Sharp focus on subject. Depth of field creating separation from background. Professional color grading. The image should look like a frame from a high-budget documentary or commercial.

AVOID: Cartoonish appearance, obvious AI artifacts, distorted proportions, unnatural poses, plastic-looking skin, watermarks, text overlays.`;

  return generateImage(prompt, {
    aspectRatio: "16:9",
    negativePrompt:
      "blurry, distorted, low quality, cartoon, anime, illustration, painting, drawing",
  });
}

/**
 * Test the Gemini API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`
    );
    return response.ok;
  } catch {
    return false;
  }
}
