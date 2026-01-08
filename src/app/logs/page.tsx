"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Activity } from "lucide-react";

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
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
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
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Generation Logs</h1>
          <p className="text-gray-500 mt-1">
            View activity and debug generation issues
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={filter.level}
          onChange={(e) => setFilter({ ...filter, level: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Steps</option>
          <option value="AUDIO_GENERATION">Audio</option>
          <option value="IMAGE_GENERATION">Image</option>
          <option value="VIDEO_GENERATION">Video</option>
          <option value="LIPSYNC_APPLICATION">Lip-sync</option>
          <option value="SOUND_FX_MIXING">Sound FX</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-400">No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-800 bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Step
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Provider
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${LEVEL_COLORS[log.level] || "text-gray-400"}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {log.step.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 max-w-md truncate">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.provider || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
