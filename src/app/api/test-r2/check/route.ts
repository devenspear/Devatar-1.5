import { NextResponse } from "next/server";
import {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

/**
 * GET /api/test-r2/check?key=projects/xxx/file.mp4
 * Check if a specific file exists in R2
 * Or list files in a prefix if key ends with /
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const prefix = searchParams.get("prefix");

  if (!key && !prefix) {
    return NextResponse.json({
      error: "Provide ?key=path/to/file or ?prefix=path/to/folder/",
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
