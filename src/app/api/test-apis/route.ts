import { NextResponse } from "next/server";
import { testConnection as testElevenLabs } from "@/lib/ai/elevenlabs";
import { testConnection as testGemini } from "@/lib/ai/gemini";
import { testConnection as testKling } from "@/lib/ai/kling";
import { testConnection as testSyncLabs } from "@/lib/ai/synclabs";

export async function GET() {
  const results = {
    elevenlabs: false,
    gemini: false,
    kling: false,
    synclabs: false,
    r2: false,
  };

  // Test all APIs in parallel
  const [elevenLabsResult, geminiResult, klingResult, syncLabsResult] =
    await Promise.allSettled([
      testElevenLabs(),
      testGemini(),
      testKling(),
      testSyncLabs(),
    ]);

  results.elevenlabs =
    elevenLabsResult.status === "fulfilled" && elevenLabsResult.value;
  results.gemini =
    geminiResult.status === "fulfilled" && geminiResult.value;
  results.kling =
    klingResult.status === "fulfilled" && klingResult.value;
  results.synclabs =
    syncLabsResult.status === "fulfilled" && syncLabsResult.value;

  // Test R2 by checking if env vars are set
  results.r2 = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );

  return NextResponse.json(results);
}
