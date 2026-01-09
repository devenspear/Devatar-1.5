# Devatar 1.5

AI Avatar Video Generation Platform with Digital Twin Technology

## Overview

Devatar is a Next.js-based platform for generating professional AI avatar videos. Version 1.5 introduces **Digital Twin** technology, enabling identity-locked video generation using custom-trained LoRA models for perfect facial consistency across all generated content.

## Live Demo

- **Production**: https://devatar-1-5.vercel.app
- **Original v1.0**: https://devatar.vercel.app

## Features

### Core Features
- **Scene-based Video Generation**: Create multi-scene video projects with dialogue, environments, and camera settings
- **Voice Synthesis**: ElevenLabs integration for natural text-to-speech with custom voice clones
- **Video Generation**: Kling AI-powered video creation from images
- **Lip-sync**: Sync Labs integration for realistic speech synchronization
- **Asset Management**: Upload and manage headshots, backgrounds, and audio files
- **Cloud Storage**: Cloudflare R2 for scalable media storage

### Digital Twin (v1.5)
- **LoRA-based Identity**: Train and use custom LoRA models for consistent facial identity
- **Fal.ai Integration**: High-quality image generation with custom LoRA URL injection
- **Identity Profiles**: Database-backed management of multiple avatar identities
- **Feature-flagged**: Safe rollback with `generationMode` switching between Standard and Digital Twin
- **Automatic Fallback**: Gracefully falls back to Standard mode if LoRA unavailable

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Next.js API Routes, Inngest (background jobs) |
| Database | PostgreSQL (Neon/Vercel Postgres), Prisma ORM |
| Storage | Cloudflare R2 |
| AI Services | ElevenLabs, Fal.ai, Kling AI (PiAPI), Sync Labs |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database
- API keys for: ElevenLabs, Kling/PiAPI, Sync Labs, Cloudflare R2
- (For Digital Twin) Fal.ai API key

### Installation

```bash
# Clone the repository
git clone https://github.com/devenspear/Devatar-1.5.git
cd Devatar-1.5

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Push database schema
npx prisma db push

# Start development server
pnpm dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=devatar
R2_PUBLIC_URL=

# AI Services
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=       # Optional: Default voice clone ID
KLING_ACCESS_KEY=
KLING_SECRET_KEY=
SYNCLABS_API_KEY=
PIAPI_FLUX_KEY=

# Digital Twin (v1.5)
FAL_KEY=                   # Required for Digital Twin mode
DEVEN_LORA_URL=            # Optional: Default LoRA safetensors URL

# Background Jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── identities/    # Identity management (v1.5)
│   │   ├── projects/      # Project CRUD
│   │   ├── scenes/        # Scene management
│   │   └── assets/        # Asset uploads
│   ├── identities/        # Identity UI page (v1.5)
│   ├── projects/          # Projects pages
│   ├── assets/            # Assets page
│   ├── settings/          # Settings page
│   └── logs/              # Generation logs
├── components/            # React components
├── config/
│   └── identity.ts        # Identity configuration (v1.5)
├── lib/
│   ├── ai/               # AI service integrations
│   │   ├── elevenlabs.ts # Voice synthesis
│   │   ├── fal.ts        # Fal.ai + LoRA (v1.5)
│   │   ├── kling.ts      # Video generation
│   │   └── synclabs.ts   # Lip-sync
│   └── storage/
│       └── r2.ts         # Cloudflare R2
├── inngest/
│   └── functions/
│       └── generate-scene.ts  # Main generation pipeline
└── prisma/
    └── schema.prisma     # Database schema
```

## Generation Pipeline

```
1. Audio Generation (ElevenLabs)
   └── Text → Speech with custom voice clone

2. Image Generation (Mode-dependent)
   ├── Standard Mode: Use uploaded headshot
   └── Digital Twin: Fal.ai + LoRA → Identity-locked image

3. Video Generation (Kling AI)
   └── Image + prompt → Animated video

4. Lip-sync (Sync Labs)
   └── Video + Audio → Synchronized speech

5. Upload (R2)
   └── Final video stored and ready for playback
```

## Documentation

See the `/documents` folder for detailed documentation:

- [Digital Twin User Guide](documents/Digital-Twin-User-Guide.md) - Setup and usage instructions
- [Digital Twin Architecture](documents/Digital-Twin-Architecture.md) - Technical implementation details
- [Digital Twin Test Plan](documents/Digital-Twin-Test-Plan.md) - Testing procedures
- [Product Requirements](documents/Devatar-PRD.md) - Full PRD document

## API Reference

### Identity Endpoints (v1.5)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/identities` | GET | List all identity profiles |
| `/api/identities` | POST | Create new identity |
| `/api/identities/[id]` | GET | Get single identity |
| `/api/identities/[id]` | PUT | Update identity |
| `/api/identities/[id]` | DELETE | Delete identity |
| `/api/identities/[id]/test` | POST | Test configuration |
| `/api/identities/[id]/set-default` | POST | Set as default |
| `/api/identities/status` | GET | System status |

### Scene Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scenes` | GET/POST | List/create scenes |
| `/api/scenes/[id]` | GET/PUT/DELETE | Scene CRUD |
| `/api/scenes/[id]/generate` | POST | Trigger generation |
| `/api/scenes/[id]/status` | GET | Check status |

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy

The project includes `vercel.json` with proper Next.js configuration.

### Database Migration

```bash
# Development
npx prisma db push

# Production (if using migrations)
npx prisma migrate deploy
```

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## License

Private - All rights reserved

## Author

Deven Spear

---

*Built with Next.js, powered by AI*
