import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

/**
 * GET /api/scenes/[id]/video-url
 * Returns a fresh signed URL for the scene's final video
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "final"; // final, raw, audio

    const scene = await prisma.scene.findUnique({
      where: { id },
      select: {
        finalVideoUrl: true,
        lipsyncVideoUrl: true,
        rawVideoUrl: true,
        audioUrl: true,
        imageUrl: true,
      },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Determine which URL to use
    let storedUrl: string | null = null;
    switch (type) {
      case "final":
        storedUrl = scene.finalVideoUrl || scene.lipsyncVideoUrl;
        break;
      case "lipsync":
        storedUrl = scene.lipsyncVideoUrl;
        break;
      case "raw":
        storedUrl = scene.rawVideoUrl;
        break;
      case "audio":
        storedUrl = scene.audioUrl;
        break;
      case "image":
        storedUrl = scene.imageUrl;
        break;
      default:
        storedUrl = scene.finalVideoUrl;
    }

    if (!storedUrl) {
      return NextResponse.json(
        { error: `No ${type} URL available for this scene` },
        { status: 404 }
      );
    }

    // Extract the R2 key from the stored URL
    // URL format: https://accountid.r2.cloudflarestorage.com/bucket/key
    // or: https://custom-domain/key
    let key: string;
    try {
      const url = new URL(storedUrl);
      // Remove leading slash and bucket name if present
      const pathname = url.pathname;
      // Key is everything after /devatar/ (bucket name)
      const bucketMatch = pathname.match(/\/devatar\/(.+)$/);
      if (bucketMatch) {
        key = bucketMatch[1];
      } else {
        // Try without bucket name prefix
        key = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      }
    } catch {
      // If URL parsing fails, assume the stored value is already a key
      key = storedUrl;
    }

    // Generate a fresh signed URL (valid for 1 hour)
    const signedUrl = await getSignedDownloadUrl(key, 3600);

    return NextResponse.json({
      url: signedUrl,
      type,
      expiresIn: 3600,
      debug: {
        storedUrl: storedUrl.substring(0, 80) + "...",
        extractedKey: key,
      },
    });
  } catch (error) {
    console.error("Error generating video URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate URL" },
      { status: 500 }
    );
  }
}
