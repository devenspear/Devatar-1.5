import { NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedDownloadUrl as getSignedDownloadUrlFromModule } from "@/lib/storage/r2";

/**
 * GET /api/test-r2
 * Comprehensive R2 signed URL diagnostic endpoint
 * Tests: upload, signed URL generation, and actual URL accessibility
 */
export async function GET() {
  const diagnostics: {
    step: string;
    success: boolean;
    error?: string;
    details?: Record<string, unknown>;
  }[] = [];

  const testKey = `test/r2-diagnostic-${Date.now()}.txt`;
  const testContent = `R2 diagnostic test at ${new Date().toISOString()}`;

  // Step 1: Check environment variables
  const envCheck = {
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "devatar",
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "(not set)",
  };

  diagnostics.push({
    step: "1. Environment Variables",
    success: envCheck.R2_ACCOUNT_ID && envCheck.R2_ACCESS_KEY_ID && envCheck.R2_SECRET_ACCESS_KEY,
    details: {
      ...envCheck,
      // Mask sensitive values
      R2_ACCESS_KEY_ID: envCheck.R2_ACCESS_KEY_ID ? "***set***" : "MISSING",
      R2_SECRET_ACCESS_KEY: envCheck.R2_SECRET_ACCESS_KEY ? "***set***" : "MISSING",
    },
  });

  if (!envCheck.R2_ACCOUNT_ID || !envCheck.R2_ACCESS_KEY_ID || !envCheck.R2_SECRET_ACCESS_KEY) {
    return NextResponse.json({
      success: false,
      message: "Missing R2 credentials",
      diagnostics,
    });
  }

  // Create R2 client
  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const bucketName = process.env.R2_BUCKET_NAME || "devatar";

  const r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  diagnostics.push({
    step: "2. R2 Client Configuration",
    success: true,
    details: {
      endpoint,
      bucketName,
      region: "auto",
    },
  });

  // Step 3: Test upload (PutObject)
  try {
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: "text/plain",
    });

    await r2Client.send(putCommand);

    diagnostics.push({
      step: "3. Upload Test (PutObject)",
      success: true,
      details: {
        key: testKey,
        contentLength: testContent.length,
      },
    });
  } catch (error) {
    diagnostics.push({
      step: "3. Upload Test (PutObject)",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      success: false,
      message: "Upload failed - check R2 credentials and bucket permissions",
      diagnostics,
    });
  }

  // Step 4: Generate signed URL
  let signedUrl: string;
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 3600 });

    diagnostics.push({
      step: "4. Generate Signed URL",
      success: true,
      details: {
        urlLength: signedUrl.length,
        urlPreview: signedUrl.substring(0, 100) + "...",
        expiresIn: "3600 seconds",
      },
    });
  } catch (error) {
    diagnostics.push({
      step: "4. Generate Signed URL",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      success: false,
      message: "Signed URL generation failed",
      diagnostics,
    });
  }

  // Step 5: Test signed URL access
  try {
    const response = await fetch(signedUrl);
    const responseText = await response.text();

    if (response.ok) {
      diagnostics.push({
        step: "5. Fetch Signed URL",
        success: true,
        details: {
          status: response.status,
          statusText: response.statusText,
          contentLength: responseText.length,
          contentMatch: responseText === testContent,
        },
      });
    } else {
      diagnostics.push({
        step: "5. Fetch Signed URL",
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText.substring(0, 500),
          signedUrl: signedUrl.substring(0, 150) + "...",
        },
      });
    }
  } catch (error) {
    diagnostics.push({
      step: "5. Fetch Signed URL",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 6: Test signed URL from r2.ts module (uses lazy-initialized client)
  let moduleSignedUrl: string;
  try {
    moduleSignedUrl = await getSignedDownloadUrlFromModule(testKey, 3600);

    diagnostics.push({
      step: "6. Module Signed URL Generation",
      success: true,
      details: {
        urlLength: moduleSignedUrl.length,
        urlPreview: moduleSignedUrl.substring(0, 100) + "...",
        matchesDirect: moduleSignedUrl.split("?")[0] === signedUrl.split("?")[0],
      },
    });
  } catch (error) {
    diagnostics.push({
      step: "6. Module Signed URL Generation",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    moduleSignedUrl = "";
  }

  // Step 7: Test module signed URL access
  if (moduleSignedUrl) {
    try {
      const response = await fetch(moduleSignedUrl);
      const responseText = await response.text();

      if (response.ok) {
        diagnostics.push({
          step: "7. Fetch Module Signed URL",
          success: true,
          details: {
            status: response.status,
            statusText: response.statusText,
            contentLength: responseText.length,
            contentMatch: responseText === testContent,
          },
        });
      } else {
        diagnostics.push({
          step: "7. Fetch Module Signed URL",
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            responseBody: responseText.substring(0, 500),
          },
        });
      }
    } catch (error) {
      diagnostics.push({
        step: "7. Fetch Module Signed URL",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Step 8: Test direct SDK download (GetObject)
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    const response = await r2Client.send(getCommand);
    const stream = response.Body;

    if (stream) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");

      diagnostics.push({
        step: "8. Direct SDK Download (GetObject)",
        success: true,
        details: {
          contentLength: content.length,
          contentMatch: content === testContent,
        },
      });
    } else {
      diagnostics.push({
        step: "8. Direct SDK Download (GetObject)",
        success: false,
        error: "No body in response",
      });
    }
  } catch (error) {
    diagnostics.push({
      step: "8. Direct SDK Download (GetObject)",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 9: Cleanup - delete test file
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    await r2Client.send(deleteCommand);

    diagnostics.push({
      step: "9. Cleanup (DeleteObject)",
      success: true,
    });
  } catch (error) {
    diagnostics.push({
      step: "9. Cleanup (DeleteObject)",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Summary
  const allPassed = diagnostics.every((d) => d.success);
  const signedUrlWorks = diagnostics.find((d) => d.step.includes("Fetch Signed URL"))?.success ?? false;

  return NextResponse.json({
    success: allPassed,
    signedUrlWorks,
    message: signedUrlWorks
      ? "R2 is fully functional including signed URLs"
      : allPassed
      ? "R2 basic operations work but signed URL access failed"
      : "R2 has issues - check diagnostics",
    diagnostics,
    testKey,
  });
}
