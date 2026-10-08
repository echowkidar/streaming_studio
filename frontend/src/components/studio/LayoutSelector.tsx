"use client";

import React from "react";
import { useStudioStore, StudioLayout, CustomCompositionMode } from "@/stores/studio.store";
import { cn } from "@/lib/utils";
import {
  Sliders,
  Sparkles,
  LayoutGrid,
  Check,
  User,
  Users,
  Square,
  Maximize2,
  Columns,
  Rows,
} from "lucide-react";

interface LayoutOption {
  id: StudioLayout;
  name: string;
  desc: string;
  icon: (active: boolean) => React.ReactNode;
}

export const LayoutSelector: React.FC = () => {
  const {
    activeLayout,
    setLayout,
    resetAllParticipantBounds,
    customLayoutConfig,
    setCustomLayoutConfig,
    participants,
  } = useStudioStore();

  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");

  const layouts: LayoutOption[] = [
    {
      id: "solo",
      name: "Solo Speaker",
      desc: "One large centered feed",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex items-center justify-center">
          <div className="w-full h-full bg-current opacity-30 rounded-xs" />
        </div>
      ),
    },
    {
      id: "cropped",
      name: "Cropped Layout",
      desc: "Full-height vertical fill (StreamYard)",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current flex divide-x divide-current overflow-hidden">
          <div className="flex-1 h-full bg-current opacity-40" />
          <div className="flex-1 h-full bg-current opacity-40" />
        </div>
      ),
    },
    {
      id: "side-by-side",
      name: "Fit Layout (16:9)",
      desc: "Two 16:9 boxes with background visible",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex gap-1">
          <div className="flex-1 h-full bg-current opacity-30 rounded-xs" />
          <div className="flex-1 h-full bg-current opacity-30 rounded-xs" />
        </div>
      ),
    },
    {
      id: "stacked",
      name: "Stacked Vertical",
      desc: "Top & bottom split (StreamYard)",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex flex-col gap-0.5">
          <div className="w-full flex-1 bg-current opacity-30 rounded-xs" />
          <div className="w-full flex-1 bg-current opacity-30 rounded-xs" />
        </div>
      ),
    },
    {
      id: "cinema",
      name: "Cinema Fullscreen",
      desc: "100% stage / slide focus",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex items-center justify-center">
          <div className="w-full h-full bg-current opacity-50 rounded-xs flex items-center justify-center">
            <Maximize2 className="w-3 h-3 text-slate-900" />
          </div>
        </div>
      ),
    },
    {
      id: "speaker-large",
      name: "Speaker + Grid",
      desc: "Hero feed with right sidebar",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex gap-1">
          <div className="flex-[3] h-full bg-current opacity-40 rounded-xs" />
          <div className="flex-1 h-full flex flex-col gap-0.5">
            <div className="w-full flex-1 bg-current opacity-30 rounded-xs" />
            <div className="w-full flex-1 bg-current opacity-30 rounded-xs" />
          </div>
        </div>
      ),
    },
    {
      id: "presentation",
      name: "Presentation Deck",
      desc: "Slide focus with bottom speaker row",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex flex-col gap-0.5">
          <div className="w-full flex-[2] bg-current opacity-40 rounded-xs" />
          <div className="w-full flex-1 flex gap-0.5">
            <div className="flex-1 bg-current opacity-30 rounded-xs" />
            <div className="flex-1 bg-current opacity-30 rounded-xs" />
          </div>
        </div>
      ),
    },
    {
      id: "pip",
      name: "Picture in Picture",
      desc: "Full screen with floating box",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 relative">
          <div className="w-full h-full bg-current opacity-20 rounded-xs" />
          <div className="absolute bottom-1 right-1 w-4 h-3 bg-current opacity-80 rounded-xs" />
        </div>
      ),
    },
    {
      id: "four-grid",
      name: "2x2 Quad Grid",
      desc: "Four equal participants",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
        </div>
      ),
    },
    {
      id: "three-equal",
      name: "3-Column Trio",
      desc: "Three equal vertical columns",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex gap-0.5">
          <div className="flex-1 h-full bg-current opacity-30 rounded-xs" />
          <div className="flex-1 h-full bg-current opacity-30 rounded-xs" />
          <div className="flex-1 h-full bg-current opacity-30 rounded-xs" />
        </div>
      ),
    },
    {
      id: "six-grid",
      name: "6-Tile Grid",
      desc: "Six equal participants (3x2)",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 grid grid-cols-3 grid-rows-2 gap-0.5">
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
          <div className="bg-current opacity-30 rounded-xs" />
        </div>
      ),
    },
    {
      id: "podcast",
      name: "Video Podcast",
      desc: "Optimized two-speaker interview",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex gap-1.5 px-2">
          <div className="flex-1 h-full bg-current opacity-40 rounded-xs" />
          <div className="flex-1 h-full bg-current opacity-40 rounded-xs" />
        </div>
      ),
    },
    {
      id: "custom",
      name: "Custom Studio",
      desc: "Tailor stage grid & spotlight",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-indigo-400 p-0.5 flex items-center justify-center bg-indigo-500/10">
          <Sliders className="w-4 h-4 text-indigo-400" />
        </div>
      ),
    },
  ];

  const highlightColors = [
    { name: "Indigo", value: "#6366f1" },
    { name: "Emerald", value: "#10b981" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Purple", value: "#a855f7" },
  ];

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          Broadcast Stage Layouts
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Switch presets or design a custom layout in real time.
        </p>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {layouts.map((l) => {
          const isSelected = activeLayout === l.id;
          return (
            <button
              key={l.id}
              onClick={() => {
                resetAllParticipantBounds();
                if (l.id === "custom") {
                  const presetToCustomMode: Record<string, CustomCompositionMode> = {
                    "solo": "solo",
                    "side-by-side": "side-by-side",
                    "fit": "side-by-side",
                    "cropped": "podcast",
                    "stacked": "stacked",
                    "speaker-large": "hero-side",
                    "presentation": "hero-bottom",
                    "pip": "pip",
                    "cinema": "cinema",
                    "three-equal": "three-equal",
                    "four-grid": "grid",
                    "six-grid": "six-grid",
                    "podcast": "podcast",
                  };
                  if (activeLayout !== "custom" && presetToCustomMode[activeLayout]) {
                    setCustomLayoutConfig({ mode: presetToCustomMode[activeLayout] });
                  }
                }
                setLayout(l.id);
              }}
              className={cn(
                "p-2.5 rounded-xl border text-left flex flex-col gap-2 transition-all duration-200 group relative",
                isSelected
                  ? "border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-lg shadow-indigo-500/10"
                  : "border-white/5 bg-[#12121e]/70 hover:border-white/20 text-slate-400 hover:text-white"
              )}
            >
              {l.id === "custom" && (
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                  Custom
                </span>
              )}
              {l.icon(isSelected)}
              <div>
                <div className="text-xs font-semibold text-white">{l.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1">{l.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Customize Callout when on a Preset */}
      {activeLayout !== "custom" && (
        <div className="p-2.5 rounded-xl border border-white/5 bg-[#12121e]/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
            <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate text-[11px]">Customize borders, corners & spacing</span>
          </div>
          <button
            onClick={() => {
              const presetToCustomMode: Record<string, CustomCompositionMode> = {
                "solo": "solo",
                "side-by-side": "side-by-side",
                "stacked": "stacked",
                "speaker-large": "hero-side",
                "presentation": "hero-bottom",
                "pip": "pip",
                "cinema": "cinema",
                "three-equal": "three-equal",
                "four-grid": "grid",
                "six-grid": "six-grid",
                "podcast": "podcast",
              };
              resetAllParticipantBounds();
              if (presetToCustomMode[activeLayout]) {
                setCustomLayoutConfig({ mode: presetToCustomMode[activeLayout] });
              }
              setLayout("custom");
            }}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/25 hover:text-white transition-all cursor-pointer"
          >
            Open in Custom →
          </button>
        </div>
      )}

      {/* Custom Layout Designer Panel */}
      {activeLayout === "custom" && (
        <div className="p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Custom Layout Designer</h4>
                <p className="text-[10px] text-slate-400">Controls apply immediately to stage & RTMP stream</p>
              </div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          </div>

          {/* 1. Stage Composition Mode */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Stage Composition</label>
              <span className="text-[10px] text-indigo-400 font-mono capitalize">
                {customLayoutConfig.mode.replace(/-/g, " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "solo" as const, label: "Solo Speaker", icon: User },
                { id: "side-by-side" as const, label: "Side by Side", icon: Columns },
                { id: "stacked" as const, label: "Stacked Vertical", icon: Rows },
                { id: "hero-side" as const, label: "Hero + Side Strip", icon: Columns },
                { id: "hero-bottom" as const, label: "Hero + Bottom Row", icon: Rows },
                { id: "grid" as const, label: "Equal Grid", icon: LayoutGrid },
                { id: "three-equal" as const, label: "3-Column Trio", icon: Columns },
                { id: "six-grid" as const, label: "6-Tile Grid", icon: LayoutGrid },
                { id: "podcast" as const, label: "Video Podcast", icon: Users },
                { id: "pip" as const, label: "Floating PiP", icon: Square },
                { id: "cinema" as const, label: "Cinema 21:9", icon: Maximize2 },
              ].map((m) => {
                const isCurrent = customLayoutConfig.mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setCustomLayoutConfig({ mode: m.id })}
                    className={cn(
                      "px-2.5 py-2 rounded-xl text-left border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer",
                      isCurrent
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                        : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Hero Speaker Spotlight (If hero-based mode) */}
          {customLayoutConfig.mode !== "grid" && onStageParticipants.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Hero Spotlight Speaker</span>
                <span className="text-[9px] text-indigo-400 font-mono">Main Focus</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {onStageParticipants.map((p) => {
                  const isHero = String(customLayoutConfig.heroParticipantId) === String(p.id) ||
                    (!customLayoutConfig.heroParticipantId && onStageParticipants[0]?.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setCustomLayoutConfig({ heroParticipantId: p.id })}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all",
                        isHero
                          ? "bg-indigo-500/20 border-indigo-400 text-indigo-200"
                          : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      <User className="w-3 h-3" />
                      <span className="max-w-[120px] truncate">{p.name}</span>
                      {isHero && <Check className="w-3 h-3 text-indigo-400 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Columns Selector (If Grid mode) */}
          {customLayoutConfig.mode === "grid" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Grid Columns</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([1, 2, 3, 4] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setCustomLayoutConfig({ columns: col })}
                    className={cn(
                      "py-1.5 rounded-lg border text-xs font-semibold text-center transition-all",
                      customLayoutConfig.columns === col
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                        : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                    )}
                  >
                    {col} {col === 1 ? "Col" : "Cols"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. PiP Corner & Size (If PiP mode) */}
          {customLayoutConfig.mode === "pip" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">PiP Corner Position</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "top-left" as const, label: "↖ Top Left" },
                    { id: "top-right" as const, label: "↗ Top Right" },
                    { id: "bottom-left" as const, label: "↙ Bottom Left" },
                    { id: "bottom-right" as const, label: "↘ Bottom Right" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setCustomLayoutConfig({ pipPosition: pos.id })}
                      className={cn(
                        "py-1.5 px-2 rounded-lg border text-xs font-medium transition-all text-center",
                        customLayoutConfig.pipPosition === pos.id
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">PiP Window Size</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "small" as const, label: "Small" },
                    { id: "medium" as const, label: "Medium" },
                    { id: "large" as const, label: "Large" },
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      onClick={() => setCustomLayoutConfig({ pipSize: sz.id })}
                      className={cn(
                        "py-1.5 rounded-lg border text-xs font-medium transition-all text-center",
                        customLayoutConfig.pipSize === sz.id
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Tile Spacing (Gap) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Tile Spacing</span>
              <span className="text-[10px] text-slate-400 font-mono">{customLayoutConfig.gap}px</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { gap: 0, label: "Flush" },
                { gap: 8, label: "Tight" },
                { gap: 12, label: "Normal" },
                { gap: 20, label: "Spacious" },
              ].map((g) => (
                <button
                  key={g.gap}
                  onClick={() => setCustomLayoutConfig({ gap: g.gap })}
                  className={cn(
                    "py-1.5 rounded-lg border text-xs font-medium text-center transition-all",
                    customLayoutConfig.gap === g.gap
                      ? "bg-indigo-600 border-indigo-400 text-white"
                      : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Corner Rounding */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Corner Rounding</span>
              <span className="text-[10px] text-slate-400 font-mono">{customLayoutConfig.borderRadius}px</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { r: 0, label: "Sharp" },
                { r: 8, label: "Subtle" },
                { r: 16, label: "Rounded" },
                { r: 24, label: "Soft" },
              ].map((cr) => (
                <button
                  key={cr.r}
                  onClick={() => setCustomLayoutConfig({ borderRadius: cr.r })}
                  className={cn(
                    "py-1.5 rounded-lg border text-xs font-medium text-center transition-all",
                    customLayoutConfig.borderRadius === cr.r
                      ? "bg-indigo-600 border-indigo-400 text-white"
                      : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                  )}
                >
                  {cr.label}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Active Speaker Accent Glow */}
          <div className="space-y-2 pt-1 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Speaker Glow Border
              </label>
              <button
                onClick={() => setCustomLayoutConfig({ showSpeakerBorder: !customLayoutConfig.showSpeakerBorder })}
                className={cn(
                  "w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5",
                  customLayoutConfig.showSpeakerBorder ? "bg-indigo-600" : "bg-white/10"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full bg-white transition-transform",
                    customLayoutConfig.showSpeakerBorder && "translate-x-4"
                  )}
                />
              </button>
            </div>

            {customLayoutConfig.showSpeakerBorder && (
              <div className="flex items-center gap-2">
                {highlightColors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCustomLayoutConfig({ highlightColor: c.value })}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      customLayoutConfig.highlightColor === c.value ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
