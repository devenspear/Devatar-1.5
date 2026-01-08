"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Info, ExternalLink } from "lucide-react";

interface APIStatus {
  elevenlabs: boolean | null;
  gemini: boolean | null;
  kling: boolean | null;
  synclabs: boolean | null;
  r2: boolean | null;
}

// Model configurations for each API
const MODEL_INFO = {
  elevenlabs: {
    provider: "ElevenLabs",
    purpose: "Voice/Speech Generation",
    models: [
      { id: "eleven_multilingual_v2", name: "Multilingual v2", description: "Best quality, supports 29 languages", default: true },
      { id: "eleven_turbo_v2_5", name: "Turbo v2.5", description: "Fastest, English optimized" },
      { id: "eleven_monolingual_v1", name: "Monolingual v1", description: "Legacy English model" },
    ],
    docsUrl: "https://elevenlabs.io/docs/api-reference/text-to-speech",
  },
  piapi_flux: {
    provider: "PiAPI (Flux)",
    purpose: "Image Generation",
    models: [
      { id: "Qubico/flux1-schnell", name: "Flux Schnell", description: "Fast, high-quality images (4 steps)", default: true },
      { id: "Qubico/flux1-dev", name: "Flux Dev", description: "Higher quality, slower (20+ steps)" },
    ],
    docsUrl: "https://piapi.ai/docs/flux-api",
  },
  kling: {
    provider: "PiAPI (Kling AI)",
    purpose: "Video Generation",
    models: [
      { id: "kling-pro", name: "Kling Pro", description: "Best quality, 5-10s videos", default: true },
      { id: "kling-std", name: "Kling Standard", description: "Faster, good quality" },
    ],
    modes: [
      { id: "pro", name: "Pro Mode", description: "Higher quality output" },
      { id: "std", name: "Standard Mode", description: "Faster generation" },
    ],
    durations: [5, 10],
    docsUrl: "https://piapi.ai/docs/kling-api",
  },
  synclabs: {
    provider: "Sync Labs",
    purpose: "Lip-sync Generation",
    models: [
      { id: "lipsync-2", name: "Lipsync 2", description: "Standard quality lip-sync", default: true },
      { id: "lipsync-2-pro", name: "Lipsync 2 Pro", description: "Premium quality, better accuracy" },
    ],
    docsUrl: "https://docs.synclabs.so",
  },
};

export default function SettingsPage() {
  const [voiceId, setVoiceId] = useState("");
  const [selectedModels, setSelectedModels] = useState({
    elevenlabs: "eleven_multilingual_v2",
    piapi_flux: "Qubico/flux1-schnell",
    kling: "kling-pro",
    kling_mode: "pro",
    kling_duration: 5,
    synclabs: "lipsync-2",
  });
  const [apiStatus, setApiStatus] = useState<APIStatus>({
    elevenlabs: null,
    gemini: null,
    kling: null,
    synclabs: null,
    r2: null,
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedVoiceId = localStorage.getItem("devatar_voice_id");
    if (savedVoiceId) {
      setVoiceId(savedVoiceId);
    }

    const savedModels = localStorage.getItem("devatar_model_settings");
    if (savedModels) {
      setSelectedModels(JSON.parse(savedModels));
    }
  }, []);

  function saveSettings() {
    setSaving(true);
    localStorage.setItem("devatar_voice_id", voiceId);
    localStorage.setItem("devatar_model_settings", JSON.stringify(selectedModels));
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved!");
    }, 500);
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

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Voice Configuration */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Voice Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                ElevenLabs Voice ID
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Enter your cloned voice ID from ElevenLabs, or use a default voice
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="e.g., 21m00Tcm4TlvDq8ikWAM (Rachel)"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Default: Rachel (21m00Tcm4TlvDq8ikWAM)
              </p>
            </div>
          </div>
        </section>

        {/* Model Selection */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Model Configuration</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure which AI models to use for each generation step. These settings will be tracked with each scene.
          </p>

          {/* ElevenLabs Models */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{MODEL_INFO.elevenlabs.provider}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {MODEL_INFO.elevenlabs.purpose}
                </span>
              </div>
              <a
                href={MODEL_INFO.elevenlabs.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {MODEL_INFO.elevenlabs.models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModels.elevenlabs === model.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="elevenlabs"
                    value={model.id}
                    checked={selectedModels.elevenlabs === model.id}
                    onChange={(e) =>
                      setSelectedModels({ ...selectedModels, elevenlabs: e.target.value })
                    }
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      {model.default && (
                        <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedModels.elevenlabs === model.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* PiAPI Flux Models */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{MODEL_INFO.piapi_flux.provider}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {MODEL_INFO.piapi_flux.purpose}
                </span>
              </div>
              <a
                href={MODEL_INFO.piapi_flux.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {MODEL_INFO.piapi_flux.models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModels.piapi_flux === model.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="piapi_flux"
                    value={model.id}
                    checked={selectedModels.piapi_flux === model.id}
                    onChange={(e) =>
                      setSelectedModels({ ...selectedModels, piapi_flux: e.target.value })
                    }
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      {model.default && (
                        <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedModels.piapi_flux === model.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Kling AI Models */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{MODEL_INFO.kling.provider}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {MODEL_INFO.kling.purpose}
                </span>
              </div>
              <a
                href={MODEL_INFO.kling.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Generation Mode</label>
                <div className="space-y-2">
                  {MODEL_INFO.kling.modes?.map((mode) => (
                    <label
                      key={mode.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedModels.kling_mode === mode.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="kling_mode"
                        value={mode.id}
                        checked={selectedModels.kling_mode === mode.id}
                        onChange={(e) =>
                          setSelectedModels({ ...selectedModels, kling_mode: e.target.value })
                        }
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{mode.name}</span>
                        <p className="text-sm text-muted-foreground">{mode.description}</p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          selectedModels.kling_mode === mode.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Video Duration</label>
                <div className="space-y-2">
                  {MODEL_INFO.kling.durations.map((duration) => (
                    <label
                      key={duration}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedModels.kling_duration === duration
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="kling_duration"
                        value={duration}
                        checked={selectedModels.kling_duration === duration}
                        onChange={(e) =>
                          setSelectedModels({
                            ...selectedModels,
                            kling_duration: parseInt(e.target.value),
                          })
                        }
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{duration} seconds</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          selectedModels.kling_duration === duration
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sync Labs Models */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{MODEL_INFO.synclabs.provider}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {MODEL_INFO.synclabs.purpose}
                </span>
              </div>
              <a
                href={MODEL_INFO.synclabs.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {MODEL_INFO.synclabs.models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModels.synclabs === model.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="synclabs"
                    value={model.id}
                    checked={selectedModels.synclabs === model.id}
                    onChange={(e) =>
                      setSelectedModels({ ...selectedModels, synclabs: e.target.value })
                    }
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      {model.default && (
                        <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedModels.synclabs === model.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save All Settings"
              )}
            </button>
          </div>
        </section>

        {/* API Status */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">API Connection Status</h2>
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
                "Test All Connections"
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">ElevenLabs</p>
                <p className="text-sm text-muted-foreground">Voice generation (TTS)</p>
              </div>
              <StatusIcon status={apiStatus.elevenlabs} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">PiAPI (Flux)</p>
                <p className="text-sm text-muted-foreground">Image generation</p>
              </div>
              <StatusIcon status={apiStatus.gemini} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">PiAPI (Kling AI)</p>
                <p className="text-sm text-muted-foreground">Video generation</p>
              </div>
              <StatusIcon status={apiStatus.kling} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium">Sync Labs</p>
                <p className="text-sm text-muted-foreground">Lip-sync generation</p>
              </div>
              <StatusIcon status={apiStatus.synclabs} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Cloudflare R2</p>
                <p className="text-sm text-muted-foreground">Asset storage</p>
              </div>
              <StatusIcon status={apiStatus.r2} />
            </div>
          </div>
        </section>

        {/* Environment Variables */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Required Environment Variables</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            These must be configured in your .env.local file (local) or Vercel dashboard (production):
          </p>
          <pre className="bg-background p-4 rounded-lg text-sm overflow-x-auto font-mono">
{`# Database
DATABASE_URL=postgresql://...

# Cloudflare R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=devatar

# AI Services
ELEVENLABS_API_KEY=
PIAPI_FLUX_KEY=        # Used for Flux images & Kling video
SYNCLABS_API_KEY=

# Background Jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=`}
          </pre>
        </section>
      </main>
    </div>
  );
}
