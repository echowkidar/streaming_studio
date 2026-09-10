"use client";

import React, { useState } from "react";
import { Palette, Check, Type, Eye, EyeOff, Sparkles } from "lucide-react";
import { useStudioStore } from "@/stores/studio.store";
import { Button } from "@/components/ui/Button";

export const BrandPanel: React.FC = () => {
  const {
    showLogo,
    logoUrl,
    setLogo,
    activeThemeColor,
    setThemeColor,
    activeBanner,
    setBanner,
    tickerText,
    showTicker,
    setTicker,
  } = useStudioStore();

  const [bannerTitle, setBannerTitle] = useState(activeBanner?.title || "Salar Khan");
  const [bannerSubtitle, setBannerSubtitle] = useState(activeBanner?.subtitle || "Founder & Lead Architect");
  const [tickerInput, setTickerInput] = useState(tickerText);

  const colors = [
    "#6366f1", // Indigo
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f43f5e", // Rose
    "#8b5cf6", // Purple
    "#f59e0b", // Amber
  ];

  const handleUpdateBanner = () => {
    setBanner({
      id: "b-active",
      title: bannerTitle,
      subtitle: bannerSubtitle,
      themeColor: activeThemeColor,
      isShowing: true,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 custom-scrollbar">
      {/* Brand Color Theme */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Brand Theme Accent</h4>
        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setThemeColor(c)}
              style={{ backgroundColor: c }}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-md"
            >
              {activeThemeColor === c && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Watermark Logo */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Watermark Logo</h4>
          <button
            onClick={() => setLogo(logoUrl, !showLogo)}
            className="text-xs text-indigo-400 font-medium hover:underline flex items-center gap-1"
          >
            {showLogo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showLogo ? "Visible" : "Hidden"}
          </button>
        </div>
        <div className="p-3 rounded-xl bg-surface border border-white/5 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-white tracking-widest">{logoUrl}</span>
          <span className="text-[10px] text-slate-500">Top-Right Corner</span>
        </div>
      </div>

      {/* Lower-Third Banners */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Lower Third Banner</h4>
          {activeBanner?.isShowing && (
            <button
              onClick={() => setBanner(null)}
              className="text-xs text-rose-400 hover:underline"
            >
              Hide
            </button>
          )}
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={bannerTitle}
            onChange={(e) => setBannerTitle(e.target.value)}
            placeholder="Main Name / Headline"
            className="w-full h-8 px-3 text-xs rounded-lg bg-surface border border-white/10 text-white"
          />
          <input
            type="text"
            value={bannerSubtitle}
            onChange={(e) => setBannerSubtitle(e.target.value)}
            placeholder="Subtitle / Role / Title"
            className="w-full h-8 px-3 text-xs rounded-lg bg-surface border border-white/10 text-white"
          />
          <Button variant="primary" size="sm" className="w-full text-xs" onClick={handleUpdateBanner}>
            Show on Stage
          </Button>
        </div>
      </div>

      {/* Breaking News Ticker */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">News Ticker Crawl</h4>
          <button
            onClick={() => setTicker(tickerInput, !showTicker)}
            className="text-xs text-indigo-400 font-medium hover:underline"
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
          className="w-full text-xs"
          onClick={() => setTicker(tickerInput, true)}
        >
          Update & Push Ticker
        </Button>
      </div>
    </div>
  );
};
