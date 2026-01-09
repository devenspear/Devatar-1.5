import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Lazy-initialize R2 client to ensure environment variables are available
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

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || "devatar";
}

function getPublicUrl(): string | undefined {
  return process.env.R2_PUBLIC_URL;
}

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload a file to R2 storage
 */
export async function uploadToR2(
  buffer: Buffer | ArrayBuffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  // Convert ArrayBuffer to Buffer if needed
  const bodyBuffer = buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer));

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: bodyBuffer,
    ContentType: contentType,
  });

  await getR2Client().send(command);

  const publicUrl = getPublicUrl();
  const url = publicUrl ? `${publicUrl}/${key}` : await getSignedDownloadUrl(key);

  return { key, url };
}

/**
 * Get a signed URL for downloading a file
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}

/**
 * Download a file from R2 storage
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  const response = await getR2Client().send(command);
  const stream = response.Body;

  if (!stream) {
    throw new Error("No body in response");
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  await getR2Client().send(command);
}

/**
 * Generate a unique key for an asset
 */
export function generateAssetKey(
  type: string,
  id: string,
  filename: string
): string {
  const ext = filename.split(".").pop() || "";
  const timestamp = Date.now();
  return `assets/${type}/${id}/${timestamp}.${ext}`;
}

/**
 * Generate a key for scene outputs
 */
export function generateSceneKey(
  projectId: string,
  sceneId: string,
  outputType: "audio" | "image" | "video" | "lipsync" | "final"
): string {
  const timestamp = Date.now();
  const ext = outputType === "audio" ? "mp3" : outputType === "image" ? "png" : "mp4";
  return `projects/${projectId}/scenes/${sceneId}/${outputType}-${timestamp}.${ext}`;
}
