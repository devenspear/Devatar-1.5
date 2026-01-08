"use client";

import { useEffect, useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Video,
  Mic,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Sparkles,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: "TRAINING_VIDEO" | "HEADSHOT" | "VOICE_SAMPLE" | "BACKGROUND" | "SOUND_EFFECT";
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  r2Key: string;
  r2Url: string | null;
  mimeType: string;
  sizeBytes: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  elevenLabsVoiceId: string | null;
  createdAt: string;
  signedUrl?: string;
}

type AssetType = Asset["type"];

const TYPE_CONFIG: Record<AssetType, { label: string; icon: typeof ImageIcon; accept: string; description: string }> = {
  HEADSHOT: {
    label: "Headshots",
    icon: User,
    accept: "image/jpeg,image/png,image/webp",
    description: "High-quality photos of Deven for video generation",
  },
  TRAINING_VIDEO: {
    label: "Training Videos",
    icon: Video,
    accept: "video/mp4,video/quicktime,video/webm",
    description: "4K green screen footage for avatar training",
  },
  VOICE_SAMPLE: {
    label: "Voice Samples",
    icon: Mic,
    accept: "audio/mpeg,audio/wav,audio/m4a",
    description: "Audio recordings for voice cloning",
  },
  BACKGROUND: {
    label: "Backgrounds",
    icon: ImageIcon,
    accept: "image/jpeg,image/png,image/webp",
    description: "Custom backgrounds for scenes",
  },
  SOUND_EFFECT: {
    label: "Sound Effects",
    icon: Sparkles,
    accept: "audio/mpeg,audio/wav",
    description: "Audio effects for scene enhancement",
  },
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<AssetType>("HEADSHOT");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssets();
  }, [activeType]);

  async function fetchAssets() {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?type=${activeType}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress("Preparing upload...");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${file.name} (${i + 1}/${files.length})...`);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("type", activeType);

      try {
        const res = await fetch("/api/assets", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          console.error("Upload failed:", error);
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    setUploading(false);
    setUploadProgress(null);
    fetchAssets();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAssets(assets.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  }

  async function setAsDefaultHeadshot(assetId: string) {
    try {
      // Store in system settings
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "default_headshot_id",
          value: assetId,
        }),
      });
      alert("Set as default headshot!");
    } catch (error) {
      console.error("Error setting default:", error);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  const config = TYPE_CONFIG[activeType];
  const TypeIcon = config.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Avatar Assets</h1>
          <p className="text-gray-500 mt-1">
            Upload and manage training materials for Deven's digital twin
          </p>
        </div>
      </div>

      {/* Deven's Identity Card */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-full">
            <User className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Deven's Avatar Identity</h2>
            <p className="text-gray-400 text-sm">
              Voice: <span className="text-blue-400">DevenPro2026</span> (h6Kw30FABVwQChfBVQXC)
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 text-sm font-medium">Voice Ready</span>
          </div>
        </div>
      </div>

      {/* Asset Type Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        {(Object.keys(TYPE_CONFIG) as AssetType[]).map((type) => {
          const { label, icon: Icon } = TYPE_CONFIG[type];
          const isActive = activeType === type;
          const count = type === activeType ? assets.length : null;

          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== null && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  isActive ? "bg-blue-500" : "bg-gray-700"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload Area */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-100">{config.label}</h3>
            <p className="text-gray-500 text-sm">{config.description}</p>
          </div>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors cursor-pointer">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {config.label}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={config.accept}
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {uploadProgress && (
          <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          </div>
        )}

        {/* Assets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-lg">
            <TypeIcon className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-500 mb-2">No {config.label.toLowerCase()} uploaded yet</p>
            <p className="text-gray-600 text-sm">
              Drag and drop files here or click Upload above
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={() => deleteAsset(asset.id)}
                onSetDefault={
                  asset.type === "HEADSHOT"
                    ? () => setAsDefaultHeadshot(asset.id)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Usage Guide */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-gray-100 mb-3">How Avatar Assets Work</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-gray-200">Headshots</span>
            </div>
            <p className="text-gray-500">
              Upload high-quality photos. These are sent directly to Kling AI to create video of YOU,
              bypassing AI image generation.
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-gray-200">Training Videos</span>
            </div>
            <p className="text-gray-500">
              4K green screen footage provides reference material for more advanced avatar training
              and consistency.
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-green-400" />
              <span className="font-medium text-gray-200">Voice Samples</span>
            </div>
            <p className="text-gray-500">
              Your voice clone (DevenPro2026) is already configured. Additional samples can
              improve quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  onDelete,
  onSetDefault,
}: {
  asset: Asset;
  onDelete: () => void;
  onSetDefault?: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch signed URL for the asset
    async function fetchSignedUrl() {
      try {
        const res = await fetch(`/api/assets/${asset.id}`);
        if (res.ok) {
          const data = await res.json();
          setImageUrl(data.signedUrl);
        }
      } catch (error) {
        console.error("Error fetching signed URL:", error);
      }
    }

    if (asset.type === "HEADSHOT" || asset.type === "BACKGROUND") {
      fetchSignedUrl();
    }
  }, [asset.id, asset.type]);

  const isImage = asset.type === "HEADSHOT" || asset.type === "BACKGROUND";
  const isVideo = asset.type === "TRAINING_VIDEO";

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden group">
      {/* Preview */}
      <div className="aspect-square bg-gray-900 flex items-center justify-center relative">
        {isImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : isVideo ? (
          <Video className="w-12 h-12 text-gray-600" />
        ) : (
          <Mic className="w-12 h-12 text-gray-600" />
        )}

        {/* Status Badge */}
        {asset.status !== "READY" && (
          <div className="absolute top-2 right-2">
            {asset.status === "UPLOADING" && (
              <div className="px-2 py-1 bg-blue-600/80 rounded text-xs text-white flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading
              </div>
            )}
            {asset.status === "FAILED" && (
              <div className="px-2 py-1 bg-red-600/80 rounded text-xs text-white flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Failed
              </div>
            )}
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onSetDefault && (
            <button
              onClick={onSetDefault}
              className="p-2 bg-blue-600 rounded-full hover:bg-blue-500 transition-colors"
              title="Set as default headshot"
            >
              <CheckCircle className="w-4 h-4 text-white" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 bg-red-600 rounded-full hover:bg-red-500 transition-colors"
            title="Delete asset"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm text-gray-200 truncate" title={asset.name}>
          {asset.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(asset.sizeBytes)}
        </p>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
