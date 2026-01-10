import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/scenes/all - Get all scenes grouped by project
export async function GET() {
  try {
    const scenes = await prisma.scene.findMany({
      orderBy: [
        { project: { name: "asc" } },
        { orderIndex: "asc" },
      ],
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        headshot: {
          select: {
            id: true,
            name: true,
            r2Url: true,
          },
        },
      },
    });

    // Group scenes by project
    const groupedByProject = scenes.reduce(
      (acc, scene) => {
        const projectId = scene.projectId;
        if (!acc[projectId]) {
          acc[projectId] = {
            project: scene.project,
            scenes: [],
          };
        }
        acc[projectId].scenes.push(scene);
        return acc;
      },
      {} as Record<
        string,
        {
          project: (typeof scenes)[0]["project"];
          scenes: typeof scenes;
        }
      >
    );

    return NextResponse.json({
      total: scenes.length,
      projectCount: Object.keys(groupedByProject).length,
      groups: Object.values(groupedByProject),
    });
  } catch (error) {
    console.error("Error fetching all scenes:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenes" },
      { status: 500 }
    );
  }
}
