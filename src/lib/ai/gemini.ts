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
 * Generate an image using Gemini's image generation capabilities
 */
export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> {
  const { negativePrompt, aspectRatio = "16:9", numberOfImages = 1 } = options;

  // Build the full prompt
  let fullPrompt = prompt;
  if (negativePrompt) {
    fullPrompt += `\n\nAvoid: ${negativePrompt}`;
  }

  // Use Gemini 2.0 Flash for image generation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate a photorealistic image with the following description:\n\n${fullPrompt}\n\nAspect ratio: ${aspectRatio}\n\nStyle: Ultra-realistic, cinematic quality, sharp focus, professional lighting.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["image", "text"],
          responseMimeType: "image/png",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData);
  const textPart = parts.find((p: { text?: string }) => p.text);

  if (!imagePart?.inlineData) {
    throw new Error("No image generated in response");
  }

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
    revisedPrompt: textPart?.text,
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
