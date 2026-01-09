# Digital Twin Technical Architecture

## Overview

This document describes the technical implementation of the Digital Twin feature in Devatar. It covers the architecture, data flow, and integration points.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEVATAR SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   UI (Next.js)   │───▶│   API Routes     │───▶│  Database    │  │
│  │                  │    │                  │    │  (Postgres)  │  │
│  │  /identities     │    │  /api/identities │    │              │  │
│  │  /projects/[id]  │    │  /api/scenes     │    │  - Scene     │  │
│  │  /settings       │    │  /api/settings   │    │  - Identity  │  │
│  └──────────────────┘    └──────────────────┘    │  - Project   │  │
│                                   │              └──────────────┘  │
│                                   │                                 │
│                                   ▼                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    INNGEST PIPELINE                          │  │
│  │                                                               │  │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │  │
│  │  │ Step 1:     │──▶│ Step 2:     │──▶│ Step 3:     │        │  │
│  │  │ Audio       │   │ Image       │   │ Video       │        │  │
│  │  │ (ElevenLabs)│   │ (Fal.ai)    │   │ (Kling)     │        │  │
│  │  └─────────────┘   └─────────────┘   └─────────────┘        │  │
│  │         │                 │                 │                │  │
│  │         │          ┌──────┴──────┐         │                │  │
│  │         │          │ IDENTITY    │         │                │  │
│  │         │          │ ANCHOR      │         │                │  │
│  │         │          │ LoRA Check  │         │                │  │
│  │         │          └─────────────┘         │                │  │
│  │         │                                  │                │  │
│  │         ▼                                  ▼                │  │
│  │  ┌─────────────┐                   ┌─────────────┐         │  │
│  │  │ Step 4:     │──────────────────▶│ Step 5:     │         │  │
│  │  │ Lipsync     │                   │ Upload      │         │  │
│  │  │ (SyncLabs)  │                   │ (R2)        │         │  │
│  │  └─────────────┘                   └─────────────┘         │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Configuration Layer (`src/config/identity.ts`)

**Purpose**: Centralized identity configuration and utility functions.

**Key Exports**:
- `IdentityProfile` - TypeScript interface for identity data
- `DEVEN_IDENTITY` - Default identity from environment
- `getDefaultIdentity()` - Get active default identity
- `isDigitalTwinAvailable()` - Check if DT mode can be used
- `buildIdentityPrompt()` - Construct LoRA-enhanced prompts
- `getEffectiveGenerationMode()` - Determine actual mode to use

**Environment Variables Used**:
- `DEVEN_LORA_URL` - Default LoRA safetensors URL
- `ELEVENLABS_VOICE_ID` - Default voice clone ID
- `FAL_KEY` - Required for Digital Twin mode

### 2. Fal.ai Integration (`src/lib/ai/fal.ts`)

**Purpose**: Interface with Fal.ai for LoRA-based image generation.

**Key Functions**:
- `generateWithLora()` - Main generation function
- `generateIdentityAnchor()` - Convenience wrapper with trigger word
- `validateLoraUrl()` - Verify LoRA file accessibility
- `testConnection()` - API health check
- `estimateCost()` - Cost estimation

**API Configuration**:
```typescript
const FAL_FLUX_LORA_MODEL = "fal-ai/flux-lora";
const DEFAULT_OPTIONS = {
  imageSize: "landscape_16_9",
  numInferenceSteps: 28,
  guidanceScale: 3.5,
  enableSafetyChecker: false,
};
```

### 3. Database Schema (`prisma/schema.prisma`)

**New Model: IdentityProfile**
```prisma
model IdentityProfile {
  id              String    @id @default(cuid())
  name            String    @unique
  displayName     String
  description     String?   @db.Text
  triggerWord     String    @unique
  loraKey         String?
  loraUrl         String?
  loraScale       Float     @default(0.95)
  baseModel       String    @default("flux-dev")
  voiceId         String?
  voiceModel      String    @default("eleven_turbo_v2_5")
  voiceStability  Float     @default(0.5)
  voiceSimilarity Float     @default(0.8)
  voiceStyle      Float     @default(0.2)
  voiceSpeakerBoost Boolean @default(true)
  isDefault       Boolean   @default(false)
  isActive        Boolean   @default(true)
  scenes          Scene[]   @relation("SceneIdentity")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Scene Model Extensions**:
```prisma
model Scene {
  // ... existing fields
  identityId      String?
  identity        IdentityProfile? @relation("SceneIdentity")
  generationMode  String?  // "standard" | "digital-twin"
}
```

**New Enum Values**:
- `AssetType.LORA_MODEL` - For future direct LoRA uploads
- `GenerationStep.IDENTITY_ANCHOR` - For logging

### 4. Generation Pipeline (`src/inngest/functions/generate-scene.ts`)

**Feature Flag Logic**:
```typescript
const generationMode: GenerationMode =
  (scene.generationMode as GenerationMode) || "standard";

if (generationMode === "digital-twin") {
  // Check LoRA availability
  // Validate LoRA URL
  // Generate with Fal.ai + LoRA
  // OR fall back to standard mode
}
```

**Mode Decision Tree**:
```
Is generationMode === "digital-twin"?
  ├── YES: Check LoRA configuration
  │   ├── LoRA URL exists?
  │   │   ├── YES: Validate LoRA accessibility
  │   │   │   ├── Valid: Generate with Fal.ai + LoRA ✓
  │   │   │   └── Invalid: Throw error (logged, fails gracefully)
  │   │   └── NO: Log warning, fall through to standard
  │   └──
  └── NO: Standard mode
      ├── Headshot available?
      │   ├── YES: Use headshot ✓
      │   └── NO: Generate with Flux (fallback) ✓
```

### 5. API Endpoints (`src/app/api/identities/`)

| Route | Method | Handler | Purpose |
|-------|--------|---------|---------|
| `/api/identities` | GET | `route.ts` | List all identities |
| `/api/identities` | POST | `route.ts` | Create new identity |
| `/api/identities/[id]` | GET | `[id]/route.ts` | Get single identity |
| `/api/identities/[id]` | PUT | `[id]/route.ts` | Update identity |
| `/api/identities/[id]` | DELETE | `[id]/route.ts` | Delete identity |
| `/api/identities/[id]/test` | POST | `[id]/test/route.ts` | Test configuration |
| `/api/identities/[id]/set-default` | POST | `[id]/set-default/route.ts` | Set as default |
| `/api/identities/status` | GET | `status/route.ts` | System status |

---

## Data Flow

### Identity Creation Flow

```
User Input (UI Form)
       │
       ▼
POST /api/identities
       │
       ├── Validate unique name
       ├── Validate unique trigger word
       ├── Validate loraScale range (0-1)
       ├── Validate baseModel enum
       │
       ▼
prisma.identityProfile.create()
       │
       ▼
Return identity JSON
```

### Generation Flow (Digital Twin Mode)

```
scene/generate event
       │
       ▼
Fetch scene with identity relation
       │
       ▼
Determine generationMode
       │
       ├── "digital-twin"
       │   │
       │   ▼
       │   Get identity (db or config default)
       │   │
       │   ▼
       │   Extract: loraUrl, loraScale, triggerWord
       │   │
       │   ▼
       │   validateLoraUrl(loraUrl)
       │   │
       │   ├── Valid: Continue
       │   └── Invalid: Throw Error
       │   │
       │   ▼
       │   buildIdentityPrompt()
       │   │
       │   ▼
       │   generateWithLora({
       │     prompt: identityPrompt,
       │     loras: [{ path: loraUrl, scale: loraScale }]
       │   })
       │   │
       │   ▼
       │   Upload to R2
       │   │
       │   ▼
       │   Update scene.imageUrl, scene.imageModel = "fal-ai/flux-lora"
       │
       └── "standard"
           │
           ▼
           [Existing headshot/Flux flow]
```

---

## Error Handling

### LoRA Validation Errors

| Error | Cause | User Message | Log Level |
|-------|-------|--------------|-----------|
| `LoRA not accessible: HTTP 404` | URL wrong/expired | "LoRA file not found" | ERROR |
| `LoRA too small` | Wrong file uploaded | "File seems too small" | ERROR |
| `No LoRA configured` | URL not set | Falls back silently | WARN |

### Fal.ai Errors

| Error | Cause | Handling |
|-------|-------|----------|
| Rate limit | Quota exceeded | Throw, retry via Inngest |
| Invalid prompt | Bad characters | Clean and retry |
| Generation failed | Model issue | Throw, log payload |

---

## Configuration Reference

### Environment Variables

```env
# Required for Digital Twin
FAL_KEY=fal_...

# Optional: Default LoRA (fallback if no DB identity)
DEVEN_LORA_URL=https://...

# Voice (used in voice settings)
ELEVENLABS_VOICE_ID=...
```

### Feature Flags

| Flag | Location | Effect |
|------|----------|--------|
| `scene.generationMode` | Database | Per-scene mode selection |
| `identity.isActive` | Database | Enable/disable identity |
| `identity.isDefault` | Database | Auto-select this identity |

---

## Logging

### Log Steps

| Step | Provider | Events |
|------|----------|--------|
| `IDENTITY_ANCHOR` | Fal.ai | LoRA validation, generation |
| `IMAGE_GENERATION` | System | Mode selection, fallback |

### Example Log Entries

```
INFO  [IDENTITY_ANCHOR] Digital Twin mode activated - checking identity configuration
INFO  [IDENTITY_ANCHOR] Validating LoRA URL accessibility for Deven Spear: https://...
INFO  [IDENTITY_ANCHOR] LoRA validated: 256MB
INFO  [IDENTITY_ANCHOR] Generating identity anchor with trigger word: TOK_DEVEN
INFO  [IDENTITY_ANCHOR] Digital Twin image generated successfully in 8432ms
```

---

## Testing Checklist

### Unit Tests Needed

- [ ] `isDigitalTwinAvailable()` returns correct values
- [ ] `buildIdentityPrompt()` includes trigger word
- [ ] `getEffectiveGenerationMode()` handles fallbacks
- [ ] `validateLoraUrl()` catches invalid URLs

### Integration Tests Needed

- [ ] Identity CRUD operations
- [ ] Set default identity flow
- [ ] Test endpoint with mock LoRA
- [ ] Generation pipeline with mock Fal.ai

### Manual Tests

- [ ] Create identity via UI
- [ ] Edit identity settings
- [ ] Delete identity (with/without scenes)
- [ ] Test button validates correctly
- [ ] Generate scene with Digital Twin
- [ ] Fallback to standard works

---

## Migration Notes

### Database Migration

Run after code deployment:
```bash
npx prisma migrate dev --name add-identity-profile
# Or in production:
npx prisma migrate deploy
```

### Backward Compatibility

- Existing scenes continue to work (generationMode = null = "standard")
- No breaking changes to existing API
- Standard mode unchanged
- Digital Twin is opt-in via identity assignment

---

## Performance Considerations

### Fal.ai Generation

- Typical time: 5-15 seconds per image
- Queue-based (async with polling)
- Cost: ~$0.03 per image with LoRA

### LoRA Validation

- HEAD request only (no download)
- Cached in Fal.ai for subsequent uses
- First generation may be slower (LoRA loading)

---

## Security Notes

1. **LoRA URLs**: Should be read-only public URLs
2. **API Keys**: Never exposed to client
3. **Trigger Words**: Unique per identity, validated on create
4. **Voice IDs**: ElevenLabs validates on generation

---

*Last Updated: January 9, 2026*
