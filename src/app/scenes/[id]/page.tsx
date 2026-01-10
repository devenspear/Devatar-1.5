"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Video,
  Mic,
  Image as ImageIcon,
  Film,
  Zap,
  User,
  X,
  Clock,
  Download,
  ExternalLink,
  Settings,
  FileText,
  Camera,
  Shirt,
  Move,
  Sun,
  RefreshCw,
  Trash2,
  ChevronRight,
  Edit3,
  Save,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: string;
  r2Url: string | null;
  signedUrl?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Scene {
  id: string;
  name: string;
  orderIndex: number;
  status: string;
  projectId: string;
  project: Project;
  // Scene prompts
  dialogue: string | null;
  environment: string | null;
  wardrobe: string | null;
  movement: string | null;
  camera: string | null;
  soundEffects: string | null;
  targetDuration: number;
  moodLighting: string;
  generationMode: string | null;
  // Generated outputs
  audioUrl: string | null;
  audioDuration: number | null;
  voiceId: string | null;
  audioModel: string | null;
  imageUrl: string | null;
  imagePrompt: string | null;
  imageModel: string | null;
  rawVideoUrl: string | null;
  videoPrompt: string | null;
  videoDuration: number | null;
  videoModel: string | null;
  videoMode: string | null;
  lipsyncVideoUrl: string | null;
  lipsyncModel: string | null;
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  // Headshot
  headshotId: string | null;
  headshot: Asset | null;
  // Error tracking
  failureReason: string | null;
  retryCount: number;
  lastAttemptAt: string | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface GenerationProgress {
  step: number;
  status: string;
  message?: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  finalVideoUrl?: string;
  error?: string;
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
  DRAFT: {
    icon: <Video className="w-4 h-4" />,
    label: "Draft",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
  },
  GENERATING_AUDIO: {
    icon: <Mic className="w-4 h-4 animate-pulse" />,
    label: "Generating Audio",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  GENERATING_IMAGE: {
    icon: <ImageIcon className="w-4 h-4 animate-pulse" />,
    label: "Generating Image",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  GENERATING_VIDEO: {
    icon: <Film className="w-4 h-4 animate-pulse" />,
    label: "Generating Video",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  APPLYING_LIPSYNC: {
    icon: <Zap className="w-4 h-4 animate-pulse" />,
    label: "Applying Lip-sync",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  ADDING_SOUND_FX: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Adding Sound FX",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  COMPLETED: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Complete",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
};

export default function SceneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [scene, setScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    dialogue: "",
    environment: "",
    wardrobe: "",
    movement: "",
    camera: "",
    targetDuration: 15,
  });

  useEffect(() => {
    fetchScene();
    // Poll for updates while scene is generating
    const interval = setInterval(() => {
      if (
        scene?.status &&
        !["DRAFT", "COMPLETED", "FAILED"].includes(scene.status)
      ) {
        fetchScene();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  // Update edit form when scene changes
  useEffect(() => {
    if (scene) {
      setEditForm({
        name: scene.name || "",
        dialogue: scene.dialogue || "",
        environment: scene.environment || "",
        wardrobe: scene.wardrobe || "",
        movement: scene.movement || "",
        camera: scene.camera || "",
        targetDuration: scene.targetDuration || 15,
      });
    }
  }, [scene]);

  async function fetchScene() {
    try {
      const res = await fetch(`/api/scenes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setScene(data);
      } else {
        setErrorMessage("Scene not found");
      }
    } catch (error) {
      console.error("Error fetching scene:", error);
      setErrorMessage("Failed to load scene");
    } finally {
      setLoading(false);
    }
  }

  async function saveScene() {
    if (!scene) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/scenes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const updated = await res.json();
        setScene(updated);
        setEditing(false);
      } else {
        setErrorMessage("Failed to save changes");
      }
    } catch (error) {
      console.error("Error saving scene:", error);
      setErrorMessage("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function generateScene() {
    if (!scene) return;
    setGenerating(true);
    setProgress(null);
    setErrorMessage(null);

    try {
      // Try Inngest-based generation first
      const res = await fetch(`/api/scenes/${id}/generate`, {
        method: "POST",
      });

      const data = await res.json();

      // If Inngest isn't configured (503), fall back to direct SSE generation
      if (res.status === 503 || data.fallbackUrl) {
        console.log("Inngest not available, using direct generation...");
        await generateSceneDirect();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to start generation");
      }

      // Inngest succeeded - start polling for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/scenes/${id}/status`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();

          const statusToStep: Record<string, number> = {
            DRAFT: 0,
            GENERATING_AUDIO: 1,
            GENERATING_IMAGE: 2,
            GENERATING_VIDEO: 3,
            APPLYING_LIPSYNC: 4,
            COMPLETED: 5,
            FAILED: -1,
          };

          const step = statusToStep[statusData.status] || 0;
          const latestLog = statusData.logs?.[0];

          setProgress({
            step: step,
            status: statusData.status,
            message: latestLog?.message || `Processing: ${statusData.status}`,
            audioUrl: statusData.audioUrl,
            imageUrl: statusData.imageUrl,
            videoUrl: statusData.rawVideoUrl,
            finalVideoUrl: statusData.finalVideoUrl,
          });

          if (statusData.status === "COMPLETED") {
            clearInterval(pollInterval);
            setTimeout(() => {
              setGenerating(false);
              setProgress(null);
            }, 2000);
            fetchScene();
          } else if (statusData.status === "FAILED") {
            clearInterval(pollInterval);
            setErrorMessage(statusData.failureReason || "Generation failed");
            setGenerating(false);
            fetchScene();
          }
        } catch (pollError) {
          console.error("Error polling status:", pollError);
        }
      }, 3000);
    } catch (error) {
      console.error("Error generating scene:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Generation failed"
      );
      setGenerating(false);
      fetchScene();
    }
  }

  async function generateSceneDirect() {
    try {
      const res = await fetch(`/api/scenes/${id}/generate-direct`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to start generation");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setProgress(data);

              if (data.error) {
                setErrorMessage(data.error);
                setGenerating(false);
              }

              if (data.step === 5 && data.status === "completed") {
                setTimeout(() => {
                  setGenerating(false);
                  setProgress(null);
                }, 2000);
                fetchScene();
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in direct generation:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Generation failed"
      );
      setGenerating(false);
    } finally {
      fetchScene();
    }
  }

  async function deleteScene() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/scenes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/scenes");
      } else {
        setErrorMessage("Failed to delete scene");
      }
    } catch (error) {
      console.error("Error deleting scene:", error);
      setErrorMessage("Failed to delete scene");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const statusConfig = (status: string) =>
    STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-gray-500 mb-4">Scene not found</p>
        <Link href="/scenes" className="text-blue-400 hover:text-blue-300">
          Back to Scenes
        </Link>
      </div>
    );
  }

  const status = statusConfig(scene.status);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/scenes"
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          Scenes
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <Link
          href={`/projects/${scene.project.id}`}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          {scene.project.name}
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <span className="text-gray-300">{scene.name}</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/scenes"
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{scene.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`flex items-center gap-1.5 text-sm px-2.5 py-0.5 rounded-full ${status.color} ${status.bgColor}`}
              >
                {status.icon}
                {status.label}
              </span>
              {scene.generationMode && (
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                  {scene.generationMode === "digital-twin"
                    ? "Digital Twin"
                    : "Standard"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveScene}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generation Progress */}
      {generating && (
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="font-medium text-gray-100">
                Generating Scene
              </span>
            </div>
            <span className="text-sm text-blue-300">
              Step {progress?.step || 1} of 5
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[
              { step: 1, label: "Audio", icon: <Mic className="w-3 h-3" /> },
              {
                step: 2,
                label: "Image",
                icon: <ImageIcon className="w-3 h-3" />,
              },
              { step: 3, label: "Video", icon: <Film className="w-3 h-3" /> },
              { step: 4, label: "Lip-sync", icon: <Zap className="w-3 h-3" /> },
              {
                step: 5,
                label: "Complete",
                icon: <CheckCircle className="w-3 h-3" />,
              },
            ].map(({ step, label, icon }) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    (progress?.step || 0) > step
                      ? "bg-green-500/30 text-green-300"
                      : (progress?.step || 0) === step
                        ? "bg-blue-500/40 text-blue-200 ring-2 ring-blue-400/50"
                        : "bg-gray-800/50 text-gray-500"
                  }`}
                >
                  {(progress?.step || 0) > step ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (progress?.step || 0) === step ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    icon
                  )}
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {step < 5 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${
                      (progress?.step || 0) > step
                        ? "bg-green-500/50"
                        : "bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {progress?.message && (
            <p className="text-xs text-blue-200/70 mt-2">{progress.message}</p>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-400">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Video Preview */}
      {scene.finalVideoUrl && (
        <div className="bg-black rounded-xl overflow-hidden">
          <video
            src={`/api/scenes/${scene.id}/video`}
            controls
            className="w-full max-h-[500px]"
            poster={scene.thumbnailUrl || undefined}
          />
        </div>
      )}

      {/* Scene Properties */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-100">Scene Details</h2>

        {/* Dialogue */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-400">
              Dialogue / Script
            </label>
          </div>
          {editing ? (
            <textarea
              value={editForm.dialogue}
              onChange={(e) =>
                setEditForm({ ...editForm, dialogue: e.target.value })
              }
              rows={6}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Enter the dialogue or script..."
            />
          ) : (
            <p className="text-gray-200 bg-gray-800 rounded-lg p-4 whitespace-pre-wrap">
              {scene.dialogue || (
                <span className="text-gray-500 italic">No dialogue set</span>
              )}
            </p>
          )}
        </div>

        {/* Scene Settings Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Environment */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Environment</span>
            </div>
            {editing ? (
              <input
                type="text"
                value={editForm.environment}
                onChange={(e) =>
                  setEditForm({ ...editForm, environment: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe environment..."
              />
            ) : (
              <p className="text-sm text-gray-300">
                {scene.environment || (
                  <span className="text-gray-500 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Wardrobe */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shirt className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Wardrobe</span>
            </div>
            {editing ? (
              <input
                type="text"
                value={editForm.wardrobe}
                onChange={(e) =>
                  setEditForm({ ...editForm, wardrobe: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe wardrobe..."
              />
            ) : (
              <p className="text-sm text-gray-300">
                {scene.wardrobe || (
                  <span className="text-gray-500 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Movement */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Move className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Movement</span>
            </div>
            {editing ? (
              <input
                type="text"
                value={editForm.movement}
                onChange={(e) =>
                  setEditForm({ ...editForm, movement: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe movement..."
              />
            ) : (
              <p className="text-sm text-gray-300">
                {scene.movement || (
                  <span className="text-gray-500 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Camera */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">Camera</span>
            </div>
            {editing ? (
              <input
                type="text"
                value={editForm.camera}
                onChange={(e) =>
                  setEditForm({ ...editForm, camera: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe camera..."
              />
            ) : (
              <p className="text-sm text-gray-300">
                {scene.camera || (
                  <span className="text-gray-500 italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Target Duration */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">Target Duration</span>
            </div>
            {editing ? (
              <select
                value={editForm.targetDuration}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    targetDuration: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={20}>20 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            ) : (
              <p className="text-sm text-gray-300">
                {scene.targetDuration} seconds
              </p>
            )}
          </div>

          {/* Mood/Lighting */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500">Mood/Lighting</span>
            </div>
            <p className="text-sm text-gray-300">{scene.moodLighting}</p>
          </div>
        </div>

        {/* Headshot Used */}
        {scene.headshot && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-400">
                Headshot Used
              </span>
            </div>
            <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
              {scene.headshot.r2Url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scene.headshot.r2Url}
                  alt={scene.headshot.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <span className="text-sm text-gray-300">
                {scene.headshot.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Generated Outputs */}
      {(scene.audioUrl ||
        scene.imageUrl ||
        scene.rawVideoUrl ||
        scene.lipsyncVideoUrl) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-100">
              Generated Outputs
            </h2>
          </div>
          <div className="space-y-3">
            {scene.audioUrl && (
              <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">Audio</p>
                    <p className="text-xs text-gray-500">
                      {scene.audioModel || "Unknown model"}
                      {scene.audioDuration && ` • ${scene.audioDuration}s`}
                    </p>
                  </div>
                </div>
                <a
                  href={scene.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            )}
            {scene.imageUrl && (
              <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">Image</p>
                    <p className="text-xs text-gray-500">
                      {scene.imageModel || "Unknown model"}
                    </p>
                  </div>
                </div>
                <a
                  href={scene.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            )}
            {scene.rawVideoUrl && (
              <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Film className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Raw Video (pre-lipsync)
                    </p>
                    <p className="text-xs text-gray-500">
                      {scene.videoModel || "Unknown model"}
                      {scene.videoMode && ` • ${scene.videoMode} mode`}
                    </p>
                  </div>
                </div>
                <a
                  href={scene.rawVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            )}
            {scene.lipsyncVideoUrl && (
              <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Lip-synced Video
                    </p>
                    <p className="text-xs text-gray-500">
                      {scene.lipsyncModel || "Unknown model"}
                    </p>
                  </div>
                </div>
                <a
                  href={scene.lipsyncVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Information */}
      {scene.failureReason && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="font-medium text-red-400">Error Details</h3>
          </div>
          <p className="text-sm text-red-300">{scene.failureReason}</p>
          {scene.retryCount > 0 && (
            <p className="text-xs text-red-400 mt-2">
              Retry attempts: {scene.retryCount}
            </p>
          )}
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Created: {new Date(scene.createdAt).toLocaleString()}</span>
        {scene.updatedAt && (
          <span>Updated: {new Date(scene.updatedAt).toLocaleString()}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-800">
        {(scene.status === "DRAFT" || scene.status === "FAILED") && (
          <button
            onClick={generateScene}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {scene.status === "FAILED" ? "Retry Generation" : "Generate"}
              </>
            )}
          </button>
        )}
        {scene.status === "COMPLETED" && (
          <button
            onClick={generateScene}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </>
            )}
          </button>
        )}
        {scene.finalVideoUrl && (
          <a
            href={`/api/scenes/${scene.id}/video`}
            download={`${scene.name}.mp4`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Video
          </a>
        )}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 text-red-400 border border-red-800 rounded-lg hover:bg-red-900/40 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Delete Scene
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-100">
                &quot;{scene.name}&quot;
              </span>
              ?
              {scene.finalVideoUrl && (
                <span className="block mt-2 text-sm text-yellow-400">
                  This scene has a generated video that will also be deleted.
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteScene}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Scene
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
