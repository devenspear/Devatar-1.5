"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Fingerprint,
  Trash2,
  Edit2,
  Star,
  StarOff,
  TestTube,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";

interface IdentityProfile {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  triggerWord: string;
  loraKey: string | null;
  loraUrl: string | null;
  loraScale: number;
  baseModel: string;
  voiceId: string | null;
  voiceModel: string;
  voiceStability: number;
  voiceSimilarity: number;
  voiceStyle: number;
  voiceSpeakerBoost: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    scenes: number;
  };
}

interface SystemStatus {
  digitalTwinAvailable: boolean;
  configuration: {
    falKeyConfigured: boolean;
    defaultLoraConfigured: boolean;
    databaseIdentityCount: number;
    activeIdentityCount: number;
  };
  defaultIdentity: {
    id: string;
    name: string;
    displayName: string;
    hasLora: boolean;
    hasVoice: boolean;
    source: string;
  };
  recommendations: string[];
}

interface TestResult {
  overallStatus: "success" | "partial" | "failed";
  message: string;
  loraValidation?: {
    valid: boolean;
    message: string;
  };
  voiceValidation?: {
    valid: boolean;
    message: string;
  };
  testImage?: {
    success: boolean;
    imageUrl?: string;
    inferenceTime?: number;
    error?: string;
  };
}

// Empty/create modal form state
interface IdentityForm {
  name: string;
  displayName: string;
  description: string;
  triggerWord: string;
  loraUrl: string;
  loraScale: number;
  baseModel: string;
  voiceId: string;
  voiceModel: string;
  isDefault: boolean;
}

const defaultFormState: IdentityForm = {
  name: "",
  displayName: "",
  description: "",
  triggerWord: "TOK_",
  loraUrl: "",
  loraScale: 0.95,
  baseModel: "flux-dev",
  voiceId: "",
  voiceModel: "eleven_turbo_v2_5",
  isDefault: false,
};

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<IdentityProfile[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState<IdentityProfile | null>(null);
  const [formData, setFormData] = useState<IdentityForm>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Test states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Fetch identities and status
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [identitiesRes, statusRes] = await Promise.all([
        fetch("/api/identities"),
        fetch("/api/identities/status"),
      ]);

      if (!identitiesRes.ok) throw new Error("Failed to fetch identities");
      if (!statusRes.ok) throw new Error("Failed to fetch status");

      const identitiesData = await identitiesRes.json();
      const statusData = await statusRes.json();

      setIdentities(identitiesData.identities || []);
      setSystemStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create identity
  async function handleCreate() {
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create identity");
      }

      setShowCreateModal(false);
      setFormData(defaultFormState);
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  // Update identity
  async function handleUpdate() {
    if (!editingIdentity) return;

    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/identities/${editingIdentity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update identity");
      }

      setShowEditModal(false);
      setEditingIdentity(null);
      setFormData(defaultFormState);
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  // Delete identity
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/identities/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete identity");
      }

      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  // Set as default
  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/identities/${id}/set-default`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to set default");
      }

      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set default");
    }
  }

  // Test identity
  async function handleTest(id: string, withGeneration: boolean = false) {
    setTestingId(id);

    try {
      const res = await fetch(`/api/identities/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testGeneration: withGeneration }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Test failed");
      }

      setTestResults((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          overallStatus: "failed",
          message: err instanceof Error ? err.message : "Test failed",
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  // Open edit modal
  function openEditModal(identity: IdentityProfile) {
    setEditingIdentity(identity);
    setFormData({
      name: identity.name,
      displayName: identity.displayName,
      description: identity.description || "",
      triggerWord: identity.triggerWord,
      loraUrl: identity.loraUrl || "",
      loraScale: identity.loraScale,
      baseModel: identity.baseModel,
      voiceId: identity.voiceId || "",
      voiceModel: identity.voiceModel,
      isDefault: identity.isDefault,
    });
    setFormError(null);
    setShowEditModal(true);
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
            <Fingerprint className="w-7 h-7 text-blue-400" />
            Identity Profiles
          </h1>
          <p className="text-gray-500 mt-1">
            Manage Digital Twin identities for consistent avatar generation
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(defaultFormState);
            setFormError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Identity
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* System Status Card */}
      {systemStatus && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-500" />
              Digital Twin System Status
            </h2>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                systemStatus.digitalTwinAvailable
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {systemStatus.digitalTwinAvailable ? "Ready" : "Not Configured"}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Fal.ai API</div>
              <div className="flex items-center gap-2 mt-1">
                {systemStatus.configuration.falKeyConfigured ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-gray-200">
                  {systemStatus.configuration.falKeyConfigured ? "Configured" : "Missing"}
                </span>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Default LoRA</div>
              <div className="flex items-center gap-2 mt-1">
                {systemStatus.configuration.defaultLoraConfigured ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-yellow-500" />
                )}
                <span className="text-gray-200">
                  {systemStatus.configuration.defaultLoraConfigured ? "Uploaded" : "Pending"}
                </span>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Identities</div>
              <div className="text-lg font-semibold text-gray-200">
                {systemStatus.configuration.activeIdentityCount} / {systemStatus.configuration.databaseIdentityCount}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Default Identity</div>
              <div className="text-gray-200 truncate">
                {systemStatus.defaultIdentity.displayName}
              </div>
              <div className="text-xs text-gray-500">
                via {systemStatus.defaultIdentity.source}
              </div>
            </div>
          </div>

          {systemStatus.recommendations.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
                <AlertTriangle className="w-4 h-4" />
                Recommendations
              </div>
              <ul className="text-sm text-yellow-300/80 space-y-1">
                {systemStatus.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Identities List */}
      <div className="space-y-4">
        {identities.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Fingerprint className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Identity Profiles</h3>
            <p className="text-gray-500 mb-4">
              Create your first identity profile to enable Digital Twin generation
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Identity
            </button>
          </div>
        ) : (
          identities.map((identity) => {
            const testResult = testResults[identity.id];

            return (
              <div
                key={identity.id}
                className={`bg-gray-900 border rounded-xl p-5 ${
                  identity.isDefault
                    ? "border-blue-500/30 bg-blue-500/5"
                    : "border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        identity.isDefault
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      <Fingerprint className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-100">{identity.displayName}</h3>
                        {identity.isDefault && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                        {!identity.isActive && (
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="font-mono">{identity.triggerWord}</span>
                        {identity.description && (
                          <span className="ml-2 text-gray-600">• {identity.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          LoRA: {identity.loraUrl ? (
                            <span className="text-green-400">Configured</span>
                          ) : (
                            <span className="text-yellow-400">Not set</span>
                          )}
                        </span>
                        <span>
                          Voice: {identity.voiceId ? (
                            <span className="text-green-400">Configured</span>
                          ) : (
                            <span className="text-gray-600">Default</span>
                          )}
                        </span>
                        <span>
                          Scenes: {identity._count?.scenes || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(identity.id)}
                      disabled={testingId === identity.id}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                      title="Test Configuration"
                    >
                      {testingId === identity.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </button>

                    {!identity.isDefault && (
                      <button
                        onClick={() => handleSetDefault(identity.id)}
                        className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Set as Default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}

                    {identity.isDefault && (
                      <div
                        className="p-2 text-yellow-400"
                        title="Default Identity"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    )}

                    <button
                      onClick={() => openEditModal(identity)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(identity.id, identity.displayName)}
                      disabled={(identity._count?.scenes || 0) > 0}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={(identity._count?.scenes || 0) > 0 ? "Cannot delete - has scenes" : "Delete"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Test Results */}
                {testResult && (
                  <div
                    className={`mt-4 p-3 rounded-lg border ${
                      testResult.overallStatus === "success"
                        ? "bg-green-500/10 border-green-500/20"
                        : testResult.overallStatus === "partial"
                        ? "bg-yellow-500/10 border-yellow-500/20"
                        : "bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.overallStatus === "success" && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {testResult.overallStatus === "partial" && (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      {testResult.overallStatus === "failed" && (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span
                        className={
                          testResult.overallStatus === "success"
                            ? "text-green-400"
                            : testResult.overallStatus === "partial"
                            ? "text-yellow-400"
                            : "text-red-400"
                        }
                      >
                        {testResult.overallStatus === "success"
                          ? "All Tests Passed"
                          : testResult.overallStatus === "partial"
                          ? "Partial Success"
                          : "Test Failed"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{testResult.message}</p>

                    {testResult.testImage?.success && testResult.testImage.imageUrl && (
                      <div className="mt-3">
                        <a
                          href={testResult.testImage.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                        >
                          View Test Image <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-100">Create Identity Profile</h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure a new Digital Twin identity for avatar generation
              </p>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name (unique ID) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, "-") })}
                    placeholder="deven-primary"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Deven Spear"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Trigger Word *
                </label>
                <input
                  type="text"
                  value={formData.triggerWord}
                  onChange={(e) => setFormData({ ...formData, triggerWord: e.target.value.toUpperCase().replace(/\s/g, "_") })}
                  placeholder="TOK_DEVEN"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Used in prompts to activate the identity</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Primary digital twin identity"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  LoRA URL
                </label>
                <input
                  type="text"
                  value={formData.loraUrl}
                  onChange={(e) => setFormData({ ...formData, loraUrl: e.target.value })}
                  placeholder="https://your-r2-bucket.com/model.safetensors"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">URL to your trained .safetensors file (add later if not ready)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    LoRA Scale
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.loraScale}
                    onChange={(e) => setFormData({ ...formData, loraScale: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Base Model
                  </label>
                  <select
                    value={formData.baseModel}
                    onChange={(e) => setFormData({ ...formData, baseModel: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="flux-dev">Flux Dev (Higher quality)</option>
                    <option value="flux-schnell">Flux Schnell (Faster)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ElevenLabs Voice ID
                </label>
                <input
                  type="text"
                  value={formData.voiceId}
                  onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                  placeholder="h6Kw30FABVwQChfBVQXC"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use default voice</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-300">
                  Set as default identity
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name || !formData.displayName || !formData.triggerWord}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Identity"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingIdentity && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-100">Edit Identity Profile</h2>
              <p className="text-sm text-gray-500 mt-1">
                Update {editingIdentity.displayName}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name (unique ID)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, "-") })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Trigger Word
                </label>
                <input
                  type="text"
                  value={formData.triggerWord}
                  onChange={(e) => setFormData({ ...formData, triggerWord: e.target.value.toUpperCase().replace(/\s/g, "_") })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  LoRA URL
                </label>
                <input
                  type="text"
                  value={formData.loraUrl}
                  onChange={(e) => setFormData({ ...formData, loraUrl: e.target.value })}
                  placeholder="https://your-r2-bucket.com/model.safetensors"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    LoRA Scale
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.loraScale}
                    onChange={(e) => setFormData({ ...formData, loraScale: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Base Model
                  </label>
                  <select
                    value={formData.baseModel}
                    onChange={(e) => setFormData({ ...formData, baseModel: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="flux-dev">Flux Dev (Higher quality)</option>
                    <option value="flux-schnell">Flux Schnell (Faster)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ElevenLabs Voice ID
                </label>
                <input
                  type="text"
                  value={formData.voiceId}
                  onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                  placeholder="h6Kw30FABVwQChfBVQXC"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingIdentity(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
