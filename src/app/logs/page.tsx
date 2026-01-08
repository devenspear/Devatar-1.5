"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface Log {
  id: string;
  level: string;
  step: string;
  message: string;
  provider: string | null;
  createdAt: string;
  scene?: {
    name: string;
  };
  project?: {
    name: string;
  };
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "text-gray-500",
  INFO: "text-blue-500",
  WARN: "text-yellow-500",
  ERROR: "text-red-500",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    level: "",
    step: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.level) params.set("level", filter.level);
      if (filter.step) params.set("step", filter.step);

      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="text-xl font-bold">Generation Logs</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filter.level}
            onChange={(e) => setFilter({ ...filter, level: e.target.value })}
            className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Levels</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warning</option>
            <option value="ERROR">Error</option>
          </select>

          <select
            value={filter.step}
            onChange={(e) => setFilter({ ...filter, step: e.target.value })}
            className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Steps</option>
            <option value="AUDIO_GENERATION">Audio</option>
            <option value="IMAGE_GENERATION">Image</option>
            <option value="VIDEO_GENERATION">Video</option>
            <option value="LIPSYNC_APPLICATION">Lip-sync</option>
            <option value="SOUND_FX_MIXING">Sound FX</option>
          </select>

          <button
            onClick={fetchLogs}
            className="ml-auto px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Step
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Provider
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border">
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${LEVEL_COLORS[log.level] || ""}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.step.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md truncate">
                        {log.message}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.provider || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
