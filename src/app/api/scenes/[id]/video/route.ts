import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// Lazy-initialize R2 client
let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2Client;
}

/**
 * GET /api/scenes/[id]/video
 * Streams the scene's video directly (bypasses R2 signed URL restrictions)
 * Query params:
 *   - type: "final" | "lipsync" | "raw" | "audio" | "image" (default: "final")
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "final";

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
        { error: `No ${type} available for this scene` },
        { status: 404 }
      );
    }

    // Extract the R2 key from the stored URL
    let key: string;
    try {
      const url = new URL(storedUrl);
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

    // Determine content type
    let contentType = "application/octet-stream";
    if (type === "audio" || key.endsWith(".mp3")) {
      contentType = "audio/mpeg";
    } else if (type === "image" || key.endsWith(".png")) {
      contentType = "image/png";
    } else if (key.endsWith(".mp4")) {
      contentType = "video/mp4";
    }

    // Fetch from R2 and stream directly
    const bucketName = process.env.R2_BUCKET_NAME || "devatar";
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await getR2Client().send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "No content" }, { status: 404 });
    }

    // Get the web stream from the SDK response
    const webStream = response.Body.transformToWebStream();

    // Return as a streaming response
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        ...(response.ContentLength && {
          "Content-Length": response.ContentLength.toString(),
        }),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error streaming video:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stream video" },
      { status: 500 }
    );
  }
}
