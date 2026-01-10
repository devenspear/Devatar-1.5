# Changelog

All notable changes to Devatar are documented in this file.

## [1.5.11] - 2026-01-10

### Added

#### Asset Management Enhancements
- **Drag-and-Drop Upload** (`src/app/assets/page.tsx`)
  - Drop files directly onto upload area with visual overlay feedback
  - Automatic file type validation based on selected asset type
  - Multi-file upload support

- **Folder Organization System**
  - Folder tabs for organizing images (All, Conference Scenes, Studio Shots, Outdoor Scenes, Product Demos, Custom)
  - Create custom folders on-the-fly
  - Filter assets by folder category
  - `folder` field added to Asset model in Prisma schema

- **Scene Image Asset Type**
  - New `SCENE_IMAGE` type for externally created scene images
  - Designed for hybrid workflow: create scenes in Nano Banana/Midjourney, import for animation
  - Supports complete scene compositions with avatar included

### Changed
- Updated Asset API to accept `folder` parameter
- Renamed "Headshots" to "Reference Photos" in Assets UI for clarity

---

## [1.5.10] - 2026-01-10

### Fixed

#### LoRA URL Newline Bug
- Fixed 422 Unprocessable Entity error when testing LoRA
- Root cause: newline character (`\n`) appended to DEVEN_LORA_URL env var (from `echo` vs `printf`)
- Added `.trim()` safeguard to all LoRA URL usages:
  - `src/config/identity.ts`
  - `src/app/api/identities/[id]/test/route.ts`
- Force redeployed to pick up corrected environment variable

---

## [1.5.9] - 2026-01-10

### Fixed
- Improved error logging for Fal.ai generation failures
- Better extraction of error body, status, and details from API responses

---

## [1.5.8] - 2026-01-10

### Fixed
- Test LoRA button now visible when using system default LoRA (DEVEN_LORA_URL env var)
- Button visibility check now includes `systemStatus?.configuration.defaultLoraConfigured`

---

## [1.5.7] - 2026-01-10

### Fixed
- Test LoRA button visibility issue on Identities page
- Enhanced logging for LoRA test operations

---

## [1.5.6] - 2026-01-10

### Fixed
- Build error in scene creation modal (missing closing div tag)

---

## [1.5.5] - 2026-01-09

### Added

#### Scene Creation Modal Improvements
- Expanded modal to full width (max-w-6xl)
- Enlarged dialogue textarea from 4 rows to 10 rows
- Added "Create & Generate" button for one-click scene creation and generation
- Added cancel generation button in progress header
- Added escape key handler to close modal
- Added click-outside-to-close functionality

---

## [1.5.0] - 2026-01-09

### Added

#### Digital Twin Feature
- **Fal.ai Integration** (`src/lib/ai/fal.ts`)
  - Queue-based async image generation with LoRA support
  - LoRA URL validation and accessibility checks
  - Cost estimation utilities
  - Connection testing

- **Identity Management System**
  - New `IdentityProfile` database model for persistent identity storage
  - Identity configuration module (`src/config/identity.ts`)
  - Trigger word support for LoRA activation
  - Voice settings per identity

- **Identity API Endpoints** (`src/app/api/identities/`)
  - `GET /api/identities` - List all identity profiles
  - `POST /api/identities` - Create new identity
  - `GET /api/identities/[id]` - Get single identity
  - `PUT /api/identities/[id]` - Update identity
  - `DELETE /api/identities/[id]` - Delete identity
  - `POST /api/identities/[id]/test` - Test configuration
  - `POST /api/identities/[id]/set-default` - Set as default
  - `GET /api/identities/status` - Digital Twin system status

- **Identity Management UI** (`src/app/identities/page.tsx`)
  - Full CRUD interface for identity profiles
  - System status dashboard
  - Configuration testing with real-time feedback
  - Default identity selection

- **Feature-flagged Generation Pipeline**
  - `generationMode` field on Scene model ("standard" | "digital-twin")
  - Automatic fallback to standard mode if LoRA unavailable
  - New `IDENTITY_ANCHOR` logging step
  - Comprehensive logging for Digital Twin path

- **Documentation**
  - Digital Twin User Guide
  - Technical Architecture Document
  - Test Plan

### Changed

- Updated sidebar navigation with new "Identities" link
- Enhanced `generate-scene.ts` with conditional Digital Twin path
- Updated Prisma schema with IdentityProfile model and Scene relations
- Added `LORA_MODEL` to AssetType enum
- Added `IDENTITY_ANCHOR` to GenerationStep enum

### Infrastructure

- New GitHub repository: `Devatar-1.5`
- New Vercel project: `devatar-1-5`
- Added `vercel.json` for Next.js configuration
- Updated `package.json` to version 1.5.0

---

## [0.5.0] - 2026-01-08

### Added

- Video proxy endpoint for R2 signed URL handling
- Scene thumbnail display in project view
- Default headshot auto-selection from settings
- Comprehensive generation logging

### Fixed

- R2 signed URL 403 errors in video playback
- Thumbnail not displaying for completed scenes

---

## [0.4.0] - 2026-01-08

### Added

- Inngest-based background job processing
- Multi-step generation pipeline
- Kling AI video generation integration
- Sync Labs lip-sync integration

---

## [0.3.0] - 2026-01-07

### Added

- ElevenLabs voice synthesis
- PiAPI Flux image generation
- Basic project and scene management
- Asset upload system

---

## [0.2.0] - 2026-01-06

### Added

- Cloudflare R2 storage integration
- PostgreSQL database with Prisma
- Basic UI scaffolding

---

## [0.1.0] - 2026-01-05

### Added

- Initial project setup
- Next.js 16 with App Router
- Tailwind CSS styling
- Basic page structure

---

## Version Naming

- **Major** (X.0.0): Breaking changes or major new features
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes and minor improvements

---

*Maintained by Deven Spear*
