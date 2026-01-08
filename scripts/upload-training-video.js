#!/usr/bin/env node
/**
 * Upload large training video to R2 via S3 API
 * Bypasses the 300MB Cloudflare Dashboard limit
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// Load .env manually
const envPath = path.join(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

// UPDATE THIS PATH if needed:
const FILE_PATH = process.argv[2] || "/Users/devenspear/Desktop/DevAtar1.0/DevenAvatarTraining/DevAtar_GreenScreen_Min.mp4";
const R2_KEY = "assets/training_video/DevAtar_GreenScreen_Min.mp4";

async function uploadToR2() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("         R2 LARGE FILE UPLOAD                          ");
  console.log("═══════════════════════════════════════════════════════");

  // Check file exists
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ File not found: ${FILE_PATH}`);
    process.exit(1);
  }

  const stats = fs.statSync(FILE_PATH);
  const fileSizeGB = (stats.size / 1024 / 1024 / 1024).toFixed(2);
  console.log(`\n📁 File: ${FILE_PATH}`);
  console.log(`📊 Size: ${fileSizeGB} GB`);
  console.log(`🎯 Destination: ${R2_KEY}`);

  // Create R2 client
  const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const bucketName = process.env.R2_BUCKET_NAME || "devatar";

  console.log(`\n☁️  Bucket: ${bucketName}`);
  console.log(`\n⏳ Uploading... (this may take several minutes for large files)`);

  const startTime = Date.now();

  try {
    const fileStream = fs.createReadStream(FILE_PATH);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: R2_KEY,
      Body: fileStream,
      ContentType: "video/mp4",
    });

    await r2Client.send(command);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Upload complete!`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📍 R2 Key: ${R2_KEY}`);
    console.log("\n═══════════════════════════════════════════════════════");

  } catch (error) {
    console.error(`\n❌ Upload failed:`, error.message);
    process.exit(1);
  }
}

uploadToR2();
