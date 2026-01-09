/**
 * Digital Twin Status API
 *
 * GET /api/identities/status - Get digital twin system status
 *
 * Returns:
 * - Whether digital twin mode is available
 * - Default identity status
 * - System configuration status
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { isDigitalTwinAvailable, getDefaultIdentity } from "@/config/identity";

export async function GET() {
  try {
    // Check database for default identity
    const dbDefaultIdentity = await prisma.identityProfile.findFirst({
      where: { isDefault: true, isActive: true },
    });

    // Check config default identity
    const configIdentity = getDefaultIdentity();

    // Check environment
    const hasFalKey = !!process.env.FAL_KEY;
    const hasLoraUrl = !!(configIdentity.loraUrl && configIdentity.loraUrl.length > 0);

    // Check digital twin availability
    const digitalTwinAvailable = isDigitalTwinAvailable();

    // Get identity count
    const identityCount = await prisma.identityProfile.count();
    const activeIdentityCount = await prisma.identityProfile.count({
      where: { isActive: true },
    });

    // Build status response
    const status = {
      digitalTwinAvailable,
      configuration: {
        falKeyConfigured: hasFalKey,
        defaultLoraConfigured: hasLoraUrl,
        databaseIdentityCount: identityCount,
        activeIdentityCount: activeIdentityCount,
      },
      defaultIdentity: dbDefaultIdentity
        ? {
            id: dbDefaultIdentity.id,
            name: dbDefaultIdentity.name,
            displayName: dbDefaultIdentity.displayName,
            hasLora: !!dbDefaultIdentity.loraUrl,
            hasVoice: !!dbDefaultIdentity.voiceId,
            source: "database",
          }
        : {
            id: configIdentity.id,
            name: configIdentity.name,
            displayName: configIdentity.displayName,
            hasLora: hasLoraUrl,
            hasVoice: !!configIdentity.voiceId,
            source: "config",
          },
      recommendations: [] as string[],
    };

    // Add recommendations
    if (!hasFalKey) {
      status.recommendations.push("Add FAL_KEY to environment variables to enable Fal.ai integration");
    }
    if (!hasLoraUrl && !dbDefaultIdentity?.loraUrl) {
      status.recommendations.push("Upload a trained LoRA model to enable Digital Twin mode");
    }
    if (identityCount === 0) {
      status.recommendations.push("Create an identity profile in the database for persistent configuration");
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("[API] Error fetching digital twin status:", error);
    return NextResponse.json(
      { error: "Failed to fetch digital twin status" },
      { status: 500 }
    );
  }
}
