"use client";

import React, { useState, useRef } from "react";
import {
  Palette,
  Check,
  Type,
  Eye,
  EyeOff,
  Sparkles,
  Image as ImageIcon,
  LayoutTemplate,
  Trash2,
  Upload,
  Plus,
  RotateCcw,
  X,
  Layers,
  Sliders,
  Move,
  Volume2,
  VolumeX,
  Crop,
  Video,
  Maximize2,
  Pencil,
  RefreshCw,
  Undo2,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { useStudioStore } from "@/stores/studio.store";
import { useAuthStore } from "@/stores/auth.store";
import { StageOverlayAsset } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const DEFAULT_CYBER_NEON_URL = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80";

interface CustomBgItem {
  id: string;
  name: string;
  url: string;
}

const STUDIO_SAMPLE_MEDIA = [
  {
    id: "media-speaker-badge",
    name: "Round Speaker Badge",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    cropMode: "circle" as const,
    description: "Speaker circular avatar badge for hosts or guests",
  },
  {
    id: "media-sponsor-spotlight",
    name: "Sponsor Spotlight Card",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
    cropMode: "cover" as const,
    description: "Premium sponsor banner with clean glass border",
  },
  {
    id: "media-qa-graphic",
    name: "Live Q&A Box",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    cropMode: "cover" as const,
    description: "Audience questions and chat callout box",
  },
  {
    id: "media-breaking-alert",
    name: "Breaking Alert Graphic",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80",
    cropMode: "cover" as const,
    description: "High priority breaking news headline badge",
  },
  {
    id: "media-video-fire",
    name: "Video Showcase Clip",
    type: "video" as const,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    cropMode: "cover" as const,
    description: "Full HD looping video overlay for products or promos",
  },
  {
    id: "media-neon-frame",
    name: "Cyber Neon Frame",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80",
    cropMode: "cover" as const,
    description: "Futuristic neon glowing frame overlay",
  },
  {
    id: "media-speaker-male",
    name: "Speaker Avatar (Co-Host)",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    cropMode: "circle" as const,
    description: "Co-host circular avatar badge",
  },
  {
    id: "media-brand-sponsor",
    name: "Sponsor Brand Card",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80",
    cropMode: "cover" as const,
    description: "Corporate sponsor logo and card",
  },
];

export const BrandPanel: React.FC = () => {
  const { user } = useAuthStore();
  const defaultHostName = user?.name || "Host Speaker";

  const {
    showLogo,
    logoUrl,
    setLogo,
    logoPosition,
    setLogoPosition,
    activeBackgroundUrl,
    setBackground,
    activeOverlayUrl,
    setOverlay,
    activeStageOverlay,
    setStageOverlay,
    toggleStageOverlay,
    updateStageOverlay,
    toggleStageOverlayVisibility,
    overlayHistory,
    saveToOverlayHistory,
    updateOverlayInHistory,
    removeFromOverlayHistory,
    restoreDefaultOverlays,
    activeThemeColor,
    setThemeColor,
    activeBanner,
    setBanner,
    tickerText,
    showTicker,
    setTicker,
  } = useStudioStore();

  const [logoTextInput, setLogoTextInput] = useState(logoUrl || "LIVESTUDIO");
  const [customBgInput, setCustomBgInput] = useState("");
  const [bannerTitle, setBannerTitle] = useState(activeBanner?.title || defaultHostName);
  const [bannerSubtitle, setBannerSubtitle] = useState(activeBanner?.subtitle || "Live Presenter");
  const [tickerInput, setTickerInput] = useState(tickerText);

  // Overlay File Upload & State
  const overlayFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingOverlayId, setReplacingOverlayId] = useState<string | null>(null);
  const [recentlyDeletedOverlay, setRecentlyDeletedOverlay] = useState<StageOverlayAsset | null>(null);
  const [overlayUploadError, setOverlayUploadError] = useState<string | null>(null);
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  // Modal State for Replacing Media and Browsing Media Library
  const [targetReplaceOverlay, setTargetReplaceOverlay] = useState<StageOverlayAsset | null>(null);
  const [isMediaLibraryModalOpen, setIsMediaLibraryModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"library" | "upload" | "url">("library");
  const [newMediaUrl, setNewMediaUrl] = useState<string>("");
  const [newMediaType, setNewMediaType] = useState<"image" | "video">("image");
  const [newMediaName, setNewMediaName] = useState<string>("");
  const [newCropMode, setNewCropMode] = useState<"fit" | "cover" | "square" | "circle">("fit");
  const [urlInput, setUrlInput] = useState<string>("");

  const openReplaceModal = (item: StageOverlayAsset, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetReplaceOverlay(item);
    setNewMediaUrl(item.url);
    setNewMediaType(item.type);
    setNewMediaName(item.name);
    setNewCropMode(item.cropMode || "fit");
    setUrlInput(item.url.startsWith("http") ? item.url : "");
    setModalTab("library");
  };

  const handleModalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const fileUrl = URL.createObjectURL(file);
    setNewMediaUrl(fileUrl);
    setNewMediaType(isVideo ? "video" : "image");
    if (!newMediaName || newMediaName === targetReplaceOverlay?.name) {
      setNewMediaName(file.name.replace(/\.[^/.]+$/, "").slice(0, 18));
    }
    e.target.value = "";
  };

  const handleSaveReplacedMedia = () => {
    if (!targetReplaceOverlay || !newMediaUrl) return;
    updateOverlayInHistory(targetReplaceOverlay.id, {
      url: newMediaUrl,
      type: newMediaType,
      name: newMediaName.trim() || targetReplaceOverlay.name,
      cropMode: newCropMode,
    });
    setTargetReplaceOverlay(null);
  };

  const handleSelectFromMediaLibrary = (asset: (typeof STUDIO_SAMPLE_MEDIA)[0]) => {
    const newOverlay: StageOverlayAsset = {
      id: `overlay-${Date.now()}`,
      name: asset.name,
      type: asset.type,
      url: asset.url,
      position: "top-right",
      scale: 30,
      cropMode: asset.cropMode,
      borderRadius: asset.cropMode === "circle" ? 9999 : 16,
      opacity: 100,
      isShowing: true,
      isMuted: true,
      isLooping: true,
    };
    saveToOverlayHistory(newOverlay);
    setStageOverlay(newOverlay);
    setIsMediaLibraryModalOpen(false);
  };

  const handleResetSamples = () => {
    restoreDefaultOverlays();
    setResetSuccessNotice("All 6 sample overlays (Round Speaker Badge, Sponsor Spotlight, etc.) restored!");
    setTimeout(() => setResetSuccessNotice(null), 4000);
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingOverlayId) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      setOverlayUploadError("Please select a valid image (PNG, JPG, GIF) or video (MP4, WebM).");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setOverlayUploadError("File size must be under 30MB.");
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    updateOverlayInHistory(replacingOverlayId, {
      url: fileUrl,
      name: file.name.replace(/\.[^/.]+$/, "").slice(0, 18),
      type: isVideo ? "video" : "image",
    });
    setReplacingOverlayId(null);
    e.target.value = "";
  };

  const handleDeleteWithUndo = (item: StageOverlayAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentlyDeletedOverlay(item);
    removeFromOverlayHistory(item.id);
    setTimeout(() => {
      setRecentlyDeletedOverlay((cur) => (cur?.id === item.id ? null : cur));
    }, 8000);
  };

  const handleUndoDelete = () => {
    if (recentlyDeletedOverlay) {
      saveToOverlayHistory(recentlyDeletedOverlay);
      setRecentlyDeletedOverlay(null);
    }
  };


  const handleOverlayFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      setOverlayUploadError("Please upload an image (PNG, JPG, WebP, GIF) or video (MP4, WebM).");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setOverlayUploadError("File size must be under 30MB.");
      return;
    }

    setOverlayUploadError(null);
    const fileUrl = URL.createObjectURL(file);
    const newOverlay: StageOverlayAsset = {
      id: `overlay-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, "").slice(0, 18),
      type: isVideo ? "video" : "image",
      url: fileUrl,
      position: "top-right",
      scale: 35,
      cropMode: isVideo ? "cover" : "fit",
      borderRadius: 16,
      opacity: 100,
      isShowing: true,
      isMuted: true,
      isLooping: true,
    };

    setStageOverlay(newOverlay);
    saveToOverlayHistory(newOverlay);
    e.target.value = "";
  };

  // File Upload State for Custom Virtual Backgrounds
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customBgs, setCustomBgs] = useState<CustomBgItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("livestudio_custom_bgs");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse custom backgrounds:", e);
      }
    }
    return [];
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (PNG, JPG, WebP, SVG).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image size must be under 10MB.");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newItem: CustomBgItem = {
          id: `custom-bg-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, "").slice(0, 16),
          url: dataUrl,
        };
        const updated = [newItem, ...customBgs.filter((b) => b.name !== newItem.name)];
        setCustomBgs(updated);
        try {
          localStorage.setItem("livestudio_custom_bgs", JSON.stringify(updated.slice(0, 8)));
        } catch {
          // localStorage quota safety
        }
        setBackground(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteCustomBg = (e: React.MouseEvent, id: string, url: string) => {
    e.stopPropagation();
    const updated = customBgs.filter((b) => b.id !== id);
    setCustomBgs(updated);
    try {
      localStorage.setItem("livestudio_custom_bgs", JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (activeBackgroundUrl === url) {
      setBackground(DEFAULT_CYBER_NEON_URL);
    }
  };

  const colors = [
    "#6366f1", // Indigo
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f43f5e", // Rose
    "#8b5cf6", // Purple
    "#f59e0b", // Amber
  ];

  const backgroundPresets = [
    {
      id: "cyberpunk",
      name: "Cyber Neon (Default)",
      url: DEFAULT_CYBER_NEON_URL,
    },
    {
      id: "midnight",
      name: "Midnight Studio",
      url: null,
      gradient: "from-[#050508] to-[#0c0c16]",
    },
    {
      id: "minimal",
      name: "Minimal Slate",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
    },
    {
      id: "aurora",
      name: "Deep Aurora",
      url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80",
    },
  ];

  const lowerThirdPresets = [
    { title: defaultHostName, subtitle: "Host / Presenter", color: "#6366f1" },
    { title: "Live Q&A Session", subtitle: "Ask Questions in Live Chat", color: "#06b6d4" },
    { title: "BREAKING LIVESTREAM", subtitle: "Official Broadcast", color: "#f43f5e" },
  ];

  const handleUpdateBanner = () => {
    setBanner({
      id: `banner-${Date.now()}`,
      title: bannerTitle,
      subtitle: bannerSubtitle,
      themeColor: activeThemeColor,
      isShowing: true,
    });
  };

  const handleApplyPreset = (preset: { title: string; subtitle: string; color: string }) => {
    // If this preset is already active and live on stage, toggle it OFF (hide)!
    if (activeBanner?.title === preset.title && activeBanner?.isShowing) {
      setBanner(null);
      return;
    }
    setBannerTitle(preset.title);
    setBannerSubtitle(preset.subtitle);
    setThemeColor(preset.color);
    setBanner({
      id: `banner-${Date.now()}`,
      title: preset.title,
      subtitle: preset.subtitle,
      themeColor: preset.color,
      isShowing: true,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 custom-scrollbar text-xs">
      {/* 1. Brand Color Theme */}
      <div className="space-y-2">
        <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          Brand Theme Accent
        </h4>
        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setThemeColor(c)}
              style={{ backgroundColor: c }}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-md relative"
            >
              {activeThemeColor === c && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Watermark Logo & 4 Corners */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            Watermark Logo
          </h4>
          <button
            onClick={() => setLogo(logoTextInput, !showLogo)}
            className="text-indigo-400 font-medium hover:underline flex items-center gap-1"
          >
            {showLogo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showLogo ? "Visible" : "Hidden"}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={logoTextInput}
              onChange={(e) => {
                setLogoTextInput(e.target.value);
                setLogo(e.target.value, showLogo);
              }}
              placeholder="Watermark Text or URL"
              className="flex-1 h-8 px-3 rounded-lg bg-surface border border-white/10 text-white font-mono uppercase text-xs"
            />
          </div>

          {/* 4 Corner Positions */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400">Position on Stage</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "top-left" as const, label: "↖ Top Left" },
                { id: "top-right" as const, label: "↗ Top Right" },
                { id: "bottom-left" as const, label: "↙ Bottom Left" },
                { id: "bottom-right" as const, label: "↘ Bottom Right" },
              ].map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setLogoPosition(pos.id)}
                  className={cn(
                    "py-1.5 px-2 rounded-lg border text-center transition-all",
                    logoPosition === pos.id
                      ? "bg-indigo-600 border-indigo-400 text-white font-medium"
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                  )}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stage Virtual Backgrounds */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            Stage Virtual Background
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBackground(DEFAULT_CYBER_NEON_URL)}
              title="Reset to default Cyber Neon background"
              className={cn(
                "text-[10px] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded",
                activeBackgroundUrl === DEFAULT_CYBER_NEON_URL
                  ? "text-indigo-400 bg-indigo-500/15 font-semibold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Default
            </button>
            {activeBackgroundUrl && (
              <button
                onClick={() => setBackground(null)}
                title="Remove virtual background"
                className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="w-2.5 h-2.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Device Image Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium group cursor-pointer shadow-sm"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>Upload Image from Device (PNG / JPG)</span>
        </button>

        {uploadError && (
          <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-1.5">
            {uploadError}
          </p>
        )}

        {/* User's Uploaded Custom Backgrounds */}
        {customBgs.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Your Uploaded Backgrounds</span>
            <div className="grid grid-cols-2 gap-2">
              {customBgs.map((bg) => {
                const isSelected = activeBackgroundUrl === bg.url;
                return (
                  <div
                    key={bg.id}
                    onClick={() => setBackground(bg.url)}
                    className={cn(
                      "h-16 rounded-xl border relative overflow-hidden transition-all text-left p-2 flex flex-col justify-end group cursor-pointer",
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg"
                        : "border-white/10 hover:border-white/30"
                    )}
                    style={{
                      backgroundImage: `url(${bg.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                    <span className="relative z-10 text-[10px] font-bold text-white drop-shadow truncate">
                      {bg.name}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 left-1 z-10 p-0.5 rounded-full bg-emerald-500 text-white">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteCustomBg(e, bg.id, bg.url)}
                      title="Delete uploaded image"
                      className="absolute top-1 right-1 z-20 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preset Backgrounds */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 font-medium">Studio Presets</span>
          <div className="grid grid-cols-2 gap-2">
            {backgroundPresets.map((bg) => {
              const isSelected = activeBackgroundUrl === bg.url;
              return (
                <button
                  key={bg.id}
                  onClick={() => setBackground(bg.url)}
                  className={cn(
                    "h-16 rounded-xl border relative overflow-hidden transition-all text-left p-2 flex flex-col justify-end group",
                    isSelected
                      ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg"
                      : "border-white/10 hover:border-white/30"
                  )}
                  style={{
                    backgroundImage: bg.url ? `url(${bg.url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {!bg.url && <div className={cn("absolute inset-0 bg-gradient-to-br", bg.gradient)} />}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <span className="relative z-10 text-[10px] font-bold text-white drop-shadow">
                    {bg.name}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 z-10 p-0.5 rounded-full bg-indigo-500 text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Image URL fallback */}
        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={customBgInput}
            onChange={(e) => setCustomBgInput(e.target.value)}
            placeholder="Or enter Image URL..."
            className="flex-1 h-7 px-2.5 rounded-lg bg-surface border border-white/10 text-white text-[11px]"
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-[10px] px-2.5"
            onClick={() => {
              if (customBgInput.trim()) {
                setBackground(customBgInput.trim());
                setCustomBgInput("");
              }
            }}
          >
            Apply
          </Button>
        </div>
      </div>

      {/* 4. Live Stage Overlays & Floating Media (StreamYard Parity) */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Live Overlays & Floating Media
          </h4>
          {activeStageOverlay && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleStageOverlayVisibility}
                className={cn(
                  "text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors",
                  activeStageOverlay.isShowing
                    ? "text-emerald-400 bg-emerald-500/10 font-medium"
                    : "text-amber-400 bg-amber-500/10 font-medium"
                )}
              >
                {activeStageOverlay.isShowing ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                {activeStageOverlay.isShowing ? "Live" : "Hidden"}
              </button>
              <button
                onClick={() => setStageOverlay(null)}
                className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                title="Remove overlay from stage"
              >
                <Trash2 className="w-2.5 h-2.5" />
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Input for Overlay Upload */}
        <input
          ref={overlayFileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          onChange={handleOverlayFileUpload}
        />

        {/* Hidden File Input for Overlay Replacement */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          onChange={handleReplaceFile}
        />

        {/* Action buttons: Upload File & Browse Media Library */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => overlayFileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium group cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Upload File</span>
          </button>
          <button
            onClick={() => setIsMediaLibraryModalOpen(true)}
            className="py-2.5 px-3 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium group cursor-pointer shadow-sm"
          >
            <FolderOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Media Library</span>
          </button>
        </div>

        {overlayUploadError && (
          <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-1.5">
            {overlayUploadError}
          </p>
        )}

        {/* Active Overlay Live Operations Controller */}
        {activeStageOverlay && (
          <div className="p-3 rounded-2xl bg-[#0e0e1a] border border-indigo-500/30 space-y-3 shadow-xl">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeStageOverlay.type}
                  </span>
                  <span className="font-semibold text-white truncate max-w-[140px] text-xs">
                    {activeStageOverlay.name}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Showing on live stage • Click card below anytime to hide
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openReplaceModal(activeStageOverlay)}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white transition-colors flex items-center gap-1"
                  title="Replace media image or video file"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-400" />
                  Replace
                </button>
                <button
                  onClick={() => setStageOverlay(null)}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                  title="Hide overlay from stage (remains saved in library below)"
                >
                  <EyeOff className="w-3 h-3 text-amber-400" />
                  Hide
                </button>
              </div>
            </div>

            {/* Position Quick-Jump (5 positions) */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Position on Stage</span>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: "top-left" as const, label: "↖ TL" },
                  { id: "top-right" as const, label: "↗ TR" },
                  { id: "center" as const, label: "⏺ Center" },
                  { id: "bottom-left" as const, label: "↙ BL" },
                  { id: "bottom-right" as const, label: "↘ BR" },
                ].map((pos) => {
                  const isCur = activeStageOverlay.position === pos.id;
                  return (
                    <button
                      key={pos.id}
                      onClick={() => updateStageOverlay({ position: pos.id, customCoords: undefined })}
                      className={cn(
                        "py-1 rounded text-center text-[10px] font-medium border transition-all",
                        isCur
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size / Scale Slider + Quick Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-medium">Scale / Resize</span>
                <span className="font-mono text-indigo-300 font-bold">{activeStageOverlay.scale}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={activeStageOverlay.scale}
                onChange={(e) => updateStageOverlay({ scale: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-between pt-0.5">
                {[
                  { label: "20% Sm", val: 20 },
                  { label: "35% Med", val: 35 },
                  { label: "60% Lg", val: 60 },
                  { label: "100% Full", val: 100 },
                ].map((size) => (
                  <button
                    key={size.val}
                    onClick={() => updateStageOverlay({ scale: size.val })}
                    className={cn(
                      "flex-1 py-1 rounded text-[10px] font-mono border text-center transition-colors",
                      activeStageOverlay.scale === size.val
                        ? "bg-indigo-600/30 border-indigo-400 text-indigo-300 font-bold"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop & Shape Controls */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Crop & Shape Mode</span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: "fit" as const, label: "Fit (Ratio)" },
                  { id: "cover" as const, label: "16:9 Fill" },
                  { id: "square" as const, label: "1:1 Square" },
                  { id: "circle" as const, label: "Circle" },
                ].map((mode) => {
                  const isCur = activeStageOverlay.cropMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => updateStageOverlay({ cropMode: mode.id })}
                      className={cn(
                        "py-1 px-1 rounded text-center text-[10px] font-medium border transition-all truncate",
                        isCur
                          ? "bg-indigo-600 border-indigo-400 text-white font-bold"
                          : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-medium">Opacity / Transparency</span>
                <span className="font-mono text-slate-300">{activeStageOverlay.opacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={activeStageOverlay.opacity}
                onChange={(e) => updateStageOverlay({ opacity: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Video-Specific Controls (Mute / Loop) */}
            {activeStageOverlay.type === "video" && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateStageOverlay({ isMuted: !activeStageOverlay.isMuted })}
                  className="flex-1 h-7 text-[10px]"
                >
                  {activeStageOverlay.isMuted ? (
                    <>
                      <VolumeX className="w-3 h-3 mr-1 text-rose-400" />
                      Muted
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3 mr-1 text-emerald-400" />
                      Audio Live
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateStageOverlay({ isLooping: !activeStageOverlay.isLooping })}
                  className={cn(
                    "flex-1 h-7 text-[10px]",
                    activeStageOverlay.isLooping && "text-indigo-300 font-semibold"
                  )}
                >
                  Loop: {activeStageOverlay.isLooping ? "ON" : "OFF"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Unified Overlays Gallery (StreamYard Parity) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Overlays & Badges
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                {overlayHistory.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMediaLibraryModalOpen(true)}
                className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                title="Browse existing studio media assets to add as an overlay"
              >
                <FolderOpen className="w-3 h-3 text-cyan-400" />
                Media Library
              </button>
              <button
                onClick={handleResetSamples}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                title="Restore all default sample overlays (Round Speaker Badge, Sponsor Spotlight, etc.)"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset Samples
              </button>
            </div>
          </div>

          {/* Reset Success Notice */}
          {resetSuccessNotice && (
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>{resetSuccessNotice}</span>
            </div>
          )}

          {/* Undo banner if an overlay was recently deleted */}
          {recentlyDeletedOverlay && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 animate-in fade-in duration-200">
              <span className="text-[11px] truncate mr-2">Removed <strong>{recentlyDeletedOverlay.name}</strong></span>
              <button
                onClick={handleUndoDelete}
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[10px] flex items-center gap-1 transition-colors shrink-0"
              >
                <Undo2 className="w-3 h-3" />
                Undo
              </button>
            </div>
          )}

          {overlayHistory.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-white/10 text-center space-y-2 bg-white/[0.02]">
              <p className="text-xs text-slate-400">No overlays in library.</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => overlayFileInputRef.current?.click()}
                  className="h-7 text-[11px]"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Upload File
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetSamples}
                  className="h-7 text-[11px] text-indigo-300"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore Samples
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {overlayHistory.map((item) => {
                const isLive = activeStageOverlay?.id === item.id && activeStageOverlay.isShowing;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleStageOverlay(item)}
                    className={cn(
                      "group relative rounded-xl border overflow-hidden cursor-pointer transition-all h-24 flex flex-col justify-between p-2.5 bg-surface select-none",
                      isLive
                        ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/15 bg-emerald-950/20"
                        : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Background Preview Thumbnail */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-45 transition-opacity bg-cover bg-center"
                      style={{
                        backgroundImage: item.type === "image" ? `url("${item.url}")` : undefined,
                      }}
                    >
                      {item.type === "video" && (
                        <video
                          src={item.url}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Gradient shade over background */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                    {/* Top Action Row */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/70 text-slate-300 backdrop-blur-sm border border-white/10">
                        {item.type}
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Replace / Edit Media Button */}
                        <button
                          onClick={(e) => openReplaceModal(item, e)}
                          className="p-1 rounded bg-black/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors border border-white/10"
                          title="Manage & Replace image or video"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        {/* Delete / Remove Card */}
                        <button
                          onClick={(e) => handleDeleteWithUndo(item, e)}
                          className="p-1 rounded bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors border border-white/10"
                          title="Delete overlay (Undo available)"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Info & Live Status */}
                    <div className="relative z-10">
                      <div className="font-semibold text-white text-[11px] truncate drop-shadow-md">
                        {item.name}
                      </div>
                      <div className="text-[9px] truncate flex items-center justify-between mt-0.5">
                        {isLive ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            LIVE (Click to Hide)
                          </span>
                        ) : (
                          <span className="text-slate-400 group-hover:text-indigo-300 transition-colors">
                            Click to Show
                          </span>
                        )}
                        <span className="text-slate-400 text-[8px] uppercase">{item.cropMode}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Lower-Third Banners */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
            Lower Third Banners
          </h4>
          {activeBanner?.isShowing && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setBanner(null)}
              className="h-6 text-[10px] px-2 rounded-lg"
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Hide Banner
            </Button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400">Quick Presets (Click to Show / Hide)</span>
          <div className="space-y-1">
            {lowerThirdPresets.map((preset, idx) => {
              const isThisActive = activeBanner?.title === preset.title && activeBanner?.isShowing;
              return (
                <div
                  key={idx}
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    "p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                    isThisActive
                      ? "border-indigo-500 bg-indigo-500/15 text-white shadow-md ring-1 ring-indigo-500/30"
                      : "border-white/5 bg-surface hover:border-white/15 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                    <div className="min-w-0">
                      <div className="font-semibold text-[11px] truncate">{preset.title}</div>
                      <div className="text-[9px] text-slate-400 truncate">{preset.subtitle}</div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-colors",
                      isThisActive
                        ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                        : "bg-white/5 text-indigo-400 hover:bg-white/10"
                    )}
                  >
                    {isThisActive ? "Hide (Live)" : "Show"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Banner Editor */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] text-slate-400">Custom Headline & Subtitle</span>
          <input
            type="text"
            value={bannerTitle}
            onChange={(e) => setBannerTitle(e.target.value)}
            placeholder="Main Name / Headline"
            className="w-full h-8 px-3 rounded-lg bg-surface border border-white/10 text-white"
          />
          <input
            type="text"
            value={bannerSubtitle}
            onChange={(e) => setBannerSubtitle(e.target.value)}
            placeholder="Subtitle / Role / Title"
            className="w-full h-8 px-3 rounded-lg bg-surface border border-white/10 text-white"
          />
          <div className="flex gap-2">
            {activeBanner?.isShowing ? (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => setBanner(null)}
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                  Hide from Stage
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-8 px-3"
                  onClick={handleUpdateBanner}
                  title="Update banner text"
                >
                  Update
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs h-8"
                onClick={handleUpdateBanner}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Show on Stage
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Breaking News Ticker */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            News Ticker Crawl
          </h4>
          <button
            onClick={() => setTicker(tickerInput, !showTicker)}
            className="text-indigo-400 font-medium hover:underline text-[11px]"
          >
            {showTicker ? "Disable" : "Enable"}
          </button>
        </div>
        <textarea
          rows={2}
          value={tickerInput}
          onChange={(e) => setTickerInput(e.target.value)}
          placeholder="Enter scrolling ticker text..."
          className="w-full p-2.5 text-xs rounded-lg bg-surface border border-white/10 text-white resize-none"
        />
        <Button
          variant="secondary"
          size="sm"
          className="w-full text-xs h-8"
          onClick={() => setTicker(tickerInput, true)}
        >
          Update & Push Ticker
        </Button>
      </div>
      {/* Hidden File Input for Modal Upload */}
      <input
        ref={modalFileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        className="hidden"
        onChange={handleModalFileUpload}
      />

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Manage & Replace Overlay Media Modal                   */}
      {/* ────────────────────────────────────────────────────────────── */}
      {targetReplaceOverlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-[#12121e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  Manage & Replace Overlay Media
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Update image, video, name or shape for <strong>{targetReplaceOverlay.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setTargetReplaceOverlay(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {/* Media Comparison Preview */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Current Media</span>
                  <div className="h-24 rounded-lg overflow-hidden border border-white/10 bg-black/60 relative flex items-center justify-center">
                    {targetReplaceOverlay.type === "video" ? (
                      <video src={targetReplaceOverlay.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={targetReplaceOverlay.url} alt="Current" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[8px] px-1 py-0.2 rounded bg-black/70 text-slate-300">
                      {targetReplaceOverlay.cropMode}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold block mb-1">New Selected Media</span>
                  <div className="h-24 rounded-lg overflow-hidden border border-emerald-500/40 bg-black/60 relative flex items-center justify-center">
                    {newMediaType === "video" ? (
                      <video src={newMediaUrl} className="w-full h-full object-cover" autoPlay muted loop />
                    ) : (
                      <img src={newMediaUrl} alt="New" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[8px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/30">
                      {newCropMode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rename input */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-medium">Overlay Title / Name</label>
                <input
                  type="text"
                  value={newMediaName}
                  onChange={(e) => setNewMediaName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Host Speaker Badge"
                />
              </div>

              {/* Source Tabs */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-300 font-medium">Choose New Media Source</label>
                <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalTab("library")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
                      modalTab === "library"
                        ? "bg-indigo-600 text-white shadow-md font-semibold"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Studio Assets
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("upload")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
                      modalTab === "upload"
                        ? "bg-indigo-600 text-white shadow-md font-semibold"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload from Device
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("url")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
                      modalTab === "url"
                        ? "bg-indigo-600 text-white shadow-md font-semibold"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Direct URL
                  </button>
                </div>

                {/* Tab 1: Studio Sample Assets Grid */}
                {modalTab === "library" && (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {STUDIO_SAMPLE_MEDIA.map((asset) => {
                      const isChosen = newMediaUrl === asset.url;
                      return (
                        <div
                          key={asset.id}
                          onClick={() => {
                            setNewMediaUrl(asset.url);
                            setNewMediaType(asset.type);
                            setNewCropMode(asset.cropMode);
                            if (!newMediaName || newMediaName === targetReplaceOverlay.name) {
                              setNewMediaName(asset.name);
                            }
                          }}
                          className={cn(
                            "p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all relative overflow-hidden",
                            isChosen
                              ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500"
                              : "border-white/5 bg-surface hover:border-white/20"
                          )}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                            {asset.type === "video" ? (
                              <video src={asset.url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-white truncate">{asset.name}</div>
                            <div className="text-[9px] text-slate-400 uppercase font-mono">{asset.type} • {asset.cropMode}</div>
                          </div>
                          {isChosen && (
                            <span className="p-0.5 rounded-full bg-emerald-500 text-white">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Upload from Device */}
                {modalTab === "upload" && (
                  <div className="p-5 border-2 border-dashed border-indigo-500/30 rounded-2xl text-center space-y-2 bg-indigo-500/[0.03]">
                    <Upload className="w-6 h-6 text-indigo-400 mx-auto" />
                    <div>
                      <p className="text-xs font-semibold text-white">Upload New Media File</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, GIF, WebP images & MP4, WebM videos (up to 30MB)</p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="h-7 text-xs"
                    >
                      Choose File from Device
                    </Button>
                  </div>
                )}

                {/* Tab 3: Direct URL */}
                {modalTab === "url" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste image or video URL (https://...)"
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={() => {
                        if (urlInput.trim()) {
                          setNewMediaUrl(urlInput.trim());
                          const isVid = urlInput.endsWith(".mp4") || urlInput.endsWith(".webm");
                          setNewMediaType(isVid ? "video" : "image");
                        }
                      }}
                    >
                      Preview
                    </Button>
                  </div>
                )}
              </div>

              {/* Crop Mode Selection */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-medium">Shape / Crop Mode</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "fit" as const, label: "Fit Ratio" },
                    { id: "cover" as const, label: "16:9 Cover" },
                    { id: "square" as const, label: "1:1 Square" },
                    { id: "circle" as const, label: "Circle Badge" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNewCropMode(m.id)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-[10px] font-medium border text-center transition-all",
                        newCropMode === m.id
                          ? "bg-indigo-600 border-indigo-400 text-white font-bold"
                          : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 flex items-center justify-end gap-2 bg-white/[0.02]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTargetReplaceOverlay(null)}
                className="h-8 text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveReplacedMedia}
                className="h-8 text-xs"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Save & Replace Media
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Browse Studio Media Library Modal                      */}
      {/* ────────────────────────────────────────────────────────────── */}
      {isMediaLibraryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-[#12121e] border border-white/15 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  Studio Media Library — Overlays & Graphics
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click any asset below to instantly place it on your stage as a live overlay
                </p>
              </div>
              <button
                onClick={() => setIsMediaLibraryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3 max-h-[65vh] custom-scrollbar">
              {STUDIO_SAMPLE_MEDIA.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleSelectFromMediaLibrary(asset)}
                  className="group rounded-2xl border border-white/10 bg-surface hover:border-indigo-500/60 p-3 cursor-pointer transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-500/10"
                >
                  <div className="h-28 rounded-xl overflow-hidden bg-black/60 relative border border-white/5 mb-2.5">
                    {asset.type === "video" ? (
                      <video src={asset.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/70 text-slate-300 backdrop-blur-sm border border-white/10">
                      {asset.type}
                    </span>
                    <span className="absolute top-1.5 right-1.5 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                      {asset.cropMode}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white text-xs truncate group-hover:text-indigo-300 transition-colors">
                      {asset.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {asset.description}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full mt-3 h-7 text-[11px] group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Use as Overlay
                  </Button>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 flex items-center justify-between bg-white/[0.02] text-xs">
              <span className="text-[11px] text-slate-400">
                You can also upload your own files anytime from the panel.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsMediaLibraryModalOpen(false)}
                className="h-8 text-xs text-slate-300"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
