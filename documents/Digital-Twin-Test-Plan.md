# Digital Twin Feature Test Plan

## Overview

This document outlines the testing procedures for the Digital Twin feature implementation.

---

## Pre-Test Requirements

### Environment Configuration

- [ ] `FAL_KEY` environment variable set
- [ ] Database migrated with IdentityProfile model
- [ ] Inngest configured and running
- [ ] R2 storage accessible

### Test Data

- [ ] Sample LoRA URL (or mock)
- [ ] Test voice ID (optional)
- [ ] Test project with scenes

---

## Test Categories

### 1. API Endpoint Tests

#### 1.1 Identity CRUD Operations

| Test | Endpoint | Method | Expected |
|------|----------|--------|----------|
| List empty identities | `/api/identities` | GET | `{ identities: [], count: 0 }` |
| Create identity | `/api/identities` | POST | 201, identity object |
| Create duplicate name | `/api/identities` | POST | 400, error message |
| Create duplicate trigger | `/api/identities` | POST | 400, error message |
| Get identity | `/api/identities/[id]` | GET | Identity with scenes count |
| Get non-existent | `/api/identities/xxx` | GET | 404 |
| Update identity | `/api/identities/[id]` | PUT | Updated identity |
| Update with invalid scale | `/api/identities/[id]` | PUT | 400, validation error |
| Delete identity | `/api/identities/[id]` | DELETE | 200, success |
| Delete identity with scenes | `/api/identities/[id]` | DELETE | 400, cannot delete |

#### 1.2 Identity Management

| Test | Endpoint | Method | Expected |
|------|----------|--------|----------|
| Set default identity | `/api/identities/[id]/set-default` | POST | Previous default unset |
| Set inactive as default | `/api/identities/[id]/set-default` | POST | 400, error |
| Test identity (no LoRA) | `/api/identities/[id]/test` | POST | Partial status |
| Test identity (with LoRA) | `/api/identities/[id]/test` | POST | Validation results |
| Test with generation | `/api/identities/[id]/test` | POST | Image URL returned |

#### 1.3 System Status

| Test | Endpoint | Method | Expected |
|------|----------|--------|----------|
| Get status | `/api/identities/status` | GET | Configuration details |
| Status with FAL_KEY | `/api/identities/status` | GET | `falKeyConfigured: true` |
| Status without FAL_KEY | `/api/identities/status` | GET | `falKeyConfigured: false` |

---

### 2. UI Tests

#### 2.1 Identities Page

| Test | Action | Expected |
|------|--------|----------|
| Load page | Navigate to /identities | Page renders, shows status |
| Empty state | No identities | Shows "Create Identity" button |
| Create modal | Click "New Identity" | Modal opens |
| Form validation | Submit without name | Error shown |
| Create success | Fill form, submit | Modal closes, list updates |
| Edit modal | Click edit button | Modal opens with data |
| Update success | Modify and save | Changes reflected |
| Delete confirm | Click delete | Confirmation dialog |
| Delete success | Confirm delete | Removed from list |
| Set default | Click star | Star fills, others unfilled |
| Test button | Click test tube | Loading, then results |

#### 2.2 Navigation

| Test | Action | Expected |
|------|--------|----------|
| Sidebar link | Check sidebar | "Identities" with fingerprint icon |
| Active state | On /identities | Link highlighted |

---

### 3. Generation Pipeline Tests

#### 3.1 Mode Selection

| Test | Conditions | Expected Mode |
|------|------------|---------------|
| No mode set | scene.generationMode = null | "standard" |
| Standard explicitly | scene.generationMode = "standard" | "standard" |
| Digital Twin | scene.generationMode = "digital-twin" | "digital-twin" |

#### 3.2 Digital Twin Path

| Test | Conditions | Expected |
|------|------------|----------|
| No LoRA configured | loraUrl = null | Falls back to standard |
| Invalid LoRA URL | 404 response | Throws error, fails scene |
| Valid LoRA | 200 response | Generates with Fal.ai |
| Generation success | Fal.ai returns image | Image saved to R2 |
| Generation failure | Fal.ai error | Logged, scene fails |

#### 3.3 Standard Mode Path

| Test | Conditions | Expected |
|------|------------|----------|
| With headshot | scene.headshot set | Uses headshot directly |
| Default headshot | system setting set | Uses default headshot |
| No headshot | none available | Falls back to Flux |

---

### 4. Integration Tests

#### 4.1 Full Generation Flow

| Test | Steps | Expected |
|------|-------|----------|
| Digital Twin end-to-end | Create identity → Assign to scene → Generate | Video with identity-locked image |
| Standard with headshot | Upload headshot → Assign → Generate | Video with headshot |
| Fallback scenario | DT mode but no LoRA → Generate | Falls back to standard |

#### 4.2 Data Persistence

| Test | Action | Expected |
|------|--------|----------|
| Scene records mode | Generate with DT | scene.generationMode = "digital-twin" |
| Scene records model | Generate with DT | scene.imageModel = "fal-ai/flux-lora" |
| Identity usage tracked | Assign identity | scene.identityId set |

---

### 5. Error Handling Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| FAL_KEY missing | isDigitalTwinAvailable() = false |
| LoRA URL 403 | Validation fails, error logged |
| LoRA URL timeout | Validation fails, error logged |
| Fal.ai rate limit | Generation fails, can retry |
| Fal.ai invalid response | Error logged with payload |
| R2 upload failure | Generation step fails |

---

## Test Execution

### Manual Test Procedure

1. **Setup**
   - Start development server
   - Verify Inngest is running
   - Check environment variables

2. **Identity Management**
   - Go to /identities
   - Create a test identity
   - Verify it appears in list
   - Edit the identity
   - Test configuration (without LoRA)
   - Set as default
   - Delete (should succeed if no scenes)

3. **Generation Test**
   - Create a project
   - Add a scene with dialogue
   - Trigger generation
   - Monitor logs for mode selection
   - Verify video generates correctly

4. **Edge Cases**
   - Test with invalid LoRA URL
   - Test fallback behavior
   - Test duplicate name/trigger errors

---

## Validation Checklist

### Build Verification
- [ ] `pnpm run build` completes without errors
- [ ] No TypeScript errors
- [ ] All routes compile

### Runtime Verification
- [ ] API endpoints respond correctly
- [ ] UI pages render without errors
- [ ] Generation pipeline works
- [ ] Logs are recorded correctly

### Database Verification
- [ ] IdentityProfile table created
- [ ] Scene relations work
- [ ] Indexes created

---

## Known Limitations (Not Bugs)

1. **No LoRA file upload**: Users must host LoRA externally (R2, S3)
2. **No voice validation**: Voice ID format checked only
3. **No real-time generation preview**: Results after completion only
4. **Single default identity**: Only one can be default at a time

---

## Post-Test Cleanup

1. Delete test identities (if any)
2. Remove test projects
3. Clear test logs (optional)

---

*Test Plan Version: 1.0*
*Last Updated: January 9, 2026*
