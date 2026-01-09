/**
 * Single Identity Profile API
 *
 * GET /api/identities/[id] - Get a specific identity profile
 * PUT /api/identities/[id] - Update an identity profile
 * DELETE /api/identities/[id] - Delete an identity profile
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/identities/[id] - Get a specific identity profile
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const identity = await prisma.identityProfile.findUnique({
      where: { id },
      include: {
        scenes: {
          select: {
            id: true,
            name: true,
            status: true,
            projectId: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { scenes: true },
        },
      },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ identity });
  } catch (error) {
    console.error("[API] Error fetching identity:", error);
    return NextResponse.json(
      { error: "Failed to fetch identity profile" },
      { status: 500 }
    );
  }
}

// PUT /api/identities/[id] - Update an identity profile
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if identity exists
    const existing = await prisma.identityProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Identity profile not found" },
        { status: 404 }
      );
    }

    // Validate unique constraints if updating name or triggerWord
    if (body.name && body.name !== existing.name) {
      const nameExists = await prisma.identityProfile.findUnique({
        where: { name: body.name },
      });
      if (nameExists) {
        return NextResponse.json(
          { error: `Identity with name "${body.name}" already exists` },
          { status: 400 }
        );
      }
    }

    if (body.triggerWord && body.triggerWord !== existing.triggerWord) {
      const triggerExists = await prisma.identityProfile.findUnique({
        where: { triggerWord: body.triggerWord },
      });
      if (triggerExists) {
        return NextResponse.json(
          { error: `Trigger word "${body.triggerWord}" is already in use` },
          { status: 400 }
        );
      }
    }

    // Validate loraScale range if provided
    if (body.loraScale !== undefined && (body.loraScale < 0 || body.loraScale > 1)) {
      return NextResponse.json(
        { error: "LoRA scale must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Validate baseModel if provided
    if (body.baseModel && !["flux-dev", "flux-schnell"].includes(body.baseModel)) {
      return NextResponse.json(
        { error: "Base model must be 'flux-dev' or 'flux-schnell'" },
        { status: 400 }
      );
    }

    // If setting as default, unset any existing default
    if (body.isDefault === true && !existing.isDefault) {
      await prisma.identityProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "displayName",
      "description",
      "triggerWord",
      "loraKey",
      "loraUrl",
      "loraScale",
      "baseModel",
      "voiceId",
      "voiceModel",
      "voiceStability",
      "voiceSimilarity",
      "voiceStyle",
      "voiceSpeakerBoost",
      "isDefault",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update the identity
    const updated = await prisma.identityProfile.update({
      where: { id },
      data: updateData,
    });

    console.log(`[API] Updated identity profile: ${id} (${updated.name})`);

    return NextResponse.json({
      identity: updated,
      message: "Identity profile updated successfully",
    });
  } catch (error) {
    console.error("[API] Error updating identity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update identity profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/identities/[id] - Delete an identity profile
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if identity exists
    const existing = await prisma.identityProfile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { scenes: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Identity profile not found" },
        { status: 404 }
      );
    }

    // Prevent deletion if it's the only identity or if it has scenes
    if (existing._count.scenes > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete identity with ${existing._count.scenes} associated scenes. Please reassign or delete the scenes first.`,
        },
        { status: 400 }
      );
    }

    // If deleting the default identity, warn but allow
    if (existing.isDefault) {
      console.warn(`[API] Deleting default identity: ${id}`);
    }

    // Delete the identity
    await prisma.identityProfile.delete({
      where: { id },
    });

    console.log(`[API] Deleted identity profile: ${id} (${existing.name})`);

    return NextResponse.json({
      message: "Identity profile deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error("[API] Error deleting identity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete identity profile" },
      { status: 500 }
    );
  }
}
