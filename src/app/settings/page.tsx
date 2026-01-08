"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface APIStatus {
  elevenlabs: boolean | null;
  gemini: boolean | null;
  kling: boolean | null;
  synclabs: boolean | null;
  r2: boolean | null;
}

export default function SettingsPage() {
  const [voiceId, setVoiceId] = useState("");
  const [apiStatus, setApiStatus] = useState<APIStatus>({
    elevenlabs: null,
    gemini: null,
    kling: null,
    synclabs: null,
    r2: null,
  });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load saved voice ID from localStorage
    const savedVoiceId = localStorage.getItem("devatar_voice_id");
    if (savedVoiceId) {
      setVoiceId(savedVoiceId);
    }
  }, []);

  function saveVoiceId() {
    localStorage.setItem("devatar_voice_id", voiceId);
    alert("Voice ID saved!");
  }

  async function testAPIs() {
    setTesting(true);
    setApiStatus({
      elevenlabs: null,
      gemini: null,
      kling: null,
      synclabs: null,
      r2: null,
    });

    // Test each API
    try {
      const res = await fetch("/api/test-apis");
      const data = await res.json();
      setApiStatus(data);
    } catch (error) {
      console.error("Error testing APIs:", error);
    } finally {
      setTesting(false);
    }
  }

  const StatusIcon = ({ status }: { status: boolean | null }) => {
    if (status === null) {
      return <span className="text-muted-foreground">—</span>;
    }
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Voice Configuration */}
        <section className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Voice Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                ElevenLabs Voice ID
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Enter your cloned voice ID from ElevenLabs
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="e.g., pNInz6obpgDQGcFmaJgB"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={saveVoiceId}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* API Status */}
        <section className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">API Status</h2>
            <button
              onClick={testAPIs}
              disabled={testing}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </span>
              ) : (
                "Test Connections"
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">ElevenLabs</p>
                <p className="text-sm text-muted-foreground">Voice generation</p>
              </div>
              <StatusIcon status={apiStatus.elevenlabs} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">Google Gemini</p>
                <p className="text-sm text-muted-foreground">Image generation</p>
              </div>
              <StatusIcon status={apiStatus.gemini} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">Kling AI (PiAPI)</p>
                <p className="text-sm text-muted-foreground">Video generation</p>
              </div>
              <StatusIcon status={apiStatus.kling} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">Sync Labs</p>
                <p className="text-sm text-muted-foreground">Lip-sync</p>
              </div>
              <StatusIcon status={apiStatus.synclabs} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Cloudflare R2</p>
                <p className="text-sm text-muted-foreground">File storage</p>
              </div>
              <StatusIcon status={apiStatus.r2} />
            </div>
          </div>
        </section>

        {/* Environment Variables */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Required Environment Variables</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These must be configured in your .env.local file:
          </p>
          <pre className="bg-background p-4 rounded-lg text-sm overflow-x-auto">
            {`DATABASE_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=devatar
ELEVENLABS_API_KEY=
GOOGLE_API_KEY=
KLING_ACCESS_KEY=
SYNCLABS_API_KEY=
INNGEST_EVENT_KEY=`}
          </pre>
        </section>
      </main>
    </div>
  );
}
