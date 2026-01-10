# Phase 2: Background + Headshot Compositing

**Status**: PLANNED (On Hold - Resume after January 11, 2026)
**Last Updated**: January 10, 2026

---

## Problem Statement

The current Devatar workflow has two modes:

1. **Standard Mode**: Upload headshot → Animate with Kling → Lip-sync
2. **Digital Twin Mode**: LoRA generates identity image → Animate with Kling → Lip-sync

Neither mode properly handles **placing the person INTO an environment**. The headshot is animated as-is, without compositing into a background scene.

The PRD's original vision (FR-2.2, Step 2) specified:
> "Character Image Generation - Generate image of Deven in specified wardrobe, Use reference images for face consistency, **Place in specified environment**"

---

## Proposed Solution

### New Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW GENERATION PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ASSETS                                                          │
│  ├── Background Scenes (BACKGROUND asset type)                  │
│  │   └── Uploaded scene images (data center, conference room)   │
│  └── Headshots (HEADSHOT asset type)                            │
│      └── Reference photos of Deven                              │
│                                                                  │
│                         ↓                                        │
│                                                                  │
│  SCENE CONFIGURATION                                             │
│  ├── Select Background Scene (or describe for generation)       │
│  ├── Select Headshot OR use Digital Twin LoRA                   │
│  └── Define: wardrobe, pose, position in scene                  │
│                                                                  │
│                         ↓                                        │
│                                                                  │
│  COMPOSITING (NEW STEP)                                          │
│  ├── Option A: AI Inpainting                                    │
│  │   └── Mask area → Paint person into scene                    │
│  ├── Option B: Background Removal + Overlay                     │
│  │   └── Remove BG from headshot → Overlay on scene             │
│  └── Option C: Full AI Generation                               │
│      └── Generate new image with scene + identity               │
│                                                                  │
│                         ↓                                        │
│                                                                  │
│  EXISTING PIPELINE                                               │
│  ├── Kling AI → Animate the composited image                    │
│  └── Sync Labs → Apply lip-sync to match audio                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Asset Organization

### Current Asset Types (Prisma Schema)
```
TRAINING_VIDEO
HEADSHOT
VOICE_SAMPLE
BACKGROUND      ← Already exists, but underutilized
SOUND_EFFECT
SCENE_IMAGE     ← Complete scenes (person already composited)
LORA_MODEL
```

### Required Changes
1. **BACKGROUND** - Rename/clarify as "Background Scene" in UI
2. **HEADSHOT** - Keep as is (person photos for compositing)
3. **SCENE_IMAGE** - Keep for externally-composited scenes (Nano Banana, etc.)

### UI Updates Needed
- Assets page should clearly separate:
  - **Background Scenes** (environments without person)
  - **Reference Photos** (headshots of the person)
  - **Complete Scenes** (already composited, ready for animation)

---

## Recommended AI Models for Compositing

### Option A: Fal.ai Inpainting (Recommended)

**Model**: `fal-ai/flux-lora/inpainting` or `fal-ai/inpaint`

**How it works**:
1. Upload background scene
2. Create mask where person should appear
3. Provide prompt describing the person (with LoRA trigger word)
4. AI generates person in that masked area

**Pros**:
- Already using Fal.ai for Digital Twin
- Can use same LoRA model for identity consistency
- Natural blending with scene

**Cons**:
- Requires mask generation (additional complexity)

---

### Option B: Background Removal + AI Overlay

**Models**:
1. `fal-ai/birefnet` - Background removal from headshot
2. `fal-ai/image-to-image` - Blend/harmonize the composite

**How it works**:
1. Remove background from headshot
2. Position person over background scene
3. Use image-to-image to harmonize lighting/colors

**Pros**:
- Simpler concept
- More control over positioning

**Cons**:
- May look "pasted on" without good harmonization
- Harder to change pose/wardrobe

---

### Option C: Full Regeneration with LoRA

**Model**: `fal-ai/flux-lora` (current Digital Twin model)

**How it works**:
1. Generate new image from scratch
2. Prompt includes: background description + TOK_DEVEN trigger + wardrobe + pose
3. Use uploaded background as reference/guidance

**Pros**:
- Most natural results
- Full flexibility in pose/wardrobe/expression

**Cons**:
- Less control over exact background
- May deviate from uploaded background scene

---

## Recommendation

**Start with Option A (Fal.ai Inpainting)** because:

1. **Identity consistency** - Same LoRA model ensures face matches
2. **Background fidelity** - Exact background you uploaded is preserved
3. **Natural integration** - AI paints person INTO the scene
4. **Already integrated** - Fal.ai is already in the codebase

### Implementation Steps

1. **Update Assets UI** - Clear separation of background scenes vs headshots
2. **Add Scene Configuration** - Select background + headshot/identity
3. **Implement Mask Generation** - Auto-detect or manual mask for person placement
4. **Integrate Inpainting API** - Call Fal.ai inpainting with mask + LoRA
5. **Update Generation Pipeline** - Add compositing step before Kling animation
6. **Test End-to-End** - Generate scene with new workflow

---

## Database Changes Needed

### Scene Model Updates
```prisma
model Scene {
  // Existing fields...

  // NEW: Compositing configuration
  backgroundAssetId  String?    // Link to BACKGROUND asset
  backgroundAsset    Asset?     @relation("SceneBackground", ...)
  compositeMode      String?    // "inpaint" | "overlay" | "generate" | "none"
  maskData           Json?      // Mask coordinates/shape for inpainting
  personPosition     Json?      // {x, y, scale, rotation} for overlay mode
}
```

### Asset Model Updates
```prisma
model Asset {
  // Existing fields...

  // NEW: Relations for compositing
  scenesAsBackground  Scene[]   @relation("SceneBackground")
}
```

---

## Timeline Estimate

| Phase | Description | Estimate |
|-------|-------------|----------|
| 1 | Asset UI separation (backgrounds vs headshots) | 1-2 hours |
| 2 | Scene configuration UI (select background + headshot) | 2-3 hours |
| 3 | Inpainting API integration | 2-3 hours |
| 4 | Mask generation (auto or manual) | 2-4 hours |
| 5 | Pipeline integration | 1-2 hours |
| 6 | Testing and refinement | 2-4 hours |
| **Total** | | **10-18 hours** |

---

## Final Objective Alignment

This plan directly supports the PRD's success criteria:

> "Generate a complete 90-120 second video with 6-8 scenes, each with **distinct environment**, wardrobe, and camera movement"

By enabling proper background compositing, each scene can have a truly distinct environment while maintaining identity consistency via the LoRA model.

---

## Open Questions

1. **Mask generation**: Auto-detect person placement area, or manual selection?
2. **Wardrobe handling**: Can inpainting change wardrobe, or must we generate new headshot first?
3. **Pose flexibility**: How much can we adjust pose during inpainting vs. needing new reference?
4. **Fallback**: If compositing fails, should we fall back to current headshot-only mode?

---

*Document created: January 10, 2026*
*Resume work: January 11, 2026 or later*
