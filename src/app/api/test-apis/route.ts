import { NextResponse } from "next/server";
import { testConnection as testElevenLabs } from "@/lib/ai/elevenlabs";
import { testConnection as testGemini } from "@/lib/ai/gemini";
import { testConnection as testKling } from "@/lib/ai/kling";
import { testConnection as testSyncLabs } from "@/lib/ai/synclabs";
import { testConnection as testFal } from "@/lib/ai/fal";
import { testFluxConnection as testPiApiFlux } from "@/lib/ai/piapi-flux";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  const results = {
    elevenlabs: false,
    gemini: false,
    piapi_flux: false,
    kling: false,
    synclabs: false,
    fal: false,
    inngest: false,
    database: false,
    r2: false,
  };

  // Test all APIs in parallel
  const [elevenLabsResult, geminiResult, piapiFluxResult, klingResult, syncLabsResult, falResult] =
    await Promise.allSettled([
      testElevenLabs(),
      testGemini(),
      testPiApiFlux(),
      testKling(),
      testSyncLabs(),
      testFal(),
    ]);

  results.elevenlabs =
    elevenLabsResult.status === "fulfilled" && elevenLabsResult.value;
  results.gemini =
    geminiResult.status === "fulfilled" && geminiResult.value;
  results.piapi_flux =
    piapiFluxResult.status === "fulfilled" && piapiFluxResult.value;
  results.kling =
    klingResult.status === "fulfilled" && klingResult.value;
  results.synclabs =
    syncLabsResult.status === "fulfilled" && syncLabsResult.value;
  results.fal =
    falResult.status === "fulfilled" && falResult.value;

  // Test Inngest by checking if env vars are set
  results.inngest = !!(
    process.env.INNGEST_EVENT_KEY &&
    process.env.INNGEST_SIGNING_KEY
  );

  // Test Database connection
  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    results.database = true;
  } catch {
    results.database = false;
  }

  // Test R2 by checking if env vars are set
  results.r2 = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );

  return NextResponse.json(results);
}
