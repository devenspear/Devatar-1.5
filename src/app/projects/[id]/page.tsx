"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
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
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: string;
  r2Url: string | null;
  signedUrl?: string;
}

interface Scene {
  id: string;
  name: string;
  orderIndex: number;
  status: string;
  // Scene prompts
  dialogue: string | null;
  environment: string | null;
  wardrobe: string | null;
  movement: string | null;
  camera: string | null;
  soundEffects: string | null;
  targetDuration: number;
  moodLighting: string;
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

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  defaultVoiceId: string | null;
  scenes: Scene[];
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
  { icon: React.ReactNode; label: string; color: string }
> = {
  DRAFT: {
    icon: <Video className="w-4 h-4" />,
    label: "Draft",
    color: "text-gray-400",
  },
  GENERATING_AUDIO: {
    icon: <Mic className="w-4 h-4 animate-pulse" />,
    label: "Audio...",
    color: "text-yellow-400",
  },
  GENERATING_IMAGE: {
    icon: <ImageIcon className="w-4 h-4 animate-pulse" />,
    label: "Image...",
    color: "text-yellow-400",
  },
  GENERATING_VIDEO: {
    icon: <Film className="w-4 h-4 animate-pulse" />,
    label: "Video...",
    color: "text-yellow-400",
  },
  APPLYING_LIPSYNC: {
    icon: <Zap className="w-4 h-4 animate-pulse" />,
    label: "Lip-sync...",
    color: "text-yellow-400",
  },
  ADDING_SOUND_FX: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Sound FX...",
    color: "text-yellow-400",
  },
  COMPLETED: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Complete",
    color: "text-green-400",
  },
  FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Failed",
    color: "text-red-400",
  },
};

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [showSceneDetail, setShowSceneDetail] = useState(false);
  const [headshots, setHeadshots] = useState<Asset[]>([]);
  const [sceneForm, setSceneForm] = useState({
    name: "",
    dialogue: "",
    environment: "",
    wardrobe: "",
    movement: "",
    camera: "",
    targetDuration: 15,
    headshotId: "",
  });
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingSceneName, setGeneratingSceneName] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
    fetchHeadshots();
    // Poll for updates while generating
    const interval = setInterval(fetchProject, 5000);
    return () => clearInterval(interval);
  }, [id]);

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHeadshots() {
    try {
      const res = await fetch("/api/assets?type=HEADSHOT");
      if (res.ok) {
        const data = await res.json();
        // Fetch signed URLs for each headshot
        const headshotsWithUrls = await Promise.all(
          data.map(async (asset: Asset) => {
            try {
              const detailRes = await fetch(`/api/assets/${asset.id}`);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                return { ...asset, signedUrl: detail.signedUrl };
              }
            } catch {
              // Ignore errors
            }
            return asset;
          })
        );
        setHeadshots(headshotsWithUrls);
      }
    } catch (error) {
      console.error("Error fetching headshots:", error);
    }
  }

  async function createScene() {
    if (!sceneForm.name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          ...sceneForm,
        }),
      });

      if (res.ok) {
        setSceneForm({
          name: "",
          dialogue: "",
          environment: "",
          wardrobe: "",
          movement: "",
          camera: "",
          targetDuration: 15,
          headshotId: "",
        });
        setShowCreate(false);
        fetchProject();
      }
    } catch (error) {
      console.error("Error creating scene:", error);
    } finally {
      setCreating(false);
    }
  }

  async function generateScene(sceneId: string) {
    const scene = project?.scenes.find(s => s.id === sceneId);
    setGenerating(sceneId);
    setGeneratingSceneName(scene?.name || "Scene");
    setProgress(null);
    setErrorMessage(null);

    try {
      // Use the direct generation endpoint with SSE streaming
      const res = await fetch(`/api/scenes/${sceneId}/generate-direct`, {
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
                setGenerating(null);
                setGeneratingSceneName(null);
              }

              if (data.step === 5 && data.status === "completed") {
                // Generation complete - keep progress visible briefly before clearing
                setTimeout(() => {
                  setGenerating(null);
                  setGeneratingSceneName(null);
                  setProgress(null);
                }, 2000);
                fetchProject();
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating scene:", error);
      setErrorMessage(error instanceof Error ? error.message : "Generation failed");
      setGenerating(null);
      setGeneratingSceneName(null);
    } finally {
      fetchProject();
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  const statusConfig = (status: string) =>
    STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return "Audio";
      case 2: return "Image";
      case 3: return "Video";
      case 4: return "Lip-sync";
      case 5: return "Complete";
      default: return "Processing";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-100">{project.name}</h1>
          <p className="text-gray-500 mt-1">
            {project.scenes.length} scene{project.scenes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Scene
        </button>
      </div>

      {/* Persistent Generation Progress Header */}
      {generating && (
        <div className="sticky top-0 z-40 -mx-6 -mt-6 mb-6 bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-sm border-b border-blue-500/30 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="font-medium text-gray-100">
                  Generating: {generatingSceneName}
                </span>
              </div>
              <span className="text-sm text-blue-300">
                Step {progress?.step || 1} of 5
              </span>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {[
                { step: 1, label: "Audio", icon: <Mic className="w-3 h-3" /> },
                { step: 2, label: "Image", icon: <ImageIcon className="w-3 h-3" /> },
                { step: 3, label: "Video", icon: <Film className="w-3 h-3" /> },
                { step: 4, label: "Lip-sync", icon: <Zap className="w-3 h-3" /> },
                { step: 5, label: "Complete", icon: <CheckCircle className="w-3 h-3" /> },
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
                    <div className={`flex-1 h-0.5 mx-1 ${
                      (progress?.step || 0) > step ? "bg-green-500/50" : "bg-gray-700"
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Current Status Message */}
            {progress?.message && (
              <p className="text-xs text-blue-200/70 mt-2 truncate">
                {progress.message}
              </p>
            )}
          </div>
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
              Close
            </button>
          </div>
        </div>
      )}

      {/* Scene Grid */}
      {project.scenes.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Video className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-400 mb-4">No scenes yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Add your first scene
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {project.scenes.map((scene) => {
            const status = statusConfig(scene.status);
            const isGenerating = generating === scene.id;
            return (
              <div
                key={scene.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-gray-700 transition-colors"
                onClick={() => {
                  setSelectedScene(scene);
                  setShowSceneDetail(true);
                }}
              >
                <div
                  className="aspect-video bg-gray-800 flex items-center justify-center relative"
                >
                  {scene.thumbnailUrl || scene.finalVideoUrl ? (
                    <video
                      src={scene.finalVideoUrl || ""}
                      poster={scene.thumbnailUrl || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video className="w-12 h-12 text-gray-700" />
                  )}
                  {scene.finalVideoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-200">{scene.name}</h3>
                    <span className={`flex items-center gap-1 text-sm ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  {scene.dialogue && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {scene.dialogue}
                    </p>
                  )}
                  {scene.failureReason && scene.status === "FAILED" && (
                    <p className="text-xs text-red-400 mb-3 line-clamp-2">
                      {scene.failureReason}
                    </p>
                  )}
                  {scene.status === "DRAFT" || scene.status === "FAILED" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateScene(scene.id);
                      }}
                      disabled={isGenerating || generating !== null}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        "Generate"
                      )}
                    </button>
                  ) : scene.status === "COMPLETED" && scene.finalVideoUrl ? (
                    <a
                      href={scene.finalVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="block w-full px-3 py-2 bg-gray-800 text-gray-200 rounded-lg text-sm text-center hover:bg-gray-700 transition-colors"
                    >
                      Download Video
                    </a>
                  ) : (
                    <div className="w-full space-y-2">
                      {/* Mini Progress Indicator */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>
                          {isGenerating && progress
                            ? `Step ${progress.step}/5 - ${getStepLabel(progress.step)}`
                            : statusConfig(scene.status).label}
                        </span>
                        {isGenerating && progress && (
                          <span className="text-blue-400">{Math.round((progress.step / 5) * 100)}%</span>
                        )}
                      </div>
                      {/* Mini Progress Bar */}
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isGenerating ? "bg-blue-500" : "bg-yellow-500"
                          }`}
                          style={{
                            width: isGenerating && progress
                              ? `${(progress.step / 5) * 100}%`
                              : scene.status === "GENERATING_AUDIO" ? "20%"
                              : scene.status === "GENERATING_IMAGE" ? "40%"
                              : scene.status === "GENERATING_VIDEO" ? "60%"
                              : scene.status === "APPLYING_LIPSYNC" ? "80%"
                              : "10%"
                          }}
                        />
                      </div>
                      {/* Step Icons */}
                      <div className="flex items-center justify-between px-1">
                        {[
                          { step: 1, icon: <Mic className="w-3 h-3" />, status: "GENERATING_AUDIO" },
                          { step: 2, icon: <ImageIcon className="w-3 h-3" />, status: "GENERATING_IMAGE" },
                          { step: 3, icon: <Film className="w-3 h-3" />, status: "GENERATING_VIDEO" },
                          { step: 4, icon: <Zap className="w-3 h-3" />, status: "APPLYING_LIPSYNC" },
                        ].map(({ step, icon, status }) => {
                          const currentStep = isGenerating && progress ? progress.step :
                            scene.status === "GENERATING_AUDIO" ? 1 :
                            scene.status === "GENERATING_IMAGE" ? 2 :
                            scene.status === "GENERATING_VIDEO" ? 3 :
                            scene.status === "APPLYING_LIPSYNC" ? 4 : 0;
                          const isCompleted = currentStep > step;
                          const isCurrent = currentStep === step;
                          return (
                            <div
                              key={step}
                              className={`p-1 rounded transition-colors ${
                                isCompleted
                                  ? "text-green-400"
                                  : isCurrent
                                  ? "text-blue-400 animate-pulse"
                                  : "text-gray-600"
                              }`}
                            >
                              {icon}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Scene Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Create New Scene</h2>

            <div className="space-y-4">
              {/* Deven's Identity Card */}
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Avatar: Deven Spear</p>
                    <p className="text-xs text-gray-500">Voice: DevenPro2026</p>
                  </div>
                </div>
              </div>

              {/* Headshot Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Headshot *
                </label>
                {headshots.length === 0 ? (
                  <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-center">
                    <User className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm text-gray-500">No headshots uploaded yet</p>
                    <a
                      href="/assets"
                      className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
                    >
                      Upload headshots in Assets
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {headshots.map((headshot) => (
                      <button
                        key={headshot.id}
                        type="button"
                        onClick={() =>
                          setSceneForm({ ...sceneForm, headshotId: headshot.id })
                        }
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          sceneForm.headshotId === headshot.id
                            ? "border-blue-500 ring-2 ring-blue-500/50"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        {headshot.signedUrl ? (
                          <img
                            src={headshot.signedUrl}
                            alt={headshot.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {sceneForm.headshotId && (
                  <p className="text-xs text-green-400 mt-2">
                    Headshot selected - will skip AI image generation
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Scene Name *
                </label>
                <input
                  type="text"
                  value={sceneForm.name}
                  onChange={(e) =>
                    setSceneForm({ ...sceneForm, name: e.target.value })
                  }
                  placeholder="e.g., Opening Scene"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dialogue / Script
                </label>
                <textarea
                  value={sceneForm.dialogue}
                  onChange={(e) =>
                    setSceneForm({ ...sceneForm, dialogue: e.target.value })
                  }
                  placeholder="The text that will be spoken..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Environment
                </label>
                <textarea
                  value={sceneForm.environment}
                  onChange={(e) =>
                    setSceneForm({ ...sceneForm, environment: e.target.value })
                  }
                  placeholder="Describe the setting, background, lighting..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Wardrobe
                  </label>
                  <input
                    type="text"
                    value={sceneForm.wardrobe}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, wardrobe: e.target.value })
                    }
                    placeholder="e.g., Dark navy suit"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Movement / Pose
                  </label>
                  <input
                    type="text"
                    value={sceneForm.movement}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, movement: e.target.value })
                    }
                    placeholder="e.g., Subtle head movements"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Camera
                  </label>
                  <input
                    type="text"
                    value={sceneForm.camera}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, camera: e.target.value })
                    }
                    placeholder="e.g., Medium close-up shot"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Target Duration
                  </label>
                  <select
                    value={sceneForm.targetDuration}
                    onChange={(e) =>
                      setSceneForm({
                        ...sceneForm,
                        targetDuration: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createScene}
                disabled={creating || !sceneForm.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Scene"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scene Detail Modal */}
      {showSceneDetail && selectedScene && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowSceneDetail(false);
            setSelectedScene(null);
          }}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-100">{selectedScene.name}</h2>
                <span className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${
                  statusConfig(selectedScene.status).color
                } bg-gray-800`}>
                  {statusConfig(selectedScene.status).icon}
                  {statusConfig(selectedScene.status).label}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowSceneDetail(false);
                  setSelectedScene(null);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Video Preview */}
            {selectedScene.finalVideoUrl && (
              <div className="bg-black">
                <video
                  src={selectedScene.finalVideoUrl}
                  controls
                  className="w-full max-h-[400px]"
                  poster={selectedScene.thumbnailUrl || undefined}
                />
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Dialogue / Script */}
              {selectedScene.dialogue && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-400">Dialogue / Script</h3>
                  </div>
                  <p className="text-gray-200 bg-gray-800 rounded-lg p-3 whitespace-pre-wrap">
                    {selectedScene.dialogue}
                  </p>
                </div>
              )}

              {/* Scene Settings Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedScene.environment && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sun className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-gray-500">Environment</span>
                    </div>
                    <p className="text-sm text-gray-300">{selectedScene.environment}</p>
                  </div>
                )}
                {selectedScene.wardrobe && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shirt className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-500">Wardrobe</span>
                    </div>
                    <p className="text-sm text-gray-300">{selectedScene.wardrobe}</p>
                  </div>
                )}
                {selectedScene.movement && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Move className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-gray-500">Movement</span>
                    </div>
                    <p className="text-sm text-gray-300">{selectedScene.movement}</p>
                  </div>
                )}
                {selectedScene.camera && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Camera className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-gray-500">Camera</span>
                    </div>
                    <p className="text-sm text-gray-300">{selectedScene.camera}</p>
                  </div>
                )}
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-gray-500">Target Duration</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedScene.targetDuration}s</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-gray-500">Mood/Lighting</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedScene.moodLighting}</p>
                </div>
              </div>

              {/* Headshot Used */}
              {selectedScene.headshot && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-400">Headshot Used</h3>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                    {selectedScene.headshot.r2Url && (
                      <img
                        src={selectedScene.headshot.r2Url}
                        alt={selectedScene.headshot.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <span className="text-sm text-gray-300">{selectedScene.headshot.name}</span>
                  </div>
                </div>
              )}

              {/* Generated Outputs */}
              {(selectedScene.audioUrl || selectedScene.imageUrl || selectedScene.rawVideoUrl || selectedScene.lipsyncVideoUrl) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-400">Generated Outputs</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedScene.audioUrl && (
                      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Mic className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-sm text-gray-300">Audio</p>
                            <p className="text-xs text-gray-500">
                              {selectedScene.audioModel || "Unknown model"}
                              {selectedScene.audioDuration && ` • ${selectedScene.audioDuration}s`}
                            </p>
                          </div>
                        </div>
                        <a
                          href={selectedScene.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    )}
                    {selectedScene.imageUrl && (
                      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <ImageIcon className="w-4 h-4 text-green-400" />
                          <div>
                            <p className="text-sm text-gray-300">Image</p>
                            <p className="text-xs text-gray-500">{selectedScene.imageModel || "Unknown model"}</p>
                          </div>
                        </div>
                        <a
                          href={selectedScene.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    )}
                    {selectedScene.rawVideoUrl && (
                      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Film className="w-4 h-4 text-purple-400" />
                          <div>
                            <p className="text-sm text-gray-300">Raw Video (pre-lipsync)</p>
                            <p className="text-xs text-gray-500">
                              {selectedScene.videoModel || "Unknown model"}
                              {selectedScene.videoMode && ` • ${selectedScene.videoMode} mode`}
                            </p>
                          </div>
                        </div>
                        <a
                          href={selectedScene.rawVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    )}
                    {selectedScene.lipsyncVideoUrl && (
                      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <div>
                            <p className="text-sm text-gray-300">Lip-synced Video</p>
                            <p className="text-xs text-gray-500">{selectedScene.lipsyncModel || "Unknown model"}</p>
                          </div>
                        </div>
                        <a
                          href={selectedScene.lipsyncVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Information */}
              {selectedScene.failureReason && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-medium text-red-400">Error Details</h3>
                  </div>
                  <p className="text-sm text-red-300">{selectedScene.failureReason}</p>
                  {selectedScene.retryCount > 0 && (
                    <p className="text-xs text-red-400 mt-2">Retry attempts: {selectedScene.retryCount}</p>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t border-gray-800">
                <span>Created: {new Date(selectedScene.createdAt).toLocaleString()}</span>
                {selectedScene.updatedAt && (
                  <span>Updated: {new Date(selectedScene.updatedAt).toLocaleString()}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {(selectedScene.status === "DRAFT" || selectedScene.status === "FAILED") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSceneDetail(false);
                      generateScene(selectedScene.id);
                    }}
                    disabled={generating !== null}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {selectedScene.status === "FAILED" ? "Retry Generation" : "Generate"}
                  </button>
                )}
                {selectedScene.finalVideoUrl && (
                  <a
                    href={selectedScene.finalVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" />
                    Download Video
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
