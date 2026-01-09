/**
 * Set Default Identity API
 *
 * POST /api/identities/[id]/set-default - Set an identity as the default
 *
 * This will:
 * 1. Unset any existing default identity
 * 2. Set the specified identity as default
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if identity exists
    const identity = await prisma.identityProfile.findUnique({
      where: { id },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity profile not found" },
        { status: 404 }
      );
    }

    // Check if identity is active
    if (!identity.isActive) {
      return NextResponse.json(
        { error: "Cannot set an inactive identity as default" },
        { status: 400 }
      );
    }

    // If already default, just return success
    if (identity.isDefault) {
      return NextResponse.json({
        identity,
        message: `${identity.displayName} is already the default identity`,
      });
    }

    // Unset any existing default
    const previousDefault = await prisma.identityProfile.findFirst({
      where: { isDefault: true },
    });

    if (previousDefault) {
      await prisma.identityProfile.update({
        where: { id: previousDefault.id },
        data: { isDefault: false },
      });
      console.log(`[API] Unset previous default identity: ${previousDefault.name}`);
    }

    // Set new default
    const updated = await prisma.identityProfile.update({
      where: { id },
      data: { isDefault: true },
    });

    console.log(`[API] Set default identity: ${updated.name}`);

    return NextResponse.json({
      identity: updated,
      previousDefault: previousDefault?.id || null,
      message: `${updated.displayName} is now the default identity`,
    });
  } catch (error) {
    console.error("[API] Error setting default identity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set default identity" },
      { status: 500 }
    );
  }
}
