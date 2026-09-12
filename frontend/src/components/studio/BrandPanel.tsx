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
  const [replacingOverlayId, setReplacingOverlayId] = useState<string | null>(null);
  const [recentlyDeletedOverlay, setRecentlyDeletedOverlay] = useState<StageOverlayAsset | null>(null);
  const [overlayUploadError, setOverlayUploadError] = useState<string | null>(null);

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

  const handleRename = (item: StageOverlayAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt("Enter new name for this overlay:", item.name);
    if (newName && newName.trim()) {
      updateOverlayInHistory(item.id, { name: newName.trim() });
    }
  };

  const overlayPresets: StageOverlayAsset[] = [
    {
      id: "preset-sponsor",
      name: "Sponsor Spotlight",
      type: "image",
      url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
      position: "top-right",
      scale: 30,
      cropMode: "cover",
      borderRadius: 16,
      opacity: 100,
      isShowing: true,
      isMuted: true,
      isLooping: true,
    },
    {
      id: "preset-badge",
      name: "Round Speaker Badge",
      type: "image",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      position: "bottom-right",
      scale: 22,
      cropMode: "circle",
      borderRadius: 9999,
      opacity: 100,
      isShowing: true,
      isMuted: true,
      isLooping: true,
    },
    {
      id: "preset-video-clip",
      name: "Video Showcase Clip",
      type: "video",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      position: "bottom-left",
      scale: 35,
      cropMode: "cover",
      borderRadius: 16,
      opacity: 100,
      isShowing: true,
      isMuted: true,
      isLooping: true,
    },
    {
      id: "preset-breaking",
      name: "Breaking Alert Graphic",
      type: "image",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      position: "top-left",
      scale: 38,
      cropMode: "cover",
      borderRadius: 12,
      opacity: 95,
      isShowing: true,
      isMuted: true,
      isLooping: true,
    },
  ];

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

        {/* Upload Overlay Button */}
        <button
          onClick={() => overlayFileInputRef.current?.click()}
          className="w-full py-2.5 px-3 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium group cursor-pointer shadow-sm"
        >
          <Upload className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>Upload Overlay (Image or Video Clip)</span>
        </button>

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
                  Drag directly on stage or use controls below
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleStageOverlayVisibility}
                  className={cn(
                    "p-1.5 rounded-lg border text-xs transition-colors",
                    activeStageOverlay.isShowing
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-white/5 border-white/10 text-slate-400"
                  )}
                  title={activeStageOverlay.isShowing ? "Hide from stage" : "Show on stage"}
                >
                  {activeStageOverlay.isShowing ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setStageOverlay(null)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400"
                  title="Remove from stage"
                >
                  <X className="w-3.5 h-3.5" />
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

        {/* Preset Overlays Gallery */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-slate-400 font-medium">Studio Preset Overlays</span>
          <div className="grid grid-cols-2 gap-2">
            {overlayPresets.map((preset) => {
              const isActive = activeStageOverlay?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setStageOverlay(preset)}
                  className={cn(
                    "p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all group relative overflow-hidden h-18",
                    isActive
                      ? "border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-500/10"
                      : "border-white/5 bg-surface hover:border-white/15"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold px-1 rounded bg-white/10 text-indigo-300">
                      {preset.type}
                    </span>
                    {isActive && (
                      <span className="p-0.5 rounded-full bg-emerald-500 text-white">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-[11px] truncate">{preset.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">{preset.cropMode} • {preset.scale}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

        {/* User's Uploaded Overlays Management Section */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Your Uploaded Overlays</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-400 font-mono">
                {overlayHistory.length}
              </span>
            </div>
            <button
              onClick={restoreDefaultOverlays}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              title="Restore sample overlay cards if accidentally deleted"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset Samples
            </button>
          </div>

          {overlayHistory.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-white/10 text-center space-y-2 bg-white/[0.02]">
              <p className="text-[11px] text-slate-400">No custom overlays left.</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => overlayFileInputRef.current?.click()}
                  className="h-6 text-[10px] px-2"
                >
                  <Upload className="w-2.5 h-2.5 mr-1" />
                  Upload
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={restoreDefaultOverlays}
                  className="h-6 text-[10px] px-2 text-indigo-300"
                >
                  <RotateCcw className="w-2.5 h-2.5 mr-1" />
                  Restore Defaults
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {overlayHistory.map((item) => {
                const isSelected = activeStageOverlay?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setStageOverlay(item)}
                    className={cn(
                      "group relative rounded-xl border overflow-hidden cursor-pointer transition-all h-20 flex flex-col justify-between p-2 bg-surface",
                      isSelected
                        ? "border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-500/10"
                        : "border-white/5 hover:border-white/20"
                    )}
                  >
                    {/* Background Preview Thumbnail */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity bg-cover bg-center"
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

                    {/* Top action row */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold px-1 rounded bg-black/60 text-slate-300 backdrop-blur-sm">
                        {item.type}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Change / Replace File */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplacingOverlayId(item.id);
                            replaceFileInputRef.current?.click();
                          }}
                          className="p-1 rounded bg-black/70 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                          title="Change / Replace image or video file"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        {/* Rename */}
                        <button
                          onClick={(e) => handleRename(item, e)}
                          className="p-1 rounded bg-black/70 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                          title="Rename overlay"
                        >
                          <Type className="w-2.5 h-2.5" />
                        </button>
                        {/* Delete with Undo */}
                        <button
                          onClick={(e) => handleDeleteWithUndo(item, e)}
                          className="p-1 rounded bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                          title="Remove overlay (Undo available)"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="relative z-10">
                      <div className="font-semibold text-white text-[11px] truncate drop-shadow-sm">
                        {item.name}
                      </div>
                      <div className="text-[9px] text-slate-300 truncate flex items-center gap-1">
                        {isSelected && (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            Live
                          </span>
                        )}
                        <span>{item.cropMode} • {item.scale}%</span>
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
    </div>
  );
};
