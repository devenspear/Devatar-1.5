# Devatar — Product Requirements Document

## Document Metadata
- **Version:** 1.1
- **Date:** January 7, 2026
- **Author:** Claude (Anthropic) in collaboration with Deven Spear
- **Target:** Claude Code autonomous development
- **Deadline:** MVP functional within 72 hours (first commercial deliverable)
- **Changelog v1.1:** Added sound effects system, replaced Trigger.dev with Inngest, added comprehensive logging system, added version numbering standard, renamed to Devatar

---

## Executive Summary

### What We're Building
A purpose-built web application for generating cinematic AI avatar videos featuring Deven Spear's digital twin. The platform orchestrates multiple AI APIs (ElevenLabs, Kling AI, Sync Labs, NanoBanana/Gemini) into a single streamlined workflow designed around one user's specific creative process.

### Why We're Building It
Existing platforms (HeyGen, Synthesia) have proven frustrating despite 4+ days of effort:
- Confusing, non-intuitive UIs
- Inconsistent results
- Expensive token/credit systems
- Generic workflows that don't match the user's mental model

A custom-built tool designed around ONE workflow will be faster to use than learning platforms designed for millions of generic use cases.

### The Immediate Deliverable
A 90-120 second cinematic video ("Super Bowl commercial" quality) presenting Deven's 2026 disruption predictions. This video will:
- Feature 6-8 distinct scenes with unique environments and wardrobes
- Include full-body avatar with walking, gesturing, and cinematic camera movements
- Be delivered to a landing page for an email blast to 800 personal contacts
- Subsequently be posted to YouTube and shared on LinkedIn/Twitter

### Success Criteria
1. **Technical:** Generate a complete 90-120 second video with 6-8 scenes, each with distinct environment, wardrobe, and camera movement
2. **Quality:** 80% of viewers believe it's real footage (20% discerning eyes recognizing AI is acceptable)
3. **Timeline:** First complete video rendered within 72 hours of development start
4. **Workflow:** User can create a new scene in under 10 minutes of active work (excluding render time)

---

## Project Context & Constraints

### The User
- **Name:** Deven Spear
- **Role:** Solo creator, power user, technical proficiency high
- **Tools Proficiency:** Adobe Premiere (proficient), Claude Code (expert), Vercel (expert)
- **This is a single-user application** — no multi-tenancy, no authentication complexity

### Available Assets
| Asset | Status | Details |
|-------|--------|---------|
| Green screen footage | ✅ Ready | 9 minutes, 4K, 3 wardrobes, varied energy/topics/gestures, head-and-shoulders framing, usable audio |
| ElevenLabs Voice Clone | ✅ Ready | Professional clone, sounds "uncanny" accurate, voice ID available |
| Professional headshots | ✅ Ready | One wardrobe (dress shirt + sports coat), multiple angles, can shoot more if needed |
| Camera equipment | ✅ Available | Canon DSLRs, studio lighting, can capture additional reference material |

### Technical Constraints
| Constraint | Specification |
|------------|---------------|
| Hosting | Vercel (required — all 90+ projects use Vercel) |
| Database | Vercel Postgres (required — convenience/consistency) |
| Storage | Cloudflare R2 (account exists, already running transcript service) |
| Repository | GitHub (standard workflow) |
| Framework | Next.js 15 with App Router, TypeScript, Tailwind CSS |

### Budget Constraints
- API costs should be reasonable for a solo creator
- No enterprise-tier pricing requirements
- Estimated monthly budget: $100-250 for API usage

---

## User Stories

### Primary User Story
> As Deven, I want to create cinematic AI avatar videos by simply describing each scene (environment, wardrobe, movement, dialogue) so that I can produce professional content without fighting confusing platform UIs.

### Detailed User Stories

**US-1: Asset Setup (One-Time)**
> As a user, I want to upload my training assets (green screen video, headshots, voice clone ID) once and never think about them again, so that I can focus purely on creative production.

**US-2: Scene Creation**
> As a user, I want to describe a scene in natural language (environment, wardrobe, movement, camera, dialogue) and have the system generate a video clip, so that I can iterate quickly on creative ideas.

**US-3: Scene Preview & Iteration**
> As a user, I want to preview generated scenes, request tweaks, and re-render until satisfied, so that I can achieve the quality I need without starting from scratch.

**US-4: Project Organization**
> As a user, I want to organize scenes into projects and see them as visual thumbnails, so that I can manage multiple video productions.

**US-5: Final Assembly**
> As a user, I want to combine multiple approved scenes into a final video with automatic stitching, so that I don't have to manually edit in Premiere.

**US-6: Export & Download**
> As a user, I want to download the final MP4 in 1080p 16:9 format, so that I can upload it to YouTube and embed it on my landing page.

---

## Functional Requirements

### FR-1: Asset Management

#### FR-1.1: Training Video Upload
- Accept MP4/MOV video files up to 2GB
- Store in Cloudflare R2
- Extract and store metadata (duration, resolution, frame rate)
- Generate thumbnail for display
- Support single "active" training video (can be replaced)

#### FR-1.2: Reference Image Upload
- Accept JPG/PNG images up to 20MB each
- Support batch upload (multiple images at once)
- Store in Cloudflare R2
- Generate thumbnails for gallery display
- Tag images by type: "headshot", "full-body", "reference"

#### FR-1.3: Voice Clone Configuration
- Store ElevenLabs Voice ID
- Store optional voice name/label
- Test connection button (generates 5-second sample)
- Support single "active" voice (can be changed)

### FR-2: Scene Generation

#### FR-2.1: Scene Prompt Interface
The scene creation form must capture:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| Scene Name | Text | User-defined label | "Data Center Walk" |
| Environment | Textarea | Description of the setting | "Interior of a massive data center with rows of blue-lit server racks extending into the distance. Cool industrial lighting. Slight haze in the air." |
| Wardrobe | Textarea | What the avatar is wearing | "Dark navy suit, white dress shirt, no tie, collar open. Black oxford shoes." |
| Movement | Textarea | Physical actions and positioning | "Walking slowly from left to right through the server aisle. Looking at servers, occasionally touching them. Confident executive posture." |
| Camera | Textarea | Camera movement and framing | "Medium shot following subject. Slow tracking shot moving with him. Slight handheld feel for authenticity." |
| Dialogue | Textarea | The voiceover script | "The infrastructure of intelligence is being built right now. These data centers are the factories of the AI revolution..." |
| Duration | Select | Target clip length | 10s, 15s, 20s, 30s |
| Mood/Lighting | Select | Lighting preset | "Cinematic Cool", "Warm Studio", "Dramatic", "Natural" |
| Sound Effects | Textarea (optional) | Ambient audio description | "Soft server hum, cooling fans, distant footsteps" |

**Sound Effects Handling:**
- If user provides explicit description → use for audio generation prompt
- If left blank → system auto-infers from environment description
- Sound effects generated via ElevenLabs Sound Effects API or Kling 2.6 native audio
- Mixed with dialogue audio in final output

#### FR-2.2: Generation Pipeline
The system must execute these steps automatically upon "Generate" click:

1. **Audio Generation** (ElevenLabs API)
   - Send dialogue text to ElevenLabs
   - Use configured voice clone ID
   - Receive MP3/WAV audio file
   - Store in R2

2. **Character Image Generation** (NanoBanana/Gemini API)
   - Generate image of Deven in specified wardrobe
   - Use reference images for face consistency
   - Place in specified environment
   - Match specified pose/framing
   - Store in R2

3. **Video Generation** (Kling AI API)
   - Use character image as input
   - Apply movement description as motion prompt
   - Apply camera description as camera motion
   - Generate video clip at specified duration
   - Store in R2

4. **Lip-Sync Application** (Sync Labs API)
   - Input: generated video + generated audio
   - Apply lip-sync to match dialogue
   - Preserve original video quality
   - Output: final synced video clip
   - Store in R2

5. **Status Updates**
   - Update job status at each step
   - Calculate and display progress percentage
   - Store intermediate outputs for debugging
   - On failure: log error, allow retry from failed step

#### FR-2.3: Generation Status Display
- Show real-time progress: "Audio ✓ → Image ✓ → Video ⏳ → Lip-Sync ○"
- Display elapsed time and estimated remaining time
- Show error messages clearly if a step fails
- Provide "Retry" button for failed generations
- Allow user to navigate away (generation continues in background)

### FR-3: Scene Management

#### FR-3.1: Scene Library
- Display all scenes for current project as visual grid
- Each scene shows: thumbnail, name, duration, status, created date
- Click thumbnail to open preview modal
- Support rename, delete, duplicate actions
- Sort by: date created, name, duration
- Filter by: status (draft, generating, complete, failed)

#### FR-3.2: Scene Preview
- Modal or side panel with video player
- Standard controls: play, pause, scrub, volume
- Display scene metadata (prompt details)
- Actions: "Approve", "Regenerate", "Edit Prompt", "Delete"
- "Edit Prompt" opens form with existing values pre-filled

#### FR-3.3: Version History
- Keep previous renders of same scene (up to 5 versions)
- Display as horizontal strip below main preview
- Click to switch between versions
- "Restore" button to make old version current
- Versions auto-purge after project completion (user-triggered)

### FR-4: Project Management

#### FR-4.1: Project CRUD
- Create new project with name
- List all projects with thumbnail, name, scene count, last modified
- Open project to view its scenes
- Rename project
- Delete project (with confirmation — deletes all scenes and assets)
- Duplicate project (copies all scenes as drafts)

#### FR-4.2: Project Structure
Each project contains:
- Name
- Created/modified timestamps
- Collection of scenes
- Project-level settings (default resolution, aspect ratio)
- Final assembly (if generated)

### FR-5: Final Video Assembly

#### FR-5.1: Scene Ordering
- Drag-and-drop interface to order approved scenes
- Visual timeline showing scene thumbnails in sequence
- Display total duration as scenes are added
- Preview individual scenes inline

#### FR-5.2: Assembly Options
| Option | Type | Values |
|--------|------|--------|
| Transition Type | Select | Hard Cut (default), Dissolve (0.5s), Fade through Black |
| Output Resolution | Select | 1080p (default), 720p |
| Output Format | Select | MP4 H.264 (default), MOV |
| Include Audio | Checkbox | Yes (default) |

#### FR-5.3: Assembly Generation
- Concatenate scenes in specified order
- Apply selected transition between scenes
- Merge audio tracks
- Output single video file
- Store in R2
- Provide download link

#### FR-5.4: Title/End Cards (Nice to Have)
- Optional title card at start (text on black/branded background)
- Optional end card (CTA text, copyright notice)
- Simple text input, no complex editor needed

### FR-6: Export & Delivery

#### FR-6.1: Download
- Generate signed URL for final video
- Download button triggers browser download
- Support for individual scene downloads

#### FR-6.2: Direct Links (Nice to Have)
- Generate shareable link (expires after 7 days)
- Copy link to clipboard button

---

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DIGITAL TWIN STUDIO                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        NEXT.JS 15 (VERCEL)                              │ │
│  │                                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │   Pages     │  │   API       │  │   Server    │  │   Webhooks  │   │ │
│  │  │   (App      │  │   Routes    │  │   Actions   │  │   Handlers  │   │ │
│  │  │   Router)   │  │             │  │             │  │             │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│         │                    │                    │                          │
│         │                    │                    │                          │
│         ▼                    ▼                    ▼                          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                  │
│  │   Vercel    │      │ Cloudflare  │      │   Inngest   │                  │
│  │   Postgres  │      │     R2      │      │ (Job Queue) │                  │
│  │             │      │             │      │             │                  │
│  │  • Projects │      │  • Videos   │      │  Long-run   │                  │
│  │  • Scenes   │      │  • Audio    │      │  tasks      │                  │
│  │  • Jobs     │      │  • Images   │      │             │                  │
│  │  • Assets   │      │  • Exports  │      │             │                  │
│  │  • Logs     │      │             │      │             │                  │
│  └─────────────┘      └─────────────┘      └──────┬──────┘                  │
│                                                   │                          │
│                    ┌──────────────────────────────┼─────────────────────┐   │
│                    │          EXTERNAL APIs       │                     │   │
│                    │                              ▼                     │   │
│                    │  ┌───────────┐  ┌───────────┐  ┌───────────┐      │   │
│                    │  │ElevenLabs │  │ Kling AI  │  │Sync Labs  │      │   │
│                    │  │  (Voice)  │  │ (Video)   │  │(Lip-Sync) │      │   │
│                    │  └───────────┘  └───────────┘  └───────────┘      │   │
│                    │                                                    │   │
│                    │         ┌───────────┐  ┌───────────┐              │   │
│                    │         │NanoBanana │  │   Suno    │              │   │
│                    │         │  (Image)  │  │ (Music)   │              │   │
│                    │         │  Gemini   │  │ Optional  │              │   │
│                    │         └───────────┘  └───────────┘              │   │
│                    └────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 15 (App Router) | User standard, full-stack capability |
| Language | TypeScript | Type safety, better IDE support |
| Styling | Tailwind CSS | User standard, rapid UI development |
| Database | Vercel Postgres | User standard, zero config |
| ORM | Drizzle ORM | Type-safe, lightweight, Vercel-optimized |
| Storage | Cloudflare R2 | No egress fees, S3-compatible |
| Job Queue | Inngest | Serverless-native, long-running tasks, user already has account |
| Deployment | Vercel | User standard |
| Repository | GitHub | User standard |

### File/Folder Structure

```
/devatar
├── .env.local                    # API keys (gitignored)
├── .env.example                  # Template for required env vars
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
├── next.config.ts
│
├── /src
│   ├── /app                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Dashboard/home
│   │   ├── /projects
│   │   │   ├── page.tsx          # Project list
│   │   │   └── /[projectId]
│   │   │       ├── page.tsx      # Project detail (scene grid)
│   │   │       ├── /scenes
│   │   │       │   └── /[sceneId]
│   │   │       │       └── page.tsx  # Scene editor/preview
│   │   │       └── /assemble
│   │   │           └── page.tsx  # Final assembly UI
│   │   ├── /assets
│   │   │   └── page.tsx          # Asset library (training video, images)
│   │   ├── /settings
│   │   │   └── page.tsx          # Voice config, API status
│   │   └── /api
│   │       ├── /projects
│   │       │   └── route.ts      # CRUD
│   │       ├── /scenes
│   │       │   ├── route.ts      # CRUD
│   │       │   └── /generate
│   │       │       └── route.ts  # Trigger generation
│   │       ├── /assets
│   │       │   └── route.ts      # Upload handling
│   │       ├── /assemble
│   │       │   └── route.ts      # Final video assembly
│   │       └── /webhooks
│   │           ├── /elevenlabs
│   │           │   └── route.ts
│   │           ├── /kling
│   │           │   └── route.ts
│   │           └── /synclabs
│   │               └── route.ts
│   │
│   ├── /components
│   │   ├── /ui                   # Reusable UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── card.tsx
│   │   │   └── progress.tsx
│   │   ├── /projects
│   │   │   ├── project-card.tsx
│   │   │   ├── project-list.tsx
│   │   │   └── create-project-modal.tsx
│   │   ├── /scenes
│   │   │   ├── scene-card.tsx
│   │   │   ├── scene-grid.tsx
│   │   │   ├── scene-form.tsx
│   │   │   ├── scene-preview.tsx
│   │   │   └── generation-status.tsx
│   │   ├── /assets
│   │   │   ├── asset-uploader.tsx
│   │   │   ├── asset-gallery.tsx
│   │   │   └── voice-config.tsx
│   │   └── /assembly
│   │       ├── scene-timeline.tsx
│   │       ├── assembly-options.tsx
│   │       └── video-player.tsx
│   │
│   ├── /lib
│   │   ├── db.ts                 # Database client
│   │   ├── r2.ts                 # Cloudflare R2 client
│   │   ├── logger.ts             # Structured logging system
│   │   ├── /api
│   │   │   ├── elevenlabs.ts     # ElevenLabs API wrapper
│   │   │   ├── kling.ts          # Kling AI API wrapper
│   │   │   ├── synclabs.ts       # Sync Labs API wrapper
│   │   │   ├── nanobanana.ts     # Gemini/NanoBanana wrapper
│   │   │   └── suno.ts           # Suno API wrapper (optional)
│   │   └── /utils
│   │       ├── prompts.ts        # Prompt templates/builders
│   │       └── video.ts          # Video processing utilities
│   │
│   ├── /db
│   │   ├── schema.ts             # Drizzle schema definitions
│   │   └── migrations/           # Database migrations
│   │
│   └── /inngest
│       ├── client.ts             # Inngest client config
│       └── /functions
│           ├── generate-scene.ts # Main generation pipeline
│           ├── generate-audio.ts
│           ├── generate-image.ts
│           ├── generate-video.ts
│           ├── apply-lipsync.ts
│           ├── add-sound-effects.ts
│           └── assemble-video.ts
│
├── /public
│   └── /images                   # Static assets
│
└── /scripts
    └── setup-db.ts               # Database initialization
```

---

## Database Schema

### Entity Relationship

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   projects  │───┐   │   scenes    │───┐   │  versions   │
├─────────────┤   │   ├─────────────┤   │   ├─────────────┤
│ id          │   │   │ id          │   │   │ id          │
│ name        │   └──<│ project_id  │   └──<│ scene_id    │
│ created_at  │       │ name        │       │ video_url   │
│ updated_at  │       │ prompt_*    │       │ created_at  │
└─────────────┘       │ status      │       │ is_current  │
                      │ output_url  │       └─────────────┘
                      │ order       │
                      └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   assets    │       │    jobs     │       │    logs     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ type        │       │ scene_id    │       │ timestamp   │
│ url         │       │ type        │       │ level       │
│ metadata    │       │ status      │       │ context     │
│ created_at  │       │ progress    │       │ message     │
└─────────────┘       │ error       │       │ data        │
                      │ output_url  │       │ error       │
┌─────────────┐       │ created_at  │       │ scene_id    │
│  settings   │       │ updated_at  │       │ project_id  │
├─────────────┤       └─────────────┘       └─────────────┘
│ id          │
│ key         │
│ value       │
└─────────────┘
```

### Table Definitions (Drizzle Schema)

```typescript
// src/db/schema.ts

import { pgTable, uuid, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scenes = pgTable('scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
  
  // Prompt fields
  promptEnvironment: text('prompt_environment'),
  promptWardrobe: text('prompt_wardrobe'),
  promptMovement: text('prompt_movement'),
  promptCamera: text('prompt_camera'),
  promptDialogue: text('prompt_dialogue'),
  promptSoundEffects: text('prompt_sound_effects'), // Optional - auto-infers if blank
  targetDuration: integer('target_duration').default(15), // seconds
  moodLighting: text('mood_lighting').default('cinematic'),
  
  // Generation status
  status: text('status').notNull().default('draft'), // draft, generating, complete, failed
  
  // Output
  outputVideoUrl: text('output_video_url'),
  outputAudioUrl: text('output_audio_url'),
  outputImageUrl: text('output_image_url'),
  thumbnailUrl: text('thumbnail_url'),
  actualDuration: integer('actual_duration'), // seconds
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sceneVersions = pgTable('scene_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }).notNull(),
  videoUrl: text('video_url').notNull(),
  audioUrl: text('audio_url'),
  imageUrl: text('image_url'),
  thumbnailUrl: text('thumbnail_url'),
  isCurrent: boolean('is_current').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'training_video', 'headshot', 'reference', 'background'
  name: text('name'),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  metadata: jsonb('metadata'), // duration, resolution, etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'audio', 'image', 'video', 'lipsync', 'assemble'
  status: text('status').notNull().default('pending'), // pending, running, complete, failed
  progress: integer('progress').default(0), // 0-100
  error: text('error'),
  inputData: jsonb('input_data'),
  outputUrl: text('output_url'),
  externalJobId: text('external_job_id'), // ID from external API
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assemblies = pgTable('assemblies', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name'),
  sceneOrder: jsonb('scene_order'), // array of scene IDs in order
  transitionType: text('transition_type').default('hard_cut'),
  outputUrl: text('output_url'),
  status: text('status').default('draft'), // draft, generating, complete, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const logs = pgTable('logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  level: text('level').notNull(), // 'debug' | 'info' | 'warn' | 'error'
  context: text('context').notNull(), // 'elevenlabs', 'kling', 'synclabs', etc.
  message: text('message').notNull(),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  data: jsonb('data'), // Request/response payloads, metadata
  durationMs: integer('duration_ms'),
  error: jsonb('error'), // { message, stack, code }
});

// Indexes for logs table (add via migration)
// CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
// CREATE INDEX idx_logs_level ON logs(level);
// CREATE INDEX idx_logs_context ON logs(context);
// CREATE INDEX idx_logs_scene_id ON logs(scene_id);
```

---

## API Integration Specifications

### ElevenLabs (Voice Generation)

**Purpose:** Generate voiceover audio from dialogue text using Deven's voice clone.

**Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Required Environment Variable:** `ELEVENLABS_API_KEY`

**Implementation:**

```typescript
// src/lib/api/elevenlabs.ts

interface GenerateAudioParams {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

interface GenerateAudioResult {
  audioBuffer: Buffer;
  contentType: string;
}

export async function generateAudio(params: GenerateAudioParams): Promise<GenerateAudioResult> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${params.voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        model_id: params.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: params.stability || 0.5,
          similarity_boost: params.similarityBoost || 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return { audioBuffer, contentType: 'audio/mpeg' };
}
```

**Error Handling:**
- 401: Invalid API key → surface to user
- 429: Rate limit → retry with exponential backoff (3 attempts)
- 500: Server error → retry once, then fail

---

### Kling AI (Video Generation)

**Purpose:** Generate video from character image + motion/camera prompts.

**Access:** Via PiAPI or Kie.ai aggregator (more accessible than direct API)

**Endpoint (PiAPI):** `POST https://api.piapi.ai/v1/kling/generate`

**Required Environment Variable:** `KLING_API_KEY` (or `PIAPI_API_KEY`)

**Implementation:**

```typescript
// src/lib/api/kling.ts

interface GenerateVideoParams {
  imageUrl: string;
  prompt: string;          // Movement + scene description
  negativePrompt?: string;
  duration: 5 | 10;        // seconds
  aspectRatio: '16:9' | '9:16' | '1:1';
  mode: 'standard' | 'pro' | 'master';
}

interface GenerateVideoResult {
  taskId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  videoUrl?: string;
}

export async function generateVideo(params: GenerateVideoParams): Promise<{ taskId: string }> {
  const response = await fetch('https://api.piapi.ai/v1/kling/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KLING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kling-v2.1',
      mode: params.mode || 'pro',
      image_url: params.imageUrl,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || 'blurry, distorted, low quality',
      duration: params.duration,
      aspect_ratio: params.aspectRatio,
    }),
  });

  if (!response.ok) {
    throw new Error(`Kling API error: ${response.status}`);
  }

  const data = await response.json();
  return { taskId: data.task_id };
}

export async function checkVideoStatus(taskId: string): Promise<GenerateVideoResult> {
  const response = await fetch(`https://api.piapi.ai/v1/kling/task/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.KLING_API_KEY}`,
    },
  });

  const data = await response.json();
  return {
    taskId,
    status: data.status,
    videoUrl: data.output?.video_url,
  };
}
```

**Polling Strategy:**
- Poll every 10 seconds for up to 10 minutes
- Use Trigger.dev scheduled polling job
- Update job status in database on each poll

---

### Sync Labs (Lip-Sync)

**Purpose:** Apply lip-sync to generated video using generated audio.

**Endpoint:** `POST https://api.sync.so/v2/generate`

**Required Environment Variable:** `SYNCLABS_API_KEY`

**Implementation:**

```typescript
// src/lib/api/synclabs.ts

interface ApplyLipSyncParams {
  videoUrl: string;
  audioUrl: string;
  model?: 'lipsync-2' | 'lipsync-2-pro';
  synergize?: boolean;
}

interface LipSyncResult {
  jobId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  videoUrl?: string;
}

export async function applyLipSync(params: ApplyLipSyncParams): Promise<{ jobId: string }> {
  const response = await fetch('https://api.sync.so/v2/generate', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.SYNCLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model || 'lipsync-2',
      input: [
        { type: 'video', url: params.videoUrl },
        { type: 'audio', url: params.audioUrl },
      ],
      options: {
        output_format: 'mp4',
        synergize: params.synergize ?? true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Sync Labs API error: ${response.status}`);
  }

  const data = await response.json();
  return { jobId: data.id };
}

export async function checkLipSyncStatus(jobId: string): Promise<LipSyncResult> {
  const response = await fetch(`https://api.sync.so/v2/generate/${jobId}`, {
    headers: {
      'x-api-key': process.env.SYNCLABS_API_KEY!,
    },
  });

  const data = await response.json();
  return {
    jobId,
    status: data.status,
    videoUrl: data.output_url,
  };
}
```

---

### NanoBanana / Gemini (Image Generation)

**Purpose:** Generate character images with face consistency, different wardrobes, and environments.

**Endpoint:** Google Gemini API with Imagen/NanoBanana model

**Required Environment Variable:** `GOOGLE_AI_API_KEY`

**Implementation:**

```typescript
// src/lib/api/nanobanana.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

interface GenerateImageParams {
  characterDescription: string;  // Base description of Deven
  wardrobe: string;
  environment: string;
  pose: string;
  referenceImageBase64?: string; // For face consistency
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export async function generateCharacterImage(params: GenerateImageParams): Promise<{ imageUrl: string }> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  
  const prompt = `
    Generate a photorealistic image of a professional man in his 50s.
    
    APPEARANCE: ${params.characterDescription}
    
    WARDROBE: ${params.wardrobe}
    
    ENVIRONMENT: ${params.environment}
    
    POSE/FRAMING: ${params.pose}
    
    STYLE: Cinematic, photorealistic, professional lighting, sharp focus.
    The person should look natural and confident, as if captured in a high-end commercial or documentary.
  `;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['image', 'text'],
    },
  });

  // Extract image from response and upload to R2
  // Return R2 URL
  
  return { imageUrl: '...' }; // Implementation details TBD based on API response format
}
```

**Face Consistency Strategy:**
1. Upload 5-10 reference headshots of Deven
2. Include reference images in prompt or use image-to-image with face lock
3. Use consistent character description across all generations
4. Test and refine until face consistency is achieved

---

### Cloudflare R2 (Storage)

**Purpose:** Store all generated assets (audio, images, videos).

**Required Environment Variables:**
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=devatar
R2_PUBLIC_URL=https://your-r2-bucket.r2.dev
```

**Implementation:**

```typescript
// src/lib/r2.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}
```

**File Organization:**
```
/devatar
  /assets
    /training-videos
      {id}.mp4
    /headshots
      {id}.jpg
    /references
      {id}.jpg
  /projects
    /{projectId}
      /scenes
        /{sceneId}
          /audio
            {jobId}.mp3
            {jobId}_sfx.mp3     # Sound effects audio
          /images
            {jobId}.png
          /videos
            {jobId}.mp4
            {jobId}_lipsync.mp4
            {jobId}_final.mp4   # With sound effects mixed
          /thumbnails
            {jobId}.jpg
      /assemblies
        /{assemblyId}.mp4
```

---

### Sound Effects (ElevenLabs or Kling Native)

**Purpose:** Generate ambient audio and sound effects for scenes.

**Strategy:**
1. If user provides explicit `promptSoundEffects` → generate based on description
2. If blank → auto-infer from environment description
3. Mix sound effects with dialogue audio at appropriate levels

**Option A: ElevenLabs Sound Effects API**

```typescript
// src/lib/api/sound-effects.ts

interface GenerateSoundEffectsParams {
  description: string;        // "data center hum, cooling fans, distant footsteps"
  durationSeconds: number;
}

export async function generateSoundEffects(params: GenerateSoundEffectsParams): Promise<Buffer> {
  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: params.description,
      duration_seconds: params.durationSeconds,
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs Sound Effects API error: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
```

**Option B: Kling 2.6 Native Audio**

Kling 2.6 generates ambient audio automatically when `audio: true` is set. The system will:
1. Generate video with Kling (audio enabled)
2. Extract the ambient audio track
3. Mix with ElevenLabs dialogue
4. Apply lip-sync to final mixed audio

**Auto-Inference Logic:**

```typescript
// src/lib/utils/sound-effects.ts

const ENVIRONMENT_SOUND_MAP: Record<string, string> = {
  'data center': 'Soft humming of servers, cooling fans whirring, occasional electronic beeps',
  'office': 'Quiet office ambiance, distant keyboard typing, muffled conversations',
  'conference': 'Large crowd murmur, occasional applause, echo in large room',
  'stage': 'Audience applause, spotlight hum, footsteps on wooden stage',
  'outdoor': 'Wind blowing gently, birds chirping, distant traffic',
  'mountain': 'Strong wind, echo effect, distant eagle cry',
  'space': 'Deep space ambiance, subtle electronic hums, breathing apparatus',
  'factory': 'Industrial machinery, robotic arms moving, metallic sounds',
};

export function inferSoundEffects(environmentDescription: string): string {
  const lowerDesc = environmentDescription.toLowerCase();
  
  for (const [keyword, soundDesc] of Object.entries(ENVIRONMENT_SOUND_MAP)) {
    if (lowerDesc.includes(keyword)) {
      return soundDesc;
    }
  }
  
  // Default ambient
  return 'Subtle room tone, natural ambiance';
}
```

**Audio Mixing:**

```typescript
// Final audio mixing (in Inngest job or via ffmpeg)
// 1. Dialogue audio (ElevenLabs) at 100% volume
// 2. Sound effects at 20-30% volume (background)
// 3. Mixed into single stereo track
// 4. Lip-sync applied to mixed audio

// Using ffmpeg for mixing (if needed):
// ffmpeg -i dialogue.mp3 -i sfx.mp3 -filter_complex "[1]volume=0.25[sfx];[0][sfx]amix=inputs=2:duration=first" output.mp3
```

---

## Job Orchestration (Inngest)

### Why Inngest?
- Vercel functions timeout at 60 seconds (Pro) or 10 seconds (Hobby)
- Video generation takes 2-5 minutes per step
- Need reliable background job execution with retries
- **User already has Inngest account** from Disruption Radar project
- Free tier: 25,000 runs/month (plenty for this use case)

### Job Definitions

```typescript
// src/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'devatar' });
```

```typescript
// src/inngest/functions/generate-scene.ts

import { inngest } from '../client';

export const generateScene = inngest.createFunction(
  {
    id: 'generate-scene',
    retries: 3,
  },
  { event: 'scene/generate.requested' },
  async ({ event, step }) => {
    const { sceneId } = event.data;
    
    // 1. Update status to 'generating'
    await step.run('update-status-generating', async () => {
      await updateSceneStatus(sceneId, 'generating');
      await log('info', 'generation-pipeline', 'Starting scene generation', { sceneId });
    });
    
    // 2. Generate audio
    const audioUrl = await step.run('generate-audio', async () => {
      await updateJobProgress(sceneId, 'audio', 'running');
      const startTime = Date.now();
      const result = await generateAudioStep(sceneId);
      await log('info', 'elevenlabs', 'Audio generated', { 
        sceneId, 
        durationMs: Date.now() - startTime,
        audioUrl: result 
      });
      await updateJobProgress(sceneId, 'audio', 'complete', result);
      return result;
    });
    
    // 3. Generate character image
    const imageUrl = await step.run('generate-image', async () => {
      await updateJobProgress(sceneId, 'image', 'running');
      const startTime = Date.now();
      const result = await generateImageStep(sceneId);
      await log('info', 'nanobanana', 'Image generated', { 
        sceneId, 
        durationMs: Date.now() - startTime,
        imageUrl: result 
      });
      await updateJobProgress(sceneId, 'image', 'complete', result);
      return result;
    });
    
    // 4. Generate video
    const rawVideoUrl = await step.run('generate-video', async () => {
      await updateJobProgress(sceneId, 'video', 'running');
      const startTime = Date.now();
      const result = await generateVideoStep(sceneId, imageUrl);
      await log('info', 'kling', 'Video generated', { 
        sceneId, 
        durationMs: Date.now() - startTime,
        videoUrl: result 
      });
      await updateJobProgress(sceneId, 'video', 'complete', result);
      return result;
    });
    
    // 5. Apply lip-sync
    const finalVideoUrl = await step.run('apply-lipsync', async () => {
      await updateJobProgress(sceneId, 'lipsync', 'running');
      const startTime = Date.now();
      const result = await applyLipSyncStep(sceneId, rawVideoUrl, audioUrl);
      await log('info', 'synclabs', 'Lip-sync applied', { 
        sceneId, 
        durationMs: Date.now() - startTime,
        finalVideoUrl: result 
      });
      await updateJobProgress(sceneId, 'lipsync', 'complete', result);
      return result;
    });
    
    // 6. Generate sound effects (if specified or auto-infer)
    const finalWithAudioUrl = await step.run('add-sound-effects', async () => {
      await updateJobProgress(sceneId, 'sound', 'running');
      const result = await addSoundEffectsStep(sceneId, finalVideoUrl, audioUrl);
      await log('info', 'sound-effects', 'Sound effects added', { sceneId });
      await updateJobProgress(sceneId, 'sound', 'complete', result);
      return result;
    });
    
    // 7. Update scene with final output
    await step.run('finalize', async () => {
      await updateSceneStatus(sceneId, 'complete', finalWithAudioUrl);
      await log('info', 'generation-pipeline', 'Scene generation complete', { 
        sceneId, 
        finalVideoUrl: finalWithAudioUrl 
      });
    });
    
    return { success: true, videoUrl: finalWithAudioUrl };
  }
);
```

### Inngest Setup in Next.js

```typescript
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { generateScene } from '@/inngest/functions/generate-scene';
import { assembleVideo } from '@/inngest/functions/assemble-video';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateScene, assembleVideo],
});
```

### Progress Tracking

Each step updates the database:

```typescript
// jobs table entries for a single scene generation:
[
  { type: 'audio',   status: 'complete', progress: 100, output_url: '...' },
  { type: 'image',   status: 'complete', progress: 100, output_url: '...' },
  { type: 'video',   status: 'running',  progress: 45,  output_url: null  },
  { type: 'lipsync', status: 'pending',  progress: 0,   output_url: null  },
  { type: 'sound',   status: 'pending',  progress: 0,   output_url: null  },
]
```

Frontend polls `/api/scenes/[id]/status` every 5 seconds to update UI.

---

## Logging & Debugging System

### Why Comprehensive Logging?
- Enables rapid debugging when API calls fail
- Provides audit trail for every operation
- Shows exactly what happened and when
- Claude Code can reference logs to fix issues faster
- User can diagnose problems without developer intervention

### Log Entry Structure

```typescript
// src/lib/logger.ts

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  context: string;           // e.g., 'elevenlabs', 'kling', 'synclabs', 'generation-pipeline'
  message: string;
  sceneId?: string;
  projectId?: string;
  jobId?: string;
  data?: Record<string, any>; // API payloads, responses, metadata
  durationMs?: number;        // For timing operations
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export type LogLevel = LogEntry['level'];
export type LogContext = 
  | 'elevenlabs' 
  | 'kling' 
  | 'synclabs' 
  | 'nanobanana'
  | 'sound-effects'
  | 'generation-pipeline' 
  | 'assembly'
  | 'storage'
  | 'database'
  | 'api'
  | 'ui';
```

### Logger Implementation

```typescript
// src/lib/logger.ts

import { db } from './db';
import { logs } from '@/db/schema';

class Logger {
  private async persist(entry: Omit<LogEntry, 'id'>) {
    // Write to database
    await db.insert(logs).values({
      ...entry,
      data: entry.data ? JSON.stringify(entry.data) : null,
      error: entry.error ? JSON.stringify(entry.error) : null,
    });
    
    // Also output to console for Vercel logs
    const consoleMethod = entry.level === 'error' ? console.error 
      : entry.level === 'warn' ? console.warn 
      : console.log;
    
    consoleMethod(
      `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.context}]`,
      entry.message,
      entry.data ? JSON.stringify(entry.data, null, 2) : ''
    );
  }

  async debug(context: LogContext, message: string, data?: Record<string, any>) {
    await this.persist({ timestamp: new Date(), level: 'debug', context, message, data });
  }

  async info(context: LogContext, message: string, data?: Record<string, any>) {
    await this.persist({ timestamp: new Date(), level: 'info', context, message, data });
  }

  async warn(context: LogContext, message: string, data?: Record<string, any>) {
    await this.persist({ timestamp: new Date(), level: 'warn', context, message, data });
  }

  async error(context: LogContext, message: string, error?: Error, data?: Record<string, any>) {
    await this.persist({
      timestamp: new Date(),
      level: 'error',
      context,
      message,
      data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
    });
  }

  // Convenience method for timing operations
  async timed<T>(
    context: LogContext,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      await this.info(context, `${operation} completed`, {
        ...metadata,
        durationMs: Date.now() - startTime,
      });
      return result;
    } catch (error) {
      await this.error(context, `${operation} failed`, error as Error, {
        ...metadata,
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }
}

export const log = new Logger();
```

### What Gets Logged

| Operation | Level | Context | Data Captured |
|-----------|-------|---------|---------------|
| API request sent | debug | api-name | endpoint, payload size, headers |
| API response received | info | api-name | status code, response size, duration |
| API error | error | api-name | status, error message, full response, stack |
| Job started | info | generation-pipeline | sceneId, jobId, step name |
| Job step complete | info | generation-pipeline | sceneId, step, duration, output URL |
| Job failed | error | generation-pipeline | sceneId, step, error, stack trace |
| File uploaded | info | storage | key, size, content type, duration |
| File upload failed | error | storage | key, error message |
| Database query | debug | database | operation, table, duration |
| User action | info | ui | action type, entity IDs |

### Logs Database Table

```typescript
// Added to src/db/schema.ts

export const logs = pgTable('logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  level: text('level').notNull(), // 'debug' | 'info' | 'warn' | 'error'
  context: text('context').notNull(),
  message: text('message').notNull(),
  sceneId: uuid('scene_id'),
  projectId: uuid('project_id'),
  jobId: uuid('job_id'),
  data: jsonb('data'),
  durationMs: integer('duration_ms'),
  error: jsonb('error'),
});

// Index for fast querying
// CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
// CREATE INDEX idx_logs_level ON logs(level);
// CREATE INDEX idx_logs_context ON logs(context);
// CREATE INDEX idx_logs_scene_id ON logs(scene_id);
```

### Logs UI Page

Add `/logs` page to the application:

**Features:**
- Real-time log streaming (polling every 2 seconds)
- Filter by: level (debug/info/warn/error), context, scene, time range
- Search by message content
- Expandable rows to show full data/error details
- Export logs as JSON for debugging
- Auto-scroll with pause on hover
- Color-coded by level (red=error, yellow=warn, blue=info, gray=debug)

**Retention:**
- Keep logs for 7 days by default
- Option to purge logs older than N days
- Export before purge if needed

### API Wrapper Logging Pattern

Every external API call should follow this pattern:

```typescript
// Example: ElevenLabs with full logging

export async function generateAudio(params: GenerateAudioParams): Promise<GenerateAudioResult> {
  const requestId = crypto.randomUUID();
  
  await log.debug('elevenlabs', 'Sending text-to-speech request', {
    requestId,
    voiceId: params.voiceId,
    textLength: params.text.length,
    modelId: params.modelId,
  });

  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${params.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.text,
          model_id: params.modelId || 'eleven_multilingual_v2',
          voice_settings: {
            stability: params.stability || 0.5,
            similarity_boost: params.similarityBoost || 0.75,
          },
        }),
      }
    );

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      await log.error('elevenlabs', 'API request failed', new Error(errorText), {
        requestId,
        status: response.status,
        durationMs,
      });
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    await log.info('elevenlabs', 'Audio generated successfully', {
      requestId,
      status: response.status,
      audioSizeBytes: audioBuffer.length,
      durationMs,
    });

    return { audioBuffer, contentType: 'audio/mpeg' };
    
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('ElevenLabs API error'))) {
      // Network or other error not already logged
      await log.error('elevenlabs', 'Request failed', error as Error, {
        requestId,
        durationMs: Date.now() - startTime,
      });
    }
    throw error;
  }
}
```

---

## UI/UX Specifications

### Design Principles
1. **Minimal:** Only show what's needed for the current task
2. **Visual:** Thumbnails and previews over text lists
3. **Fast:** Instant feedback, optimistic updates
4. **Focused:** One primary action per screen

### Color Palette
```css
--background: #0a0a0a;      /* Near black */
--surface: #141414;         /* Card backgrounds */
--surface-hover: #1a1a1a;   /* Hover state */
--border: #262626;          /* Subtle borders */
--text-primary: #fafafa;    /* High contrast text */
--text-secondary: #a1a1a1;  /* Muted text */
--accent: #3b82f6;          /* Blue - primary actions */
--accent-hover: #2563eb;    /* Blue hover */
--success: #22c55e;         /* Green - complete */
--warning: #eab308;         /* Yellow - in progress */
--error: #ef4444;           /* Red - failed */
```

### Page Specifications

#### Dashboard (/)
- Header with app name "Devatar"
- Quick stats: total projects, scenes generated this month
- Recent projects (3-4 cards)
- "New Project" CTA button
- Sidebar navigation (collapsible on mobile)

#### Projects List (/projects)
- Grid of project cards
- Each card: thumbnail (first scene or placeholder), name, scene count, last modified
- Click card → project detail
- "New Project" button (top right)
- Search/filter (if >10 projects)

#### Project Detail (/projects/[id])
- Header: project name (editable), "Add Scene" button, "Assemble" button
- Scene grid (4 columns desktop, 2 mobile)
- Each scene card:
  - Thumbnail (if generated) or placeholder
  - Name
  - Duration
  - Status badge (draft/generating/complete/failed)
  - Click → scene detail/editor
- Drag to reorder scenes
- Empty state: "No scenes yet. Create your first scene."

#### Scene Editor (/projects/[id]/scenes/[sceneId])
- Two-column layout (desktop): Form left, Preview right
- Form fields (stacked):
  - Scene Name (text input)
  - Environment (textarea, 3 rows)
  - Wardrobe (textarea, 2 rows)
  - Movement (textarea, 3 rows)
  - Camera (textarea, 2 rows)
  - Dialogue (textarea, 6 rows, with character count)
  - Duration (select: 10s, 15s, 20s, 30s)
  - Mood/Lighting (select)
- Preview panel:
  - Video player (if generated)
  - Generation status (if in progress)
  - Placeholder (if not started)
- Action buttons:
  - "Generate" (primary) - starts generation
  - "Save Draft" - saves without generating
  - "Back to Project"
- During generation:
  - Progress bar with step indicators
  - "Audio ✓ → Image ✓ → Video ⏳ → Lip-Sync ○"
  - Elapsed time
  - Cannot edit form while generating

#### Assembly (/projects/[id]/assemble)
- Vertical list of approved scenes (draggable to reorder)
- Each row: thumbnail, name, duration
- Total duration display
- Options panel:
  - Transition type (select)
  - Title card text (optional)
  - End card text (optional)
- "Generate Final Video" button
- Preview player (when complete)
- Download button (when complete)

#### Assets (/assets)
- Tab navigation: Training Video | Headshots | Voice
- Training Video tab:
  - Current video preview
  - Upload/replace button
  - Metadata display (duration, resolution)
- Headshots tab:
  - Grid of uploaded images
  - Upload button (multi-select)
  - Delete on hover
- Voice tab:
  - ElevenLabs Voice ID input
  - "Test Voice" button (generates 5-second sample)
  - Status indicator (connected/not configured)

#### Settings (/settings)
- API Configuration section:
  - Status indicators for each API (green check / red X)
  - "Test Connection" buttons
- Not editable in UI (env vars only) - display only for diagnostics

#### Logs (/logs)
- Real-time log viewer with auto-refresh (every 2 seconds)
- Filter bar:
  - Level dropdown (All, Error, Warn, Info, Debug)
  - Context dropdown (All, ElevenLabs, Kling, Sync Labs, NanoBanana, Pipeline, Storage)
  - Time range selector (Last hour, Last 24h, Last 7 days, Custom)
  - Search input (message content)
- Log table:
  - Columns: Timestamp, Level (color-coded badge), Context, Message
  - Expandable rows showing full data/error JSON
  - Click scene/project ID to navigate
- Actions:
  - Export as JSON button
  - Clear filters button
  - Pause auto-refresh toggle
- Performance: Paginate (50 logs per page), lazy load older entries

### Component Library (Minimal)

Built with Tailwind, no external UI library needed:

- **Button:** Primary, secondary, ghost variants
- **Input:** Text, textarea with label
- **Select:** Native select with custom styling
- **Card:** Surface container with hover state
- **Modal:** Centered overlay for confirmations
- **Badge:** Status indicators (draft/generating/complete/failed)
- **Progress:** Linear progress bar with percentage
- **VideoPlayer:** HTML5 video with custom controls

---

## Development Phases

### Phase 0: Setup (2-4 hours)

**Objective:** Project scaffold with all infrastructure configured.

**Tasks:**
1. Create GitHub repository
2. Initialize Next.js 15 project with TypeScript, Tailwind
3. Configure Vercel project and deploy empty app
4. Set up Vercel Postgres database
5. Configure Cloudflare R2 bucket
6. Set up Trigger.dev project
7. Create `.env.example` with all required variables
8. Configure Drizzle ORM and create initial migration
9. Verify all connections work

**Deliverable:** Empty app deployed to Vercel with working database and storage.

**Test:** 
- Can insert/query database row
- Can upload/retrieve file from R2
- Trigger.dev test job runs successfully

---

### Phase 1: Core API Integration (4-6 hours)

**Objective:** All external APIs working in isolation.

**Tasks:**
1. Implement ElevenLabs wrapper (`src/lib/api/elevenlabs.ts`)
2. Implement Kling AI wrapper (`src/lib/api/kling.ts`)
3. Implement Sync Labs wrapper (`src/lib/api/synclabs.ts`)
4. Implement NanoBanana/Gemini wrapper (`src/lib/api/nanobanana.ts`)
5. Create test scripts for each API
6. Handle errors, retries, and edge cases

**Deliverable:** Four working API wrapper functions with tests.

**Test for each API:**
- ElevenLabs: Generate 10-second audio clip from text
- Kling: Generate 5-second video from test image
- Sync Labs: Apply lip-sync to test video+audio
- NanoBanana: Generate character image from prompt

---

### Phase 2: Storage & Database (2-3 hours)

**Objective:** Full CRUD operations for all entities.

**Tasks:**
1. Implement R2 upload/download functions
2. Create database schema (run migrations)
3. Implement project CRUD operations
4. Implement scene CRUD operations
5. Implement asset management functions
6. Implement job tracking functions

**Deliverable:** Working data layer.

**Test:**
- Create project → create scene → update scene → delete scene
- Upload file to R2 → retrieve URL → verify accessible

---

### Phase 3: Generation Pipeline (4-6 hours)

**Objective:** End-to-end scene generation working.

**Tasks:**
1. Implement Trigger.dev job for full pipeline
2. Wire up progress tracking to database
3. Create API endpoint to trigger generation
4. Create API endpoint to check status
5. Implement retry logic for each step
6. Test full pipeline end-to-end

**Deliverable:** Can trigger scene generation via API and receive completed video.

**Test:**
- POST to `/api/scenes/[id]/generate`
- Poll `/api/scenes/[id]/status` until complete
- Verify final video URL is accessible and plays correctly

---

### Phase 4: Basic UI (4-6 hours)

**Objective:** Functional (not pretty) UI for full workflow.

**Tasks:**
1. Dashboard page with project list
2. Project detail page with scene grid
3. Scene editor with form and preview
4. Assets page with upload functionality
5. Basic navigation
6. Generation status display

**Deliverable:** Usable UI for creating scenes.

**Test:**
- Navigate through full workflow
- Create project → add scene → fill form → generate → view result

---

### Phase 5: Assembly & Export (3-4 hours)

**Objective:** Combine scenes into final video.

**Tasks:**
1. Implement assembly UI (scene ordering)
2. Implement video concatenation (ffmpeg via API or service)
3. Create assembly Trigger.dev job
4. Download functionality

**Deliverable:** Can create multi-scene final video.

**Test:**
- Order 3 scenes → generate assembly → download MP4
- Verify transitions work correctly

---

### Phase 6: Polish & Edge Cases (2-4 hours)

**Objective:** Production-ready quality.

**Tasks:**
1. Error handling and user feedback
2. Loading states throughout UI
3. Responsive design fixes
4. Version history for scenes
5. Retry failed generations
6. Clean up and optimize

**Deliverable:** Stable, usable application.

**Test:**
- Simulate API failures → verify retry works
- Test on mobile viewport
- Generate 5+ scenes without issues

---

## Testing Requirements

### Unit Tests (Implement if Time Permits)
- API wrapper functions (mock external APIs)
- Database operations
- Utility functions

### Integration Tests (Required)
- Full generation pipeline with real APIs
- File upload/download flow
- Database CRUD operations

### Manual Testing Checklist

**Before First Real Video:**
- [ ] Can upload training video
- [ ] Can upload headshots
- [ ] Can configure voice ID
- [ ] Can create project
- [ ] Can create scene with all fields
- [ ] Can trigger generation
- [ ] Generation completes without error
- [ ] Generated video plays correctly
- [ ] Lip-sync matches audio
- [ ] Can regenerate scene
- [ ] Can create multiple scenes
- [ ] Can reorder scenes
- [ ] Can assemble final video
- [ ] Can download final video
- [ ] Final video has correct transitions

---

## Environment Variables

```env
# .env.example

# Database (Vercel Postgres)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=devatar
R2_PUBLIC_URL=

# APIs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
KLING_API_KEY=
SYNCLABS_API_KEY=
GOOGLE_AI_API_KEY=

# Job Queue (Inngest)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Success Criteria (Acceptance Test)

### MVP Definition of Done

The system is ready for first video production when:

1. **Asset Setup:**
   - [x] Training video uploaded and accessible
   - [x] At least 5 headshots uploaded
   - [x] Voice clone ID configured and tested

2. **Scene Generation:**
   - [x] Can create scene with: environment, wardrobe, movement, camera, dialogue
   - [x] Generation completes in <10 minutes
   - [x] Output video has correct lip-sync
   - [x] Output video has reasonable quality (not obviously broken)

3. **Project Management:**
   - [x] Can create/name projects
   - [x] Can view all scenes in a project
   - [x] Can reorder scenes
   - [x] Can delete scenes

4. **Final Output:**
   - [x] Can assemble multiple scenes into one video
   - [x] Transitions work correctly
   - [x] Can download final MP4
   - [x] Video plays on YouTube (after manual upload)

---

## Future Considerations (Out of Scope for MVP)

### Version 2: Optimist Farm Integration
- Switch from photorealistic human to cartoon animal characters
- 12 character presets (farm animals)
- Different art style generation
- Storybook layout output option

### Potential Enhancements
- Music generation via Suno API
- Ambient sound effects via API
- EQ/reverb adjustments per scene
- Direct YouTube upload
- Direct social media posting
- Multiple voice clones
- Batch scene generation
- AI-assisted script writing
- Scene templates/presets

---

## Appendix A: Prompt Templates

### Character Image Generation Prompt Template

```
Generate a photorealistic cinematic image.

SUBJECT: Professional man, approximately 55 years old. Distinguished appearance with salt-and-pepper hair. Confident, intelligent expression. This is Deven Spear, a technology futurist and entrepreneur.

WARDROBE: {wardrobe_description}

ENVIRONMENT: {environment_description}

POSE AND FRAMING: {pose_description}

CAMERA: {camera_description}

LIGHTING: {lighting_preset}

STYLE: Ultra-realistic, cinematic quality. Sharp focus on subject. Depth of field creating separation from background. Professional color grading. The image should look like a frame from a high-budget documentary or commercial.

AVOID: Cartoonish appearance, obvious AI artifacts, distorted proportions, unnatural poses, plastic-looking skin.
```

### Video Generation Prompt Template

```
Create a cinematic video sequence.

SUBJECT ACTION: {movement_description}

CAMERA MOVEMENT: {camera_description}

ENVIRONMENT: {environment_description}

DURATION: {duration} seconds

STYLE: Smooth, professional motion. Natural physics. Cinematic quality matching high-end commercial production.

MOTION: Fluid, continuous movement. No jarring transitions. Natural human movement patterns.
```

---

## Appendix B: Claude Code Instructions

### Development Methodology

Claude Code should follow this workflow:

1. **Planning Mode First**
   - Read entire PRD before writing code
   - Create implementation plan with specific file changes
   - Identify dependencies and order of operations
   - Ask clarifying questions if requirements are ambiguous

2. **Incremental Development**
   - Implement one phase at a time
   - Test each phase before moving to next
   - Commit frequently with descriptive messages

3. **Self-Auditing**
   - After each file, review for:
     - TypeScript errors
     - Missing imports
     - Incomplete implementations
     - Edge cases not handled
   - Run `npm run build` frequently to catch errors early

4. **Self-Testing**
   - Create test scripts for each API integration
   - Verify database operations manually
   - Test UI flows end-to-end
   - Document any issues found

5. **Error Handling**
   - Every API call must have try/catch
   - Every database operation must handle failures
   - User should see meaningful error messages
   - Failed operations should be retryable

### Version Numbering Standard

**This is a required standard for all projects:**

1. **Version format:** MAJOR.MINOR.PATCH (e.g., 1.0.0, 1.2.3)
   - MAJOR: Breaking changes or major feature releases
   - MINOR: New features, backward compatible
   - PATCH: Bug fixes, small improvements

2. **Version location:**
   - `package.json` version field (source of truth)
   - Footer of every page: "Devatar v1.0.0"
   - Visible in both development and production

3. **Version update triggers:**
   - Increment PATCH on every deployment with bug fixes
   - Increment MINOR on new feature additions
   - Increment MAJOR on architectural changes

4. **Implementation:**
```typescript
// src/components/ui/footer.tsx
import packageJson from '../../../package.json';

export function Footer() {
  return (
    <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
      Devatar v{packageJson.version}
    </footer>
  );
}
```

5. **Git tags:** Create git tag for each version bump
```bash
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

### Key Implementation Notes

1. **Don't over-engineer:** This is a single-user app. Skip auth complexity, skip multi-tenancy, skip premature optimization.

2. **Fail fast during development:** Use aggressive error logging. Surface all errors to console. Make debugging easy.

3. **API keys are not in code:** All secrets in `.env.local`. Never commit secrets.

4. **Long operations need feedback:** Any operation >2 seconds needs a loading indicator. Any operation >30 seconds needs progress updates.

5. **Video files are large:** Use streaming uploads/downloads. Don't load full videos into memory.

6. **External APIs are unreliable:** Always implement retry logic. Always handle timeouts. Always save progress.

---

## Appendix C: Quick Reference

### API Documentation Links
- ElevenLabs: https://docs.elevenlabs.io/api-reference
- Kling AI (PiAPI): https://piapi.ai/docs/kling
- Sync Labs: https://docs.sync.so
- Google Gemini: https://ai.google.dev/gemini-api/docs
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Inngest: https://www.inngest.com/docs
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
- Drizzle ORM: https://orm.drizzle.team/docs/overview

### Command Reference
```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run linter

# Database
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio

# Inngest
npx inngest-cli dev  # Start Inngest dev server (runs alongside next dev)
```

---

**END OF DOCUMENT**

*This PRD is designed to be handed directly to Claude Code for autonomous implementation. All requirements are specific, testable, and ordered by priority. The 72-hour deadline is achievable by completing Phases 0-4, with Phase 5-6 as stretch goals.*
