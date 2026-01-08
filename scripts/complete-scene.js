#!/usr/bin/env node
/**
 * Complete a scene that got stuck after lip-sync finished
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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

async function completeScene() {
  const outputUrl = 'https://api.sync.so/v2/generations/75945cf9-831d-4e2a-bb45-84a0bbd1ce8b/result?token=16e57388-47cc-4f8f-9529-a51992124e92';

  console.log('Downloading completed lip-sync video...');
  const response = await fetch(outputUrl);

  if (!response.ok) {
    throw new Error('Failed to download: ' + response.status);
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer());
  console.log('Downloaded:', (videoBuffer.length / 1024 / 1024).toFixed(2), 'MB');

  // Upload to R2
  console.log('Uploading to R2...');
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const finalKey = 'projects/cmk5ehxjj0001fagpa621gev6/scenes/cmk5eieqy0003fagpz5d29109/final-' + Date.now() + '.mp4';

  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'devatar',
    Key: finalKey,
    Body: videoBuffer,
    ContentType: 'video/mp4',
  }));

  const publicUrl = process.env.R2_PUBLIC_URL + '/' + finalKey;
  console.log('Uploaded to:', publicUrl);

  // Update scene
  console.log('Updating scene...');
  await prisma.scene.update({
    where: { id: 'cmk5eieqy0003fagpz5d29109' },
    data: {
      lipsyncVideoUrl: publicUrl,
      lipsyncModel: 'sync-2',
      finalVideoUrl: publicUrl,
      status: 'COMPLETED',
    },
  });

  // Add completion log
  await prisma.generationLog.create({
    data: {
      sceneId: 'cmk5eieqy0003fagpz5d29109',
      projectId: 'cmk5ehxjj0001fagpa621gev6',
      step: 'LIPSYNC_APPLICATION',
      level: 'INFO',
      message: 'Lip-sync completed (manually recovered)',
      provider: 'SyncLabs',
    },
  });

  console.log('');
  console.log('=== SCENE COMPLETED! ===');
  console.log('Refresh the page to see your video!');
}

completeScene().catch(console.error).finally(() => prisma.$disconnect());
