import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const step = searchParams.get("step");

    const where: Prisma.GenerationLogWhereInput = {};

    if (level) {
      where.level = level as Prisma.GenerationLogWhereInput["level"];
    }

    if (step) {
      where.step = step as Prisma.GenerationLogWhereInput["step"];
    }

    const logs = await prisma.generationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        scene: {
          select: { name: true },
        },
        project: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
