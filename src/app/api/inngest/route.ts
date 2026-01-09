import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateScene } from "@/inngest/functions";

// Explicitly pass signing key for authentication
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateScene],
  signingKey: process.env.INNGEST_SIGNING_KEY,
  signingKeyFallback: process.env.INNGEST_SIGNING_KEY_FALLBACK,
});
