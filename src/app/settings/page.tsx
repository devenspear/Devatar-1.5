"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, Info, ExternalLink, Mic, Image as ImageIcon, Film, Zap, HardDrive, Sparkles } from "lucide-react";

interface APIStatus {
  elevenlabs: boolean | null;
  gemini: boolean | null;
  kling: boolean | null;
  synclabs: boolean | null;
  fal: boolean | null;
  r2: boolean | null;
}

// Model configurations for each API
const MODEL_INFO = {
  elevenlabs: {
    provider: "ElevenLabs",
    purpose: "Voice/Speech Generation",
    icon: Mic,
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
    icon: ImageIcon,
    models: [
      { id: "Qubico/flux1-schnell", name: "Flux Schnell", description: "Fast, high-quality images (4 steps)", default: true },
      { id: "Qubico/flux1-dev", name: "Flux Dev", description: "Higher quality, slower (20+ steps)" },
    ],
    docsUrl: "https://piapi.ai/docs/flux-api",
  },
  kling: {
    provider: "PiAPI (Kling AI)",
    purpose: "Video Generation",
    icon: Film,
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
    icon: Zap,
    models: [
      { id: "lipsync-2", name: "Lipsync 2", description: "Standard quality lip-sync", default: true },
      { id: "lipsync-2-pro", name: "Lipsync 2 Pro", description: "Premium quality, better accuracy" },
    ],
    docsUrl: "https://docs.synclabs.so",
  },
  fal: {
    provider: "Fal.ai",
    purpose: "Digital Twin Images (LoRA)",
    icon: Sparkles,
    models: [
      { id: "fal-ai/flux-lora", name: "Flux LoRA", description: "Identity-locked image generation with custom LoRA", default: true },
      { id: "fal-ai/flux/dev", name: "Flux Dev", description: "Standard Flux Dev without LoRA" },
    ],
    docsUrl: "https://fal.ai/models/fal-ai/flux-lora",
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
    fal: "fal-ai/flux-lora",
  });
  const [apiStatus, setApiStatus] = useState<APIStatus>({
    elevenlabs: null,
    gemini: null,
    kling: null,
    synclabs: null,
    fal: null,
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
      fal: null,
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
      return <span className="text-gray-500">-</span>;
    }
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure your AI models and API connections
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Voice Configuration */}
        <div className="xl:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-gray-100 mb-4">Voice Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ElevenLabs Voice ID
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Enter your cloned voice ID or use default
              </p>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="21m00Tcm4TlvDq8ikWAM"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-600 mt-2">
                Default: Rachel (21m00Tcm4TlvDq8ikWAM)
              </p>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="xl:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-100">API Status</h2>
            <button
              onClick={testAPIs}
              disabled={testing}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Testing...
                </span>
              ) : (
                "Test All"
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-300">ElevenLabs</span>
              </div>
              <StatusIcon status={apiStatus.elevenlabs} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-300">PiAPI Flux</span>
              </div>
              <StatusIcon status={apiStatus.gemini} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-300">Kling AI</span>
              </div>
              <StatusIcon status={apiStatus.kling} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-300">Sync Labs</span>
              </div>
              <StatusIcon status={apiStatus.synclabs} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-300">Fal.ai</span>
              </div>
              <StatusIcon status={apiStatus.fal} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-300">Cloudflare R2</span>
              </div>
              <StatusIcon status={apiStatus.r2} />
            </div>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-100">Environment Variables</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Configure in .env.local (local) or Vercel dashboard (production)
          </p>
          <pre className="bg-gray-800 p-4 rounded-lg text-xs text-gray-400 overflow-x-auto font-mono">
{`# Database
DATABASE_URL=postgresql://...

# Cloudflare R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=devatar

# AI Services
ELEVENLABS_API_KEY=
PIAPI_FLUX_KEY=     # Flux images & Kling video
SYNCLABS_API_KEY=
FAL_KEY=            # Digital Twin LoRA images

# Background Jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=`}
          </pre>
        </div>
      </div>

      {/* Model Configuration Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-gray-100 mb-2">Model Configuration</h2>
        <p className="text-sm text-gray-500 mb-6">
          Configure which AI models to use for each generation step. These settings will be tracked with each scene.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
          {/* ElevenLabs Models */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-gray-200">{MODEL_INFO.elevenlabs.provider}</h3>
              </div>
              <a
                href={MODEL_INFO.elevenlabs.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {MODEL_INFO.elevenlabs.models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModels.elevenlabs === model.id
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{model.name}</span>
                      {model.default && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{model.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selectedModels.elevenlabs === model.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-600"
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* PiAPI Flux Models */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-gray-200">{MODEL_INFO.piapi_flux.provider}</h3>
              </div>
              <a
                href={MODEL_INFO.piapi_flux.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {MODEL_INFO.piapi_flux.models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModels.piapi_flux === model.id
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{model.name}</span>
                      {model.default && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{model.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selectedModels.piapi_flux === model.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-600"
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Kling AI Models */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-gray-200">{MODEL_INFO.kling.provider}</h3>
              </div>
              <a
                href={MODEL_INFO.kling.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Mode</p>
              {MODEL_INFO.kling.modes?.map((mode) => (
                <label
                  key={mode.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModels.kling_mode === mode.id
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
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
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-200">{mode.name}</span>
                    <p className="text-xs text-gray-500">{mode.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selectedModels.kling_mode === mode.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-600"
                    }`}
                  />
                </label>
              ))}
              <p className="text-xs text-gray-500 mt-3">Duration</p>
              <div className="flex gap-2">
                {MODEL_INFO.kling.durations.map((duration) => (
                  <label
                    key={duration}
                    className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedModels.kling_duration === duration
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
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
                    <span className="text-sm font-medium text-gray-200">{duration}s</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sync Labs Models */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-gray-200">{MODEL_INFO.synclabs.provider}</h3>
              </div>
              <a
                href={MODEL_INFO.synclabs.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {MODEL_INFO.synclabs.models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModels.synclabs === model.id
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{model.name}</span>
                      {model.default && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{model.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selectedModels.synclabs === model.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-600"
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Fal.ai Models */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-gray-200">{MODEL_INFO.fal.provider}</h3>
              </div>
              <a
                href={MODEL_INFO.fal.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {MODEL_INFO.fal.models.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModels.fal === model.id
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="fal"
                    value={model.id}
                    checked={selectedModels.fal === model.id}
                    onChange={(e) =>
                      setSelectedModels({ ...selectedModels, fal: e.target.value })
                    }
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{model.name}</span>
                      {model.default && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{model.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selectedModels.fal === model.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-600"
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
