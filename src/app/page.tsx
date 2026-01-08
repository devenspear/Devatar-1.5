"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  FolderOpen,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Activity,
  Zap,
  Film,
  Mic,
  Image as ImageIcon,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count?: { scenes: number };
}

interface APIStatus {
  elevenlabs: boolean | null;
  gemini: boolean | null;
  kling: boolean | null;
  synclabs: boolean | null;
  r2: boolean | null;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [apiStatus, setApiStatus] = useState<APIStatus>({
    elevenlabs: null,
    gemini: null,
    kling: null,
    synclabs: null,
    r2: null,
  });
  const [loading, setLoading] = useState(true);
  const [testingAPIs, setTestingAPIs] = useState(false);

  useEffect(() => {
    // Fetch recent projects
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects?limit=5");
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  async function testAPIs() {
    setTestingAPIs(true);
    try {
      const res = await fetch("/api/test-apis");
      const data = await res.json();
      setApiStatus(data);
    } catch (error) {
      console.error("Error testing APIs:", error);
    } finally {
      setTestingAPIs(false);
    }
  }

  const StatusIcon = ({ status }: { status: boolean | null }) => {
    if (status === null) {
      return <span className="w-2 h-2 rounded-full bg-gray-600" />;
    }
    return status ? (
      <span className="w-2 h-2 rounded-full bg-green-500" />
    ) : (
      <span className="w-2 h-2 rounded-full bg-red-500" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-400 bg-green-400/10";
      case "FAILED":
        return "text-red-400 bg-red-400/10";
      case "DRAFT":
        return "text-gray-400 bg-gray-400/10";
      default:
        return "text-blue-400 bg-blue-400/10";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Overview of your AI avatar video generation
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FolderOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{projects.length}</p>
              <p className="text-sm text-gray-500">Total Projects</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">
                {projects.filter((p) => p.status === "COMPLETED").length}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">
                {projects.filter((p) => !["COMPLETED", "FAILED", "DRAFT"].includes(p.status)).length}
              </p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Film className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">
                {projects.reduce((sum, p) => sum + (p._count?.scenes || 0), 0)}
              </p>
              <p className="text-sm text-gray-500">Total Scenes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-100">Recent Projects</h2>
            <Link
              href="/projects"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-800">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center">
                <Video className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No projects yet</p>
                <Link
                  href="/projects/new"
                  className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                >
                  Create your first project
                </Link>
              </div>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <Video className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">{project.name}</p>
                      <p className="text-sm text-gray-500">
                        {project._count?.scenes || 0} scenes
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* API Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-100">API Status</h2>
            <button
              onClick={testAPIs}
              disabled={testingAPIs}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {testingAPIs ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test All"
              )}
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gray-800 rounded">
                  <Mic className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">ElevenLabs</p>
                  <p className="text-xs text-gray-500">Voice</p>
                </div>
              </div>
              <StatusIcon status={apiStatus.elevenlabs} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gray-800 rounded">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">PiAPI Flux</p>
                  <p className="text-xs text-gray-500">Image</p>
                </div>
              </div>
              <StatusIcon status={apiStatus.gemini} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gray-800 rounded">
                  <Film className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Kling AI</p>
                  <p className="text-xs text-gray-500">Video</p>
                </div>
              </div>
              <StatusIcon status={apiStatus.kling} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gray-800 rounded">
                  <Zap className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Sync Labs</p>
                  <p className="text-xs text-gray-500">Lip-sync</p>
                </div>
              </div>
              <StatusIcon status={apiStatus.synclabs} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gray-800 rounded">
                  <Activity className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Cloudflare R2</p>
                  <p className="text-xs text-gray-500">Storage</p>
                </div>
              </div>
              <StatusIcon status={apiStatus.r2} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-gray-100 mb-4">Quick Start Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
              1
            </span>
            <div>
              <p className="font-medium text-gray-200">Configure Voice</p>
              <p className="text-sm text-gray-500 mt-1">
                Set up your ElevenLabs voice in Settings
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
              2
            </span>
            <div>
              <p className="font-medium text-gray-200">Create Project</p>
              <p className="text-sm text-gray-500 mt-1">
                Start a new video project
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
              3
            </span>
            <div>
              <p className="font-medium text-gray-200">Add Scene</p>
              <p className="text-sm text-gray-500 mt-1">
                Describe environment, wardrobe, dialogue
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
              4
            </span>
            <div>
              <p className="font-medium text-gray-200">Generate</p>
              <p className="text-sm text-gray-500 mt-1">
                Click Generate and watch the magic
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
