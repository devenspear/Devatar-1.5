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
} from "lucide-react";

interface Scene {
  id: string;
  name: string;
  orderIndex: number;
  status: string;
  dialogue: string | null;
  environment: string | null;
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  defaultVoiceId: string | null;
  scenes: Scene[];
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  DRAFT: {
    icon: <Video className="w-4 h-4" />,
    label: "Draft",
    color: "text-muted-foreground",
  },
  GENERATING_AUDIO: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Audio...",
    color: "text-yellow-500",
  },
  GENERATING_IMAGE: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Image...",
    color: "text-yellow-500",
  },
  GENERATING_VIDEO: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Video...",
    color: "text-yellow-500",
  },
  APPLYING_LIPSYNC: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Lip-sync...",
    color: "text-yellow-500",
  },
  ADDING_SOUND_FX: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Sound FX...",
    color: "text-yellow-500",
  },
  COMPLETED: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Complete",
    color: "text-green-500",
  },
  FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Failed",
    color: "text-red-500",
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
  const [sceneForm, setSceneForm] = useState({
    name: "",
    dialogue: "",
    environment: "",
    wardrobe: "",
    movement: "",
    camera: "",
    targetDuration: 15,
  });
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
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
    setGenerating(sceneId);
    try {
      const res = await fetch(`/api/scenes/${sceneId}/generate`, {
        method: "POST",
      });

      if (res.ok) {
        fetchProject();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to start generation");
      }
    } catch (error) {
      console.error("Error generating scene:", error);
    } finally {
      setGenerating(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const statusConfig = (status: string) =>
    STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">{project.name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {project.scenes.length} scene{project.scenes.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Scene
          </button>
        </div>

        {/* Scene Grid */}
        {project.scenes.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No scenes yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-primary hover:underline"
            >
              Add your first scene
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.scenes.map((scene) => {
              const status = statusConfig(scene.status);
              return (
                <div
                  key={scene.id}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div
                    className="aspect-video bg-muted flex items-center justify-center relative cursor-pointer"
                    onClick={() => setSelectedScene(scene)}
                  >
                    {scene.thumbnailUrl || scene.finalVideoUrl ? (
                      <video
                        src={scene.finalVideoUrl || ""}
                        poster={scene.thumbnailUrl || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="w-12 h-12 text-muted-foreground" />
                    )}
                    {scene.finalVideoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{scene.name}</h3>
                      <span className={`flex items-center gap-1 text-sm ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    {scene.dialogue && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {scene.dialogue}
                      </p>
                    )}
                    {scene.status === "DRAFT" || scene.status === "FAILED" ? (
                      <button
                        onClick={() => generateScene(scene.id)}
                        disabled={generating === scene.id}
                        className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {generating === scene.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Starting...
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
                        className="block w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm text-center hover:bg-secondary/80 transition-colors"
                      >
                        Download Video
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Scene Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Create New Scene</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Scene Name *
                  </label>
                  <input
                    type="text"
                    value={sceneForm.name}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, name: e.target.value })
                    }
                    placeholder="e.g., Data Center Walk"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Dialogue / Script
                  </label>
                  <textarea
                    value={sceneForm.dialogue}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, dialogue: e.target.value })
                    }
                    placeholder="The text that will be spoken..."
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Environment
                  </label>
                  <textarea
                    value={sceneForm.environment}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, environment: e.target.value })
                    }
                    placeholder="Describe the setting, background, lighting..."
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Wardrobe
                  </label>
                  <input
                    type="text"
                    value={sceneForm.wardrobe}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, wardrobe: e.target.value })
                    }
                    placeholder="e.g., Dark navy suit, white dress shirt"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Movement / Pose
                  </label>
                  <input
                    type="text"
                    value={sceneForm.movement}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, movement: e.target.value })
                    }
                    placeholder="e.g., Walking slowly, gesturing with hands"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Camera
                  </label>
                  <input
                    type="text"
                    value={sceneForm.camera}
                    onChange={(e) =>
                      setSceneForm({ ...sceneForm, camera: e.target.value })
                    }
                    placeholder="e.g., Medium shot, slow tracking"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Target Duration (seconds)
                  </label>
                  <select
                    value={sceneForm.targetDuration}
                    onChange={(e) =>
                      setSceneForm({
                        ...sceneForm,
                        targetDuration: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createScene}
                  disabled={creating || !sceneForm.name.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Scene"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Preview Modal */}
        {selectedScene && selectedScene.finalVideoUrl && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedScene(null)}
          >
            <div
              className="bg-card border border-border rounded-lg overflow-hidden max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={selectedScene.finalVideoUrl}
                controls
                autoPlay
                className="w-full"
              />
              <div className="p-4">
                <h3 className="font-medium">{selectedScene.name}</h3>
                {selectedScene.dialogue && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedScene.dialogue}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
