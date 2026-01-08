#!/usr/bin/env node
/**
 * Generate signed URL for the completed video
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Load .env manually
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

const prisma = new PrismaClient();

async function fix() {
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const r2Key = 'projects/cmk5ehxjj0001fagpa621gev6/scenes/cmk5eieqy0003fagpz5d29109/final-1767892845581.mp4';

  // Generate signed URL (valid for 24 hours)
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'devatar',
    Key: r2Key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 86400 }); // 24 hours

  console.log('Generated signed URL (valid for 24 hours)');
  console.log('URL:', signedUrl.substring(0, 100) + '...');

  // Update scene with signed URL
  await prisma.scene.update({
    where: { id: 'cmk5eieqy0003fagpz5d29109' },
    data: {
      finalVideoUrl: signedUrl,
      lipsyncVideoUrl: signedUrl,
    },
  });

  console.log('\nScene updated! Refresh the page to watch your video.');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
