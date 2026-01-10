"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Film,
  ChevronDown,
  ChevronRight,
  Video,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  FolderOpen,
  Mic,
  Image as ImageIcon,
  Zap,
} from "lucide-react";

interface Scene {
  id: string;
  name: string;
  orderIndex: number;
  status: string;
  dialogue: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  finalVideoUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface SceneGroup {
  project: Project;
  scenes: Scene[];
}

interface ScenesData {
  total: number;
  projectCount: number;
  groups: SceneGroup[];
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
  DRAFT: {
    icon: <Video className="w-3.5 h-3.5" />,
    label: "Draft",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
  },
  GENERATING_AUDIO: {
    icon: <Mic className="w-3.5 h-3.5 animate-pulse" />,
    label: "Audio...",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  GENERATING_IMAGE: {
    icon: <ImageIcon className="w-3.5 h-3.5 animate-pulse" />,
    label: "Image...",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  GENERATING_VIDEO: {
    icon: <Film className="w-3.5 h-3.5 animate-pulse" />,
    label: "Video...",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  APPLYING_LIPSYNC: {
    icon: <Zap className="w-3.5 h-3.5 animate-pulse" />,
    label: "Lip-sync...",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  ADDING_SOUND_FX: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    label: "Sound FX...",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  COMPLETED: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: "Complete",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  FAILED: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: "Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
};

export default function ScenesPage() {
  const [data, setData] = useState<ScenesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchScenes();
    // Poll for updates
    const interval = setInterval(fetchScenes, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchScenes() {
    try {
      const res = await fetch("/api/scenes/all");
      const json = await res.json();
      setData(json);
      // Expand all projects by default on first load
      if (expandedProjects.size === 0 && json.groups?.length > 0) {
        setExpandedProjects(
          new Set(json.groups.map((g: SceneGroup) => g.project.id))
        );
      }
    } catch (error) {
      console.error("Error fetching scenes:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleProject(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
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

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Scenes</h1>
          <p className="text-gray-500 mt-1">
            {data?.total || 0} scene{data?.total !== 1 ? "s" : ""} across{" "}
            {data?.projectCount || 0} project
            {data?.projectCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {!data || data.groups.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Film className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-400 mb-4">No scenes yet</p>
          <Link
            href="/projects"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Create a project to add scenes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data.groups.map((group) => {
            const isExpanded = expandedProjects.has(group.project.id);
            return (
              <div
                key={group.project.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              >
                {/* Project Header */}
                <button
                  onClick={() => toggleProject(group.project.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <FolderOpen className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <h2 className="font-semibold text-gray-100">
                        {group.project.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {group.scenes.length} scene
                        {group.scenes.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/projects/${group.project.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                    >
                      View Project
                    </Link>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Scenes Grid */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {group.scenes.map((scene) => {
                        const status = statusConfig(scene.status);
                        return (
                          <Link
                            key={scene.id}
                            href={`/scenes/${scene.id}`}
                            className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors group"
                          >
                            {/* Thumbnail */}
                            <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                              {scene.imageUrl ||
                              scene.thumbnailUrl ||
                              scene.finalVideoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`/api/scenes/${scene.id}/video?type=image`}
                                  alt={scene.name || "Scene thumbnail"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <Video className="w-10 h-10 text-gray-700" />
                              )}
                              {scene.finalVideoUrl && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-10 h-10 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Scene Info */}
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-gray-200 truncate flex-1 text-sm">
                                  {scene.name}
                                </h3>
                                <span
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.color} ${status.bgColor}`}
                                >
                                  {status.icon}
                                  {status.label}
                                </span>
                              </div>
                              {scene.dialogue && (
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {scene.dialogue}
                                </p>
                              )}
                              {scene.failureReason &&
                                scene.status === "FAILED" && (
                                  <p className="text-xs text-red-400 mt-1 line-clamp-1">
                                    {scene.failureReason}
                                  </p>
                                )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
