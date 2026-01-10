"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  FolderPlus,
  Folder,
  Film,
  X,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: "TRAINING_VIDEO" | "HEADSHOT" | "VOICE_SAMPLE" | "BACKGROUND" | "SOUND_EFFECT" | "SCENE_IMAGE";
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  r2Key: string;
  r2Url: string | null;
  mimeType: string;
  sizeBytes: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  elevenLabsVoiceId: string | null;
  folder: string | null;
  createdAt: string;
  signedUrl?: string;
}

type AssetType = Asset["type"];

const TYPE_CONFIG: Record<AssetType, { label: string; icon: typeof ImageIcon; accept: string; description: string }> = {
  HEADSHOT: {
    label: "Reference Photos",
    icon: User,
    accept: "image/jpeg,image/png,image/webp",
    description: "High-quality photos of Deven for video generation",
  },
  SCENE_IMAGE: {
    label: "Scene Images",
    icon: Film,
    accept: "image/jpeg,image/png,image/webp",
    description: "Complete scenes with avatar for animation (created in Nano Banana, etc.)",
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
    description: "Custom backgrounds for scenes (without avatar)",
  },
  SOUND_EFFECT: {
    label: "Sound Effects",
    icon: Sparkles,
    accept: "audio/mpeg,audio/wav",
    description: "Audio effects for scene enhancement",
  },
};

// Default folders for organizing images
const DEFAULT_FOLDERS = [
  "All",
  "Conference Scenes",
  "Studio Shots",
  "Outdoor Scenes",
  "Product Demos",
  "Custom",
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<AssetType>("HEADSHOT");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [defaultHeadshotId, setDefaultHeadshotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Folder state
  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Filter assets by folder
  const filteredAssets = activeFolder === "All"
    ? assets
    : assets.filter(asset => asset.folder === activeFolder);

  useEffect(() => {
    fetchAssets();
    if (activeType === "HEADSHOT") {
      fetchDefaultHeadshot();
    }
  }, [activeType]);

  async function fetchDefaultHeadshot() {
    try {
      const res = await fetch("/api/settings?key=default_headshot_id");
      if (res.ok) {
        const data = await res.json();
        setDefaultHeadshotId(data.value || null);
      }
    } catch (error) {
      console.error("Error fetching default headshot:", error);
    }
  }

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

  // Core upload function that handles both file input and drag-drop
  async function uploadFiles(files: FileList | File[]) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress("Preparing upload...");

    const fileArray = Array.from(files);
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Uploading ${file.name} (${i + 1}/${fileArray.length})...`);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("type", activeType);
      // Add folder if not "All"
      if (activeFolder !== "All") {
        formData.append("folder", activeFolder);
      }

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
    setIsDragging(false);
    fetchAssets();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files) {
      await uploadFiles(files);
    }
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Filter files based on active type's accepted formats
      const acceptedTypes = TYPE_CONFIG[activeType].accept.split(",");
      const validFiles = Array.from(files).filter(file =>
        acceptedTypes.some(type => file.type === type || file.type.startsWith(type.replace("/*", "/")))
      );

      if (validFiles.length > 0) {
        await uploadFiles(validFiles);
      } else {
        alert(`Please drop valid ${TYPE_CONFIG[activeType].label.toLowerCase()} files`);
      }
    }
  }, [activeType]);

  // Create new folder
  function handleCreateFolder() {
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      setFolders([...folders, newFolderName.trim()]);
      setActiveFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolderInput(false);
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
      setDefaultHeadshotId(assetId);
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

      {/* Folder Tabs (for image types) */}
      {(activeType === "HEADSHOT" || activeType === "SCENE_IMAGE" || activeType === "BACKGROUND") && (
        <div className="flex items-center gap-2 flex-wrap">
          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeFolder === folder
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
            >
              <Folder className="w-3.5 h-3.5 inline mr-1.5" />
              {folder}
            </button>
          ))}

          {/* New Folder Button */}
          {showNewFolderInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder="Folder name..."
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500 w-36"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}
                className="p-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-dashed border-gray-600"
            >
              <FolderPlus className="w-3.5 h-3.5 inline mr-1.5" />
              New Folder
            </button>
          )}
        </div>
      )}

      {/* Upload Area with Drag and Drop */}
      <div
        className={`bg-gray-900 border rounded-xl p-6 relative transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-800"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-600/20 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center z-10">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-3 text-blue-400" />
              <p className="text-blue-400 font-medium text-lg">Drop files to upload</p>
              <p className="text-blue-300/70 text-sm mt-1">
                {activeFolder !== "All" ? `Will be added to "${activeFolder}"` : "Drop anywhere"}
              </p>
            </div>
          </div>
        )}

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
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-lg">
            <TypeIcon className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-500 mb-2">
              {activeFolder !== "All"
                ? `No ${config.label.toLowerCase()} in "${activeFolder}"`
                : `No ${config.label.toLowerCase()} uploaded yet`}
            </p>
            <p className="text-gray-600 text-sm">
              Drag and drop files here or click Upload above
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isDefault={asset.id === defaultHeadshotId}
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
  isDefault,
  onDelete,
  onSetDefault,
}: {
  asset: Asset;
  isDefault?: boolean;
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

    if (asset.type === "HEADSHOT" || asset.type === "BACKGROUND" || asset.type === "SCENE_IMAGE") {
      fetchSignedUrl();
    }
  }, [asset.id, asset.type]);

  const isImage = asset.type === "HEADSHOT" || asset.type === "BACKGROUND" || asset.type === "SCENE_IMAGE";
  const isVideo = asset.type === "TRAINING_VIDEO";

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden group ${isDefault ? "ring-2 ring-green-500" : "border border-gray-700"}`}>
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

        {/* Default Badge */}
        {isDefault && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-600 rounded text-xs text-white flex items-center gap-1 font-medium">
            <CheckCircle className="w-3 h-3" />
            Default
          </div>
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
          {onSetDefault && !isDefault && (
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
