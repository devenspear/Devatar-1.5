/**
 * Google Gemini/NanoBanana API Client
 * Image generation for character/scene images using official SDK
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

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
 * Generate an image using Gemini 2.0 Flash Experimental with image generation
 */
export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> {
  const { negativePrompt, aspectRatio = "16:9" } = options;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

  // Build the full prompt
  let fullPrompt = `Generate a photorealistic image: ${prompt}`;
  if (negativePrompt) {
    fullPrompt += ` Do not include: ${negativePrompt}`;
  }
  fullPrompt += ` Aspect ratio: ${aspectRatio}. Ultra-realistic, cinematic quality, professional lighting.`;

  // Use Gemini 2.0 Flash Exp with image generation
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      // @ts-expect-error - experimental feature
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  });

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts || [];

  // Find the image part
  const imagePart = parts.find((p) => "inlineData" in p && p.inlineData);
  const textPart = parts.find((p) => "text" in p && p.text);

  if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData?.data) {
    throw new Error("No image generated in response. Parts: " + JSON.stringify(parts.map(p => Object.keys(p))));
  }

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
    revisedPrompt: textPart && "text" in textPart ? textPart.text : undefined,
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
