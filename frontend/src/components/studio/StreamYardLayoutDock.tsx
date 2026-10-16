"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStudioStore, StudioLayout } from "@/stores/studio.store";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Pencil,
  Plus,
  Maximize2,
} from "lucide-react";

interface StreamYardLayoutDockProps {
  onOpenCustomizer?: () => void;
  className?: string;
}

interface LayoutItemDef {
  id: StudioLayout;
  label: string;
  isActive: (active: StudioLayout) => boolean;
  isPrimary: boolean;
  renderIcon: () => React.ReactNode;
}

const LAYOUT_DEFINITIONS: LayoutItemDef[] = [
  // 1. Solo Speaker
  {
    id: "solo",
    label: "Solo",
    isActive: (a) => a === "solo",
    isPrimary: true,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current p-0.5 flex items-center justify-center">
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-90">
          <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
        </svg>
      </div>
    ),
  },

  // 2. Cropped layout (Side by side full-height vertical center crop)
  {
    id: "cropped",
    label: "Cropped",
    isActive: (a) => a === "cropped" || a === "podcast",
    isPrimary: true,
    renderIcon: () => (
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
    ),
  },

  // 3. Fit layout (16:9 widescreen side by side with background visible)
  {
    id: "side-by-side",
    label: "Fit (Side by Side)",
    isActive: (a) => a === "side-by-side" || a === "fit",
    isPrimary: true,
    renderIcon: () => (
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
    ),
  },

  // 4. 3 People (Trio columns)
  {
    id: "three-equal",
    label: "3 People",
    isActive: (a) => a === "three-equal",
    isPrimary: true,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current flex divide-x divide-current overflow-hidden">
        <div className="flex-1 h-full flex items-center justify-center bg-current/15">
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
        <div className="flex-1 h-full flex items-center justify-center bg-current/15">
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
        <div className="flex-1 h-full flex items-center justify-center bg-current/15">
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
      </div>
    ),
  },

  // 5. 2x2 Grid (4 People) - Crystal clear 4 tiles with avatar dots
  {
    id: "four-grid",
    label: "2x2 Grid (4 People)",
    isActive: (a) => a === "four-grid",
    isPrimary: true,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current grid grid-cols-2 grid-rows-2 divide-x divide-y divide-current overflow-hidden">
        <div className="flex items-center justify-center bg-current/20">
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
        <div className="flex items-center justify-center bg-current/20">
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
        <div className="flex items-center justify-center bg-current/20">
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
        <div className="flex items-center justify-center bg-current/20">
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
      </div>
    ),
  },

  // 6. 6-Tile Grid (3x2) - Distinct 6 cells with grid dividing lines & dots
  {
    id: "six-grid",
    label: "6-Tile Grid (6 People)",
    isActive: (a) => a === "six-grid",
    isPrimary: false,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current grid grid-cols-3 grid-rows-2 divide-x divide-y divide-current overflow-hidden">
        <div className="bg-current/20 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-current opacity-90" />
        </div>
        <div className="bg-current/20 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-current opacity-90" />
        </div>
        <div className="bg-current/20 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-current opacity-90" />
        </div>
        <div className="bg-current/20 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-current opacity-90" />
        </div>
        <div className="bg-current/20 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-current opacity-90" />
        </div>
        <div className="bg-current/20 flex items-center justify-center">
          <div className="w-0.5 h-0.5 rounded-full bg-current opacity-90" />
        </div>
      </div>
    ),
  },

  // 7. Speaker + Grid (Spotlight Hero Left + Right Thumbnails)
  {
    id: "speaker-large",
    label: "Speaker + Grid",
    isActive: (a) => a === "speaker-large",
    isPrimary: true,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current p-[1px] flex gap-[1px]">
        <div className="flex-[2.5] h-full bg-current/40 rounded-[1px] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-90" />
        </div>
        <div className="flex-1 h-full flex flex-col gap-[1px]">
          <div className="w-full flex-1 bg-current/30 rounded-[1px]" />
          <div className="w-full flex-1 bg-current/30 rounded-[1px]" />
        </div>
      </div>
    ),
  },

  // 8. Presentation Deck (Slide focus + speaker strip)
  {
    id: "presentation",
    label: "Presentation Deck",
    isActive: (a) => a === "presentation",
    isPrimary: false,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current p-[1px] flex flex-col gap-[1px]">
        <div className="w-full flex-[2.2] bg-current/45 rounded-[1px] flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-2 h-2 opacity-90">
            <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2V2z" />
          </svg>
        </div>
        <div className="w-full flex-1 flex gap-[1px]">
          <div className="flex-1 bg-current/30 rounded-[0.5px]" />
          <div className="flex-1 bg-current/30 rounded-[0.5px]" />
        </div>
      </div>
    ),
  },

  // 9. Picture in Picture (PiP)
  {
    id: "pip",
    label: "Picture in Picture",
    isActive: (a) => a === "pip",
    isPrimary: false,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current relative p-[1px]">
        <div className="w-full h-full bg-current/20 rounded-[1px] flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-1.5 h-1.5 opacity-60">
            <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
          </svg>
        </div>
        <div className="absolute bottom-[2px] right-[2px] w-2 h-1.5 bg-current rounded-[1px] shadow-sm" />
      </div>
    ),
  },

  // 10. Fullscreen / Cinema
  {
    id: "cinema",
    label: "Fullscreen (Cinema)",
    isActive: (a) => a === "cinema" || a === "screen-full",
    isPrimary: false,
    renderIcon: () => (
      <Maximize2 className="w-3.5 h-3.5 opacity-90" />
    ),
  },

  // 11. Stacked Vertical
  {
    id: "stacked",
    label: "Stacked Vertical",
    isActive: (a) => a === "stacked",
    isPrimary: false,
    renderIcon: () => (
      <div className="w-5 h-4 rounded-[3px] border border-current flex flex-col divide-y divide-current overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-current/15">
          <div className="w-1 h-1 rounded-full bg-current opacity-80" />
        </div>
        <div className="flex-1 flex items-center justify-center bg-current/15">
          <div className="w-1 h-1 rounded-full bg-current opacity-80" />
        </div>
      </div>
    ),
  },
];

export const StreamYardLayoutDock: React.FC<StreamYardLayoutDockProps> = ({
  onOpenCustomizer,
  className,
}) => {
  const {
    activeLayout,
    setLayout,
    resetAllParticipantBounds,
    isStageCropped,
    setIsStageCropped,
  } = useStudioStore();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click (mobile drawer)
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

  const renderLayoutButton = (item: LayoutItemDef) => {
    const active = item.isActive(activeLayout);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelectLayout(item.id)}
        className={cn(
          "group relative flex items-center justify-center w-8 h-7 sm:w-8.5 sm:h-7.5 rounded-lg border transition-all duration-150 shrink-0",
          active
            ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] ring-1 ring-indigo-500/50"
            : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
        )}
        aria-label={item.label}
      >
        {item.renderIcon()}
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
          {item.label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
        </div>
      </button>
    );
  };

  return (
    <div
      ref={moreRef}
      className={cn(
        "flex items-center justify-center select-none py-1.5 px-2 relative z-30",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1.5 bg-[#0e0f18]/90 border border-white/10 backdrop-blur-xl px-2 py-1.5 rounded-xl shadow-2xl max-w-full">
        {/* ─── DESKTOP VIEW (Screens with space): All Layouts in ONE single row ─── */}
        <div className="hidden min-[920px]:flex items-center gap-1">
          {/* All 11 layout presets side-by-side */}
          {LAYOUT_DEFINITIONS.map(renderLayoutButton)}

          {/* Divider */}
          <div className="w-px h-5 bg-white/15 mx-0.5 shrink-0" />

          {/* Edit Custom Layout (Pencil) */}
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
              "group relative flex items-center justify-center w-8 h-7 sm:w-8.5 sm:h-7.5 rounded-lg border transition-all duration-150 shrink-0",
              activeLayout === "custom"
                ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-500/50"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
            )}
            aria-label="Edit layout"
          >
            <Pencil className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Edit custom layout
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
            </div>
          </button>

          {/* Add / Create Layout (+) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenCustomizer) {
                onOpenCustomizer();
              } else {
                handleSelectLayout("custom");
              }
            }}
            className="group relative flex items-center justify-center w-8 h-7 sm:w-8.5 sm:h-7.5 rounded-lg border bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-150 shrink-0"
            aria-label="Add layout"
          >
            <Plus className="w-4 h-4 text-cyan-400 group-hover:text-white transition-colors" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Add layout preset
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
            </div>
          </button>

          {/* Universal Stage Full-Fill (Cropped Edge-to-Edge) Toggle */}
          <button
            type="button"
            onClick={() => setIsStageCropped(!isStageCropped)}
            className={cn(
              "group relative flex items-center justify-center w-8 h-7 sm:w-8.5 sm:h-7.5 rounded-lg border transition-all duration-150 shrink-0",
              isStageCropped
                ? "bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] ring-1 ring-emerald-500/50"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
            )}
            aria-label="Universal Full Fill"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white transition-colors" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {isStageCropped ? "Full Fill: ON (No black bars)" : "Full Fill: OFF (Fit with borders)"}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
            </div>
          </button>
        </div>

        {/* ─── COMPACT / MOBILE VIEW (Narrow screens < 920px): Row 1 + Expand Chevron ─── */}
        <div className="flex min-[920px]:hidden items-center gap-1">
          {/* Primary 6 layouts */}
          {LAYOUT_DEFINITIONS.filter((l) => l.isPrimary).map(renderLayoutButton)}

          {/* Expand Extra Layouts Chevron Drawer */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              "group relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg border transition-all duration-150 shrink-0",
              isMoreOpen || ["six-grid", "presentation", "pip", "cinema", "stacked"].includes(activeLayout)
                ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_14px_rgba(99,102,241,0.6)]"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/15"
            )}
            title={isMoreOpen ? "Hide extra" : "More layouts"}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isMoreOpen ? "rotate-180 text-white" : "text-slate-400 group-hover:text-white")} />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {isMoreOpen ? "Hide extra" : "More layouts"}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
            </div>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/15 mx-0.5 shrink-0" />

          {/* Edit (Pencil) */}
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
              "group relative flex items-center justify-center w-8 h-7 sm:w-8.5 sm:h-7.5 rounded-lg border transition-all duration-150 shrink-0",
              activeLayout === "custom"
                ? "bg-indigo-600/30 border-indigo-400 text-white"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
            )}
            aria-label="Edit layout"
          >
            <Pencil className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
          </button>

          {/* Add (+) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenCustomizer) {
                onOpenCustomizer();
              } else {
                handleSelectLayout("custom");
              }
            }}
            className="group relative flex items-center justify-center w-8 h-7 sm:w-8.5 sm:h-7.5 rounded-lg border bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-150 shrink-0"
            aria-label="Add layout"
          >
            <Plus className="w-4 h-4 text-cyan-400 group-hover:text-white transition-colors" />
          </button>

          {/* Universal Full Fill Button Mobile */}
          <button
            type="button"
            onClick={() => setIsStageCropped(!isStageCropped)}
            className={cn(
              "group relative flex items-center justify-center w-8 h-7 sm:w-8.5 sm:h-7.5 rounded-lg border transition-all duration-150 shrink-0",
              isStageCropped
                ? "bg-emerald-600/30 border-emerald-400 text-emerald-300 ring-1 ring-emerald-500/50"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
            )}
            aria-label="Universal Full Fill"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white transition-colors" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#161722] border border-white/15 text-white text-[11px] font-medium shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {isStageCropped ? "Full Fill: ON" : "Full Fill: OFF"}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#161722]" />
            </div>
          </button>
        </div>

        {/* Mobile Extra Drawer (When Chevron is toggled on narrow screens) */}
        {isMoreOpen && (
          <div className="flex min-[920px]:hidden items-center gap-1 pt-1.5 border-t border-white/10 w-full justify-center animate-in fade-in slide-in-from-top-1 duration-150">
            {LAYOUT_DEFINITIONS.filter((l) => !l.isPrimary).map(renderLayoutButton)}
          </div>
        )}
      </div>
    </div>
  );
};
