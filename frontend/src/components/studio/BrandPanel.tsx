"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useStudioStore } from "@/stores/studio.store";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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
      id: "midnight",
      name: "Midnight Studio",
      url: null,
      gradient: "from-[#050508] to-[#0c0c16]",
    },
    {
      id: "cyberpunk",
      name: "Cyber Neon",
      url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80",
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
          {activeBackgroundUrl && (
            <button
              onClick={() => setBackground(null)}
              className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

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

        {/* Custom Image URL */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={customBgInput}
            onChange={(e) => setCustomBgInput(e.target.value)}
            placeholder="Custom Image URL..."
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

      {/* 4. Lower-Third Banners */}
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
