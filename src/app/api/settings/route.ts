import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/settings - Get a setting by key
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    // Return all settings
    const settings = await prisma.systemSetting.findMany();
    return NextResponse.json(settings);
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    return NextResponse.json({ key, value: null });
  }

  return NextResponse.json(setting);
}

// POST /api/settings - Create or update a setting
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}
