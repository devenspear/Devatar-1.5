# Digital Twin User Guide

## Overview

The Digital Twin feature in Devatar enables identity-locked avatar video generation using custom-trained LoRA (Low-Rank Adaptation) models. This ensures that your AI-generated avatar maintains perfect facial consistency across all videos, creating a truly personalized digital representation.

---

## Table of Contents

1. [Understanding Digital Twin Mode](#understanding-digital-twin-mode)
2. [System Requirements](#system-requirements)
3. [Setting Up Your Identity](#setting-up-your-identity)
4. [Training Your LoRA Model](#training-your-lora-model)
5. [Configuring Digital Twin Mode](#configuring-digital-twin-mode)
6. [Generating Videos](#generating-videos)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Understanding Digital Twin Mode

### What is Digital Twin?

Digital Twin mode uses a custom-trained LoRA model to generate images that maintain your exact facial identity. Unlike the standard mode which uses uploaded headshots, Digital Twin generates new images dynamically while preserving your appearance.

### Generation Modes

| Mode | Image Source | Use Case |
|------|-------------|----------|
| **Standard** | Uploaded headshots | Quick videos, testing, basic content |
| **Digital Twin** | AI-generated with LoRA | Professional content, varied scenes, consistent branding |

### How It Works

1. **LoRA Training**: Train a model on 15-30 photos of your face
2. **Trigger Word**: Use a unique identifier (e.g., `TOK_DEVEN`) in prompts
3. **Identity Lock**: Fal.ai generates images using your LoRA for facial consistency
4. **Video Generation**: Kling AI animates the identity-locked image
5. **Lip-sync**: Sync Labs adds speech synchronization

---

## System Requirements

### API Keys Required

| Service | Purpose | Required For |
|---------|---------|--------------|
| **FAL_KEY** | Fal.ai API access | Digital Twin image generation |
| **ELEVENLABS_API_KEY** | Voice synthesis | Audio generation |
| **KLING_ACCESS_KEY** + **SECRET** | Video generation | Animation |
| **SYNCLABS_API_KEY** | Lip-sync | Speech synchronization |

### LoRA Model Requirements

- Format: `.safetensors`
- Size: 100MB - 500MB (typical)
- Storage: Publicly accessible URL (R2, S3, etc.)
- Training: Flux-compatible LoRA

---

## Setting Up Your Identity

### Step 1: Access the Identities Page

1. Navigate to **Identities** in the sidebar
2. Click **New Identity** button

### Step 2: Configure Basic Information

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Unique identifier (lowercase, no spaces) | `deven-primary` |
| **Display Name** | Friendly name shown in UI | `Deven Spear` |
| **Trigger Word** | Unique word that activates your identity in prompts | `TOK_DEVEN` |
| **Description** | Optional notes about this identity | `Primary digital twin` |

### Step 3: Configure LoRA Settings

| Field | Description | Recommended |
|-------|-------------|-------------|
| **LoRA URL** | Full URL to your `.safetensors` file | `https://your-bucket.r2.dev/model.safetensors` |
| **LoRA Scale** | Strength of identity (0.0 - 1.0) | `0.95` |
| **Base Model** | Flux variant to use | `flux-dev` (quality) or `flux-schnell` (speed) |

### Step 4: Configure Voice (Optional)

| Field | Description |
|-------|-------------|
| **Voice ID** | Your ElevenLabs voice clone ID |
| **Voice Model** | `eleven_turbo_v2_5` (faster) or `eleven_multilingual_v2` (quality) |

### Step 5: Test Your Configuration

1. Click the **Test** button (flask icon) on your identity card
2. System will validate:
   - LoRA URL accessibility
   - Voice ID format
3. Green checkmark = Ready to use

---

## Training Your LoRA Model

### Recommended Training Services

1. **Replicate**: [flux-lora-trainer](https://replicate.com/lucataco/flux-dev-lora-trainer)
2. **Civitai**: Manual training with Kohya
3. **Hugging Face**: Custom training scripts

### Photo Requirements

- **Quantity**: 15-30 high-quality photos
- **Variety**: Different angles, lighting, expressions
- **Resolution**: 512x512 minimum, 1024x1024 recommended
- **Format**: PNG or JPEG

### Training Tips

1. **Consistent lighting**: Natural daylight works best
2. **Clean backgrounds**: Solid colors or simple backgrounds
3. **Neutral expressions**: Include some, but add variety
4. **No accessories**: Avoid glasses in some photos
5. **High quality**: Avoid blur, noise, or compression artifacts

### Uploading Your LoRA

1. Upload `.safetensors` file to R2 or S3
2. Ensure file is publicly accessible
3. Copy the full URL
4. Add to your identity profile

---

## Configuring Digital Twin Mode

### Project-Level Configuration

When creating a scene, you can choose the generation mode:

1. Open your project
2. Edit scene settings
3. Select generation mode (if UI supports it, or set via API)

### Automatic Mode Selection

The system automatically selects Digital Twin mode when:
- An identity with LoRA is assigned to the scene
- FAL_KEY is configured
- LoRA URL is accessible

### Fallback Behavior

If Digital Twin mode fails:
1. System logs the error
2. Falls back to Standard mode
3. Uses headshot if available
4. Uses Flux generation if no headshot

---

## Generating Videos

### Standard Workflow

1. **Create Project**: Add a new project with desired name
2. **Add Scenes**: Create scenes with dialogue and settings
3. **Assign Identity**: Select your Digital Twin identity
4. **Generate**: Click generate and wait for processing

### Scene Settings That Affect Generation

| Setting | Effect on Digital Twin |
|---------|----------------------|
| **Environment** | Injected into image prompt |
| **Wardrobe** | Added to scene description |
| **Mood Lighting** | Applied to generation |
| **Camera** | Used in video generation |

### Generation Pipeline

```
[Dialogue] → ElevenLabs → Audio
           ↓
[Identity + Scene] → Fal.ai + LoRA → Image
           ↓
[Image + Prompt] → Kling AI → Video
           ↓
[Video + Audio] → Sync Labs → Final Video
           ↓
Upload to R2 → Playback Ready
```

---

## Troubleshooting

### Common Issues

#### "LoRA validation failed"

**Causes:**
- LoRA URL not accessible
- File too small (< 10MB suggests wrong file)
- URL expired or incorrect

**Solutions:**
1. Verify URL is publicly accessible
2. Check file is `.safetensors` format
3. Re-upload and get fresh URL

#### "Digital Twin not available"

**Causes:**
- FAL_KEY not configured
- No LoRA URL set

**Solutions:**
1. Add FAL_KEY to environment variables
2. Upload and configure LoRA URL

#### "Fal.ai generation failed"

**Causes:**
- API quota exceeded
- Invalid prompt
- LoRA incompatible

**Solutions:**
1. Check Fal.ai dashboard for quota
2. Simplify prompt
3. Re-train LoRA if persistent

#### "Image doesn't look like me"

**Causes:**
- LoRA scale too low
- Trigger word not in prompt
- LoRA not well-trained

**Solutions:**
1. Increase LoRA scale to 0.95-1.0
2. Verify trigger word is correct
3. Retrain with more/better photos

### Checking Logs

1. Go to **Logs** page
2. Filter by scene or project
3. Look for `IDENTITY_ANCHOR` step
4. Check for errors or warnings

---

## Best Practices

### For Best Results

1. **Use descriptive environments**: "modern office with natural lighting" not just "office"
2. **Consistent trigger word**: Always use the same format (e.g., `TOK_NAME`)
3. **Test before production**: Generate test images to verify quality
4. **Monitor logs**: Check for warnings that might indicate issues

### LoRA Scale Guidelines

| Scene Type | Recommended Scale |
|------------|------------------|
| Close-up portraits | 0.95 - 1.0 |
| Medium shots | 0.90 - 0.95 |
| Wide/full body | 0.85 - 0.90 |

### Voice Settings

| Setting | Purpose | Range |
|---------|---------|-------|
| **Stability** | Consistency of voice | 0.5 (balanced) |
| **Similarity** | Closeness to original | 0.8 (high) |
| **Style** | Expression level | 0.2 (subtle) |

---

## Quick Reference

### Environment Variables

```env
# Required for Digital Twin
FAL_KEY=your_fal_api_key
DEVEN_LORA_URL=https://your-bucket.com/model.safetensors

# Voice (optional override)
ELEVENLABS_VOICE_ID=your_voice_id
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/identities` | GET | List all identities |
| `/api/identities` | POST | Create identity |
| `/api/identities/[id]` | PUT | Update identity |
| `/api/identities/[id]/test` | POST | Test configuration |
| `/api/identities/[id]/set-default` | POST | Set as default |
| `/api/identities/status` | GET | System status |

### Identity Profile Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique identifier |
| displayName | string | Yes | Friendly name |
| triggerWord | string | Yes | LoRA activation word |
| loraUrl | string | No* | URL to .safetensors |
| loraScale | number | No | 0.0 - 1.0, default 0.95 |
| voiceId | string | No | ElevenLabs voice ID |

*Required for Digital Twin mode

---

## Support

For issues not covered in this guide:

1. Check the **Logs** page for detailed error messages
2. Review the generation log for the specific scene
3. Verify all API keys are configured and valid
4. Test each component individually

---

*Last Updated: January 9, 2026*
*Version: 1.0*
