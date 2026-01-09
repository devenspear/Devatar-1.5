/**
 * Identity Management API
 *
 * GET /api/identities - List all identity profiles
 * POST /api/identities - Create a new identity profile
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/identities - List all identity profiles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const where = activeOnly ? { isActive: true } : {};

    const identities = await prisma.identityProfile.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { scenes: true },
        },
      },
    });

    return NextResponse.json({
      identities,
      count: identities.length,
    });
  } catch (error) {
    console.error("[API] Error fetching identities:", error);
    return NextResponse.json(
      { error: "Failed to fetch identity profiles" },
      { status: 500 }
    );
  }
}

// POST /api/identities - Create a new identity profile
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Required fields
    const { name, displayName, triggerWord } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!displayName) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    if (!triggerWord) {
      return NextResponse.json(
        { error: "Trigger word is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingByName = await prisma.identityProfile.findUnique({
      where: { name },
    });
    if (existingByName) {
      return NextResponse.json(
        { error: `Identity with name "${name}" already exists` },
        { status: 400 }
      );
    }

    // Check for duplicate trigger word
    const existingByTrigger = await prisma.identityProfile.findUnique({
      where: { triggerWord },
    });
    if (existingByTrigger) {
      return NextResponse.json(
        { error: `Trigger word "${triggerWord}" is already in use` },
        { status: 400 }
      );
    }

    // Optional fields with defaults
    const {
      description = null,
      loraKey = null,
      loraUrl = null,
      loraScale = 0.95,
      baseModel = "flux-dev",
      voiceId = null,
      voiceModel = "eleven_turbo_v2_5",
      voiceStability = 0.5,
      voiceSimilarity = 0.8,
      voiceStyle = 0.2,
      voiceSpeakerBoost = true,
      isDefault = false,
      isActive = true,
    } = body;

    // Validate loraScale range
    if (loraScale < 0 || loraScale > 1) {
      return NextResponse.json(
        { error: "LoRA scale must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Validate baseModel
    if (!["flux-dev", "flux-schnell"].includes(baseModel)) {
      return NextResponse.json(
        { error: "Base model must be 'flux-dev' or 'flux-schnell'" },
        { status: 400 }
      );
    }

    // If setting as default, unset any existing default
    if (isDefault) {
      await prisma.identityProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create the identity profile
    const identity = await prisma.identityProfile.create({
      data: {
        name,
        displayName,
        description,
        triggerWord,
        loraKey,
        loraUrl,
        loraScale,
        baseModel,
        voiceId,
        voiceModel,
        voiceStability,
        voiceSimilarity,
        voiceStyle,
        voiceSpeakerBoost,
        isDefault,
        isActive,
      },
    });

    console.log(`[API] Created identity profile: ${identity.id} (${identity.name})`);

    return NextResponse.json({
      identity,
      message: "Identity profile created successfully",
    });
  } catch (error) {
    console.error("[API] Error creating identity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create identity profile" },
      { status: 500 }
    );
  }
}
