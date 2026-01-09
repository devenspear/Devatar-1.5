This is a sophisticated "Hollywood-grade" stack. You have correctly identified the current "Holy Trinity" of AI consistency: **Flux** (Pixels), **Kling** (Motion), and **Sync Labs** (Lip Sync).

I have analyzed your screenshot (Devatar Dashboard). You are 90% there, but you have one critical architectural "gotcha" to solve regarding the LoRA. Your current settings (PiAPI for Flux) will likely block your goal because PiAPI typically uses a "closed menu" of LoRAs (Anime, Realism, etc.) and does not easily support **Custom URL Injection** for your specific face.

Here is the solution to your questions and the updated protocol.

### **1. Is LoRA training a one-time job?**

**YES.** You do not train a model every time you generate an image.1

- **The Workflow:** You spend about 20 minutes and ~$2.00 *once* to "compile" your face into a single file (approx. 200MB–300MB) called a .safetensors file.

- **The Hosting:** You upload this file to your **Cloudflare R2** bucket (which I see in your screenshot).2

  

- **The Usage:** Your web app simply sends the *public URL* of that file to the Image Generator API every time you request a scene.

### **2. Is LoRA training accessible through the Flux API?**

**Generally No.** Most generation APIs (like PiAPI) are for *Inference* (creating images), not *Training*.

- **The Fix:** You must use a dedicated "Trainer" (I recommend **Fal.ai's Model Playground**) for the one-time setup. Once you have the file, you verify it works, download it, and host it on R2. You never have to train again unless you want to update your look.

### **3. Can this be embedded in my Next.js App?**

**Absolutely.** Your current stack (**Next.js + Inngest + Cloudflare R2**) is the *ideal* architecture for this.

- **The Pivot:** You need to swap the **Image Generator** from PiAPI to **Fal.ai**. Fal allows you to pass a custom LoRA URL (loras: [{path: "https://r2..."}]) in the API payload. PiAPI does not.
- **The Flow:** Fal (Generates Identity Image) $\rightarrow$ PiAPI (Generates Kling Video) $\rightarrow$ Sync Labs (Lipsync).

### **Deliverable 1: The "Devatar" Protocol (Google Doc)**

*(Save this content into your Google Doc)*

# **Master Protocol: Digital Twin Automation (v3.0)**

Objective: Automated generation of high-fidelity human avatars with strict identity persistence.

Architecture: Hybrid Pipeline (Fal.ai for Identity $\to$ PiAPI for Motion).

## **Phase 1: The One-Time Training (Manual)**

*Do not build a training UI in your app. Do this once manually.*

1. **Data Collection:**

- Gather **15–20 high-quality photos** of yourself.
- **Requirements:** 5 Close-ups, 5 Waist-up, 5 Full-body. Varied lighting/backgrounds.
- **Filenames:** deven_01.jpg, deven_02.jpg...

1. **Training Execution:**

- **Platform:** Use **Fal.ai** (Model: flux-lora-fast-training) or **Replicate**.
- **Trigger Word:** TOK_DEVEN (Crucial: This "activates" your face).
- **Steps:** 1000–1500.

1. **Hosting:**

- Download the resulting .safetensors file.
- Upload it to your **Cloudflare R2** bucket.
- **Public Access:** Ensure the file has a public URL (e.g., https://r2.devatar.app/models/deven_v1.safetensors).

## **Phase 2: The Runtime Logic (Next.js Application)**

*The app orchestrates the following relay race:*

1. **Prompt Expansion (Nano Banana):**

- User Input: "Deven in a tuxedo."
- System injects forensic JSON + Trigger Word.
- Result: "TOK_DEVEN, a mature man wearing a tuxedo, 8k, cinematic lighting..."

1. **Identity Rendering (Fal.ai):**

- **Why Fal?** We must inject the custom R2 LoRA URL dynamically.
- **Model:** flux/dev (Do **not** use Schnell; it ignores LoRA details).
- **LoRA Scale:** 0.95 to 1.0.
- **Output:** A high-res PNG.

1. **Motion Synthesis (PiAPI - Kling):**

- **Input:** The PNG from Step 2.
- **Mode:** Pro (As selected in your dashboard).
- **Prompt:** "Static camera, subtle breathing, minimal head movement." (Stabilizes the face for lip sync).

1. **Lip Sync (Sync Labs):**

- **Input:** Video from Step 3 + Audio from ElevenLabs.
- **Model:** lipsync-2-pro.

### **Deliverable 2: Instructions for Claude Code (CLI)**

*(Copy and paste this entire block into your Claude Code terminal. It is customized for your Inngest/R2/PiAPI environment.)*

Markdown

\# ARCHITECTURE REFACTOR: HYBRID GENERATION PIPELINE

I am updating the "Devatar" application based on the latest architecture requirements.
Please act as the Lead Backend Architect.

\## 1. INFRASTRUCTURE & CREDENTIALS
We are moving to a ***\*Hybrid Provider\**** model to support Custom Identity LoRAs.
\*  ***\*Fal.ai:\**** Handles Image Generation (Flux Dev + Custom LoRA URL support).
\*  ***\*PiAPI:\**** Handles Video Generation (Kling Pro).
\*  ***\*Inngest:\**** Orchestrates the async queue (since Kling takes ~3 mins).
\*  ***\*Cloudflare R2:\**** Stores intermediate assets and the LoRA file.

***\*Action Required:\****

1. Update `src/lib/fal.ts` to use `fal-ai/flux-lora` endpoint.
2. Update `src/lib/piapi.ts` to handle the specific polling logic for Kling tasks.


\## 2. CONFIGURATION: IDENTITY PROFILE
Create a file `src/config/identity.ts` to store the LoRA configuration:
\```typescript
export const IDENTITY_CONFIG = {
 triggerWord: "TOK_DEVEN",
 // This URL comes from the user's R2 bucket after the one-time training
 loraUrl: process.env.DEVEN_LORA_URL || "https://[YOUR-R2-URL]/deven_v1.safetensors",
 // Must use DEV, not SCHNELL, for accurate LoRA adherence
 baseModel: "fal-ai/flux/dev", 
};



## **3. INNGEST FUNCTION: generate-scene.ts**

Refactor the Inngest function generateScene to follow this strict execution flow:

**Step A: Generate Identity Anchor (Fal.ai)**

- Call fal.subscribe (queue-based).

- **Endpoint:** fal-ai/flux-lora

- **Payload:**
  JSON
  {
   "prompt": IDENTITY_CONFIG.triggerWord + " " + step.prompt,
   "loras": [{ "path": IDENTITY_CONFIG.loraUrl, "scale": 1.0 }],
   "image_size": "landscape_16_9",
   "num_inference_steps": 28,
   "guidance_scale": 2.5
  }

  

- **Output:** Upload result to R2 (anchor_frame.png).

**Step B: Animate Anchor (PiAPI / Kling)**

- **Input:** R2 URL from Step A.
- **Endpoint:** PiAPI Kling Image-to-Video (/v1/task).
- **Payload:**

- model: "kling"
- task_type: "image2video"
- input: {
  "image_url": anchor_frame_url,
  "prompt": "Static camera, subtle breathing, high fidelity.",
  "mode": "pro",
  "duration": "5"
  }

- **Async Logic:** Use step.sleep("30s") loop to poll PiAPI task status until "completed".

**Step C: Sync Lips (Sync Labs)**

- **Input:** Video URL (Step B) + Audio URL (ElevenLabs).
- **Model:** lipsync-2-pro.
- **Output:** Final Video URL.

## **4. IMMEDIATE CODING TASKS**

1. Add FAL_KEY to the environment schema validation.
2. Modify the "Model Configuration" UI logic:

- If "Digital Twin" mode is active, override the user's "PiAPI Flux" setting and force **Fal.ai** (hidden override) to ensure the LoRA loads correctly.

1. Ensure the R2 upload service sets the correct Content-Type so APIs can read the files publicly.

\### Dashboard Settings Corrections (From Screenshot)

1. **Flux Model:** You have "Flux Schnell" selected. **Change this to "Flux Dev".** Schnell is a "distilled" model that often ignores LoRAs or makes them look waxy. For a Digital Twin, you need the density of Flux Dev.
2. **Voice:** You have "Multilingual v2" selected. Unless you need other languages, switch to **"Turbo v2.5"**. It has much lower latency and is cheaper for high-volume generation.



https://fal.ai/dashboard/keys

A0b87966-4b19-4221-b5a0-d9df077d5cf5:7b073c22995ae0098ab06b7d7359f60a