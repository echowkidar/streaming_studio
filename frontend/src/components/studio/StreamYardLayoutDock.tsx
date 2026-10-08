"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStudioStore, StudioLayout } from "@/stores/studio.store";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Pencil,
  Plus,
  Maximize2,
  Rows,
  Grid3X3,
  Check,
  Sparkles,
} from "lucide-react";

interface StreamYardLayoutDockProps {
  onOpenCustomizer?: () => void;
  className?: string;
}

export const StreamYardLayoutDock: React.FC<StreamYardLayoutDockProps> = ({
  onOpenCustomizer,
  className,
}) => {
  const {
    activeLayout,
    setLayout,
    resetAllParticipantBounds,
    customLayoutConfig,
    setCustomLayoutConfig,
  } = useStudioStore();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMoreOpen]);

  const handleSelectLayout = (layout: StudioLayout) => {
    resetAllParticipantBounds();
    setLayout(layout);
    setIsMoreOpen(false);
  };

  const isCroppedActive = activeLayout === "cropped" || activeLayout === "podcast";
  const isFitActive = activeLayout === "side-by-side" || activeLayout === "fit";

  return (
    <div
      className={cn(
        "flex items-center justify-center select-none py-1.5 px-2 relative z-30",
        className
      )}
    >
      <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0e0f18]/90 border border-white/10 backdrop-blur-xl px-2 py-1 rounded-xl shadow-2xl">
        {/* 1. Solo Speaker */}
        <button
          type="button"
          onClick={() => handleSelectLayout("solo")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            activeLayout === "solo"
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="Solo"
        >
          {/* Solo SVG Icon */}
          <div className="w-5 h-4 rounded-[3px] border border-current p-0.5 flex items-center justify-center">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-90">
              <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
            </svg>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Solo
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 2. Cropped layout (Side by side full-height vertical center crop) */}
        <button
          type="button"
          onClick={() => handleSelectLayout("cropped")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            isCroppedActive
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="Cropped layout"
        >
          {/* StreamYard Cropped Icon: 2 silhouettes side by side touching */}
          <div className="w-5 h-4 rounded-[3px] border border-current flex divide-x divide-current overflow-hidden">
            <div className="flex-1 h-full flex items-center justify-center bg-current/15">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-2 h-2 opacity-90">
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
              </svg>
            </div>
            <div className="flex-1 h-full flex items-center justify-center bg-current/15">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-2 h-2 opacity-90">
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
              </svg>
            </div>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Cropped layout
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 3. Fit layout (16:9 widescreen side by side with background visible) */}
        <button
          type="button"
          onClick={() => handleSelectLayout("side-by-side")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            isFitActive
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="Fit layout"
        >
          {/* StreamYard Fit Icon: 2 separate widescreen boxes with padding */}
          <div className="w-5 h-4 flex items-center justify-center gap-0.5">
            <div className="w-2.5 h-3 rounded-[2px] border border-current flex items-center justify-center bg-current/15">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-1.5 h-1.5 opacity-90">
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
              </svg>
            </div>
            <div className="w-2.5 h-3 rounded-[2px] border border-current flex items-center justify-center bg-current/15">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-1.5 h-1.5 opacity-90">
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
              </svg>
            </div>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Fit layout
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 4. 3 People (Trio columns) */}
        <button
          type="button"
          onClick={() => handleSelectLayout("three-equal")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            activeLayout === "three-equal"
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="3 People"
        >
          {/* 3 columns icon */}
          <div className="w-5 h-4 rounded-[3px] border border-current flex divide-x divide-current overflow-hidden">
            <div className="flex-1 h-full flex items-center justify-center bg-current/10">
              <div className="w-1 h-1 rounded-full bg-current opacity-80" />
            </div>
            <div className="flex-1 h-full flex items-center justify-center bg-current/10">
              <div className="w-1 h-1 rounded-full bg-current opacity-80" />
            </div>
            <div className="flex-1 h-full flex items-center justify-center bg-current/10">
              <div className="w-1 h-1 rounded-full bg-current opacity-80" />
            </div>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            3 People
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 5. 2x2 Grid (Quad) */}
        <button
          type="button"
          onClick={() => handleSelectLayout("four-grid")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            activeLayout === "four-grid"
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="2x2 Grid"
        >
          {/* 2x2 grid icon */}
          <div className="w-5 h-4 rounded-[3px] border border-current grid grid-cols-2 grid-rows-2 gap-[1px] p-[1px]">
            <div className="bg-current/30 rounded-[1px]" />
            <div className="bg-current/30 rounded-[1px]" />
            <div className="bg-current/30 rounded-[1px]" />
            <div className="bg-current/30 rounded-[1px]" />
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            2x2 Grid
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 6. Speaker + Grid (Hero Left + Sidebar) */}
        <button
          type="button"
          onClick={() => handleSelectLayout("speaker-large")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            activeLayout === "speaker-large"
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="Speaker + Grid"
        >
          {/* Hero + Sidebar icon */}
          <div className="w-5 h-4 rounded-[3px] border border-current p-[1px] flex gap-[1px]">
            <div className="flex-[2.5] h-full bg-current/40 rounded-[1px] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            </div>
            <div className="flex-1 h-full flex flex-col gap-[1px]">
              <div className="w-full flex-1 bg-current/25 rounded-[1px]" />
              <div className="w-full flex-1 bg-current/25 rounded-[1px]" />
            </div>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Speaker + Grid
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 7. Presentation Deck (Slide focus + bottom strip) */}
        <button
          type="button"
          onClick={() => handleSelectLayout("presentation")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            activeLayout === "presentation"
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="Presentation"
        >
          {/* Slide deck on top, speaker row bottom */}
          <div className="w-5 h-4 rounded-[3px] border border-current p-[1px] flex flex-col gap-[1px]">
            <div className="w-full flex-[2.2] bg-current/45 rounded-[1px] flex items-center justify-center">
              <span className="text-[7px] font-mono leading-none">■</span>
            </div>
            <div className="w-full flex-1 flex gap-[1px]">
              <div className="flex-1 bg-current/25 rounded-[1px]" />
              <div className="flex-1 bg-current/25 rounded-[1px]" />
            </div>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Presentation
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 8. Picture in Picture (PiP) */}
        <button
          type="button"
          onClick={() => handleSelectLayout("pip")}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            activeLayout === "pip"
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="Picture in Picture"
        >
          {/* PiP icon */}
          <div className="w-5 h-4 rounded-[3px] border border-current relative p-[1px]">
            <div className="w-full h-full bg-current/20 rounded-[1px]" />
            <div className="absolute bottom-[2px] right-[2px] w-2 h-1.5 bg-current opacity-90 rounded-[1px]" />
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Picture in Picture
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 9. More Layouts Dropdown (Chevron) */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              "group relative flex items-center justify-center w-6 h-7 sm:w-7 sm:h-8 rounded-lg border transition-all duration-150",
              isMoreOpen || ["cinema", "stacked", "six-grid"].includes(activeLayout)
                ? "bg-indigo-600/30 border-indigo-400 text-white"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            )}
            title="More broadcast layouts"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isMoreOpen && "rotate-180")} />
          </button>

          {isMoreOpen && (
            <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-48 bg-[#121320] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                More Layouts
              </div>
              <button
                type="button"
                onClick={() => handleSelectLayout("cinema")}
                className={cn(
                  "w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors",
                  activeLayout === "cinema" ? "bg-indigo-600/20 text-indigo-300 font-semibold" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cinema Fullscreen</span>
                </div>
                {activeLayout === "cinema" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
              <button
                type="button"
                onClick={() => handleSelectLayout("stacked")}
                className={cn(
                  "w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors",
                  activeLayout === "stacked" ? "bg-indigo-600/20 text-indigo-300 font-semibold" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <Rows className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stacked Vertical</span>
                </div>
                {activeLayout === "stacked" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
              <button
                type="button"
                onClick={() => handleSelectLayout("six-grid")}
                className={cn(
                  "w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors",
                  activeLayout === "six-grid" ? "bg-indigo-600/20 text-indigo-300 font-semibold" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>6-Tile Grid (3x2)</span>
                </div>
                {activeLayout === "six-grid" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/15 mx-0.5" />

        {/* 10. Edit Layout (Pencil) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenCustomizer) {
              onOpenCustomizer();
            } else {
              handleSelectLayout("custom");
            }
          }}
          className={cn(
            "group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border transition-all duration-150",
            activeLayout === "custom"
              ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
              : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          )}
          aria-label="Edit layout"
        >
          <Pencil className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Edit layout
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>

        {/* 11. Add / Custom Layout (+) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenCustomizer) {
              onOpenCustomizer();
            } else {
              handleSelectLayout("custom");
            }
          }}
          className="group relative flex items-center justify-center w-8 h-7 sm:w-9 sm:h-8 rounded-lg border bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-150"
          aria-label="Add layout"
        >
          <Plus className="w-4 h-4 text-cyan-400 group-hover:text-white transition-colors" />
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Add layout
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
          </div>
        </button>
      </div>
    </div>
  );
};
