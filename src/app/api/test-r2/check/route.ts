import { NextResponse } from "next/server";
import {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedDownloadUrl as getModuleSignedUrl } from "@/lib/storage/r2";

/**
 * GET /api/test-r2/check?key=path/file.mp4 - Check if file exists
 * GET /api/test-r2/check?prefix=path/ - List files with prefix
 * GET /api/test-r2/check?sign=path/file.mp4 - Generate signed URL and test it
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const prefix = searchParams.get("prefix");
  const signKey = searchParams.get("sign");

  if (!key && !prefix && !signKey) {
    return NextResponse.json({
      error: "Provide ?key=path/file, ?prefix=path/, or ?sign=path/file",
    }, { status: 400 });
  }

  const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const bucketName = process.env.R2_BUCKET_NAME || "devatar";

  // If sign key provided, generate and test signed URL
  if (signKey) {
    try {
      // Generate signed URL using direct client
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: signKey,
      });
      const directSignedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 3600 });

      // Generate signed URL using module
      const moduleSignedUrl = await getModuleSignedUrl(signKey, 3600);

      // Test both URLs
      const [directResult, moduleResult] = await Promise.all([
        fetch(directSignedUrl).then(r => ({ status: r.status, ok: r.ok })).catch(e => ({ status: 0, ok: false, error: e.message })),
        fetch(moduleSignedUrl).then(r => ({ status: r.status, ok: r.ok })).catch(e => ({ status: 0, ok: false, error: e.message })),
      ]);

      return NextResponse.json({
        success: true,
        key: signKey,
        directUrl: {
          preview: directSignedUrl.substring(0, 120) + "...",
          testResult: directResult,
        },
        moduleUrl: {
          preview: moduleSignedUrl.substring(0, 120) + "...",
          testResult: moduleResult,
        },
        urlsMatch: directSignedUrl.split("?")[0] === moduleSignedUrl.split("?")[0],
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        key: signKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // If prefix provided, list objects
  if (prefix) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: 20,
      });

      const result = await r2Client.send(command);

      return NextResponse.json({
        success: true,
        prefix,
        count: result.KeyCount || 0,
        objects: result.Contents?.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
        })) || [],
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // If key provided, check if it exists
  if (key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const result = await r2Client.send(command);

      return NextResponse.json({
        success: true,
        exists: true,
        key,
        metadata: {
          contentType: result.ContentType,
          contentLength: result.ContentLength,
          lastModified: result.LastModified,
          etag: result.ETag,
        },
      });
    } catch (error) {
      // HeadObject returns 404 if object doesn't exist
      if (error instanceof Error && error.name === "NotFound") {
        return NextResponse.json({
          success: true,
          exists: false,
          key,
          message: "Object does not exist at this key",
        });
      }
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
