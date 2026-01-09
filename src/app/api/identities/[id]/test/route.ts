/**
 * Identity Test API
 *
 * POST /api/identities/[id]/test - Test an identity profile
 *
 * This endpoint validates:
 * 1. LoRA URL accessibility
 * 2. Voice ID validity (optional)
 * 3. Generates a test image (if LoRA is configured and testGeneration=true)
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { validateLoraUrl, generateWithLora } from "@/lib/ai/fal";
import { buildIdentityPrompt, type IdentityProfile } from "@/config/identity";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { testGeneration = false } = body;

    // Fetch the identity profile
    const identity = await prisma.identityProfile.findUnique({
      where: { id },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity profile not found" },
        { status: 404 }
      );
    }

    const results: {
      loraValidation?: {
        valid: boolean;
        message: string;
        details?: { contentType?: string; contentLength?: number };
      };
      voiceValidation?: {
        valid: boolean;
        message: string;
      };
      testImage?: {
        success: boolean;
        imageUrl?: string;
        inferenceTime?: number;
        error?: string;
      };
      overallStatus: "success" | "partial" | "failed";
      message: string;
    } = {
      overallStatus: "success",
      message: "",
    };

    // Test 1: Validate LoRA URL
    if (identity.loraUrl) {
      console.log(`[API] Testing LoRA URL for identity: ${identity.name}`);
      results.loraValidation = await validateLoraUrl(identity.loraUrl);

      if (!results.loraValidation.valid) {
        results.overallStatus = "partial";
      }
    } else {
      results.loraValidation = {
        valid: false,
        message: "No LoRA URL configured. Digital Twin mode will not work until a LoRA is uploaded.",
      };
      results.overallStatus = "partial";
    }

    // Test 2: Validate Voice ID (basic check)
    if (identity.voiceId) {
      // For now, just check if it looks like a valid ElevenLabs ID
      const isValidFormat = /^[a-zA-Z0-9]{20,}$/.test(identity.voiceId);
      results.voiceValidation = {
        valid: isValidFormat,
        message: isValidFormat
          ? "Voice ID format is valid"
          : "Voice ID format appears invalid. Expected alphanumeric string of 20+ characters.",
      };

      if (!isValidFormat) {
        results.overallStatus = results.overallStatus === "failed" ? "failed" : "partial";
      }
    } else {
      results.voiceValidation = {
        valid: false,
        message: "No Voice ID configured. The system will use the default voice.",
      };
      // This is not a failure, just informational
    }

    // Test 3: Generate a test image (if requested and LoRA is valid)
    if (testGeneration && results.loraValidation?.valid && identity.loraUrl) {
      console.log(`[API] Generating test image for identity: ${identity.name}`);

      try {
        // Check if FAL_KEY is configured
        if (!process.env.FAL_KEY) {
          results.testImage = {
            success: false,
            error: "FAL_KEY environment variable is not configured",
          };
          results.overallStatus = "partial";
        } else {
          // Build a simple test prompt
          const configIdentity: IdentityProfile = {
            id: identity.id,
            name: identity.name,
            displayName: identity.displayName,
            description: identity.description || undefined,
            triggerWord: identity.triggerWord,
            loraUrl: identity.loraUrl,
            loraScale: identity.loraScale,
            baseModel: identity.baseModel as "flux-dev" | "flux-schnell",
            voiceId: identity.voiceId,
            voiceSettings: {
              stability: identity.voiceStability,
              similarityBoost: identity.voiceSimilarity,
              style: identity.voiceStyle,
              useSpeakerBoost: identity.voiceSpeakerBoost,
            },
            voiceModel: identity.voiceModel as "eleven_multilingual_v2" | "eleven_turbo_v2_5",
            isDefault: identity.isDefault,
            isActive: identity.isActive,
          };

          const testPrompt = buildIdentityPrompt(
            "professional studio portrait, looking at camera, neutral expression",
            configIdentity,
            { moodLighting: "soft studio" }
          );

          const result = await generateWithLora({
            prompt: testPrompt,
            loras: [{
              path: identity.loraUrl,
              scale: identity.loraScale,
            }],
            imageSize: "square",
            numInferenceSteps: 20, // Faster for testing
            guidanceScale: 3.5,
          });

          results.testImage = {
            success: true,
            imageUrl: result.imageUrl,
            inferenceTime: result.inferenceTime,
          };

          console.log(`[API] Test image generated in ${result.inferenceTime}ms`);
        }
      } catch (genError) {
        results.testImage = {
          success: false,
          error: genError instanceof Error ? genError.message : "Image generation failed",
        };
        results.overallStatus = "partial";
      }
    }

    // Build overall message
    const messages: string[] = [];

    if (results.loraValidation?.valid) {
      messages.push("LoRA is accessible and valid");
    } else if (identity.loraUrl) {
      messages.push(`LoRA validation failed: ${results.loraValidation?.message}`);
    } else {
      messages.push("No LoRA configured (required for Digital Twin mode)");
    }

    if (results.voiceValidation?.valid) {
      messages.push("Voice ID is configured");
    } else if (!identity.voiceId) {
      messages.push("No custom voice configured (using default)");
    }

    if (results.testImage?.success) {
      messages.push(`Test image generated successfully (${results.testImage.inferenceTime}ms)`);
    } else if (testGeneration && results.testImage?.error) {
      messages.push(`Test image failed: ${results.testImage.error}`);
    }

    results.message = messages.join(". ");

    // Update overall status based on critical failures
    if (!results.loraValidation?.valid && identity.loraUrl) {
      results.overallStatus = "failed";
    }

    console.log(`[API] Identity test complete: ${identity.name} - ${results.overallStatus}`);

    return NextResponse.json(results);
  } catch (error) {
    console.error("[API] Error testing identity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to test identity profile" },
      { status: 500 }
    );
  }
}
