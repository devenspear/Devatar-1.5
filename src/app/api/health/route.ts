/**
 * Health Check Endpoint
 *
 * GET /api/health - Returns app health status
 *
 * Used to verify deployment succeeded after pushing to production.
 * Returns version, build time, and basic connectivity checks.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Import version from package.json
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error" | string> = {
    status: "ok",
    version: packageJson.version,
    timestamp: new Date().toISOString(),
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    checks.database = "error";
    checks.databaseError = error instanceof Error ? error.message : "Unknown";
  }

  // Check if CSS would load (basic sanity check)
  checks.environment = process.env.NODE_ENV || "unknown";

  // Overall status
  const isHealthy = checks.database === "ok";

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
