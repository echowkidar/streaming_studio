"use client";

import React from "react";
import { useStudioStore, StudioLayout } from "@/stores/studio.store";
import { cn } from "@/lib/utils";

interface LayoutOption {
  id: StudioLayout;
  name: string;
  desc: string;
  icon: (active: boolean) => React.ReactNode;
}

export const LayoutSelector: React.FC = () => {
  const { activeLayout, setLayout } = useStudioStore();

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
      id: "side-by-side",
      name: "Side by Side",
      desc: "Two equal 50/50 splits",
      icon: (active) => (
        <div className="w-full h-8 rounded border border-current p-0.5 flex gap-1">
          <div className="flex-1 h-full bg-current opacity-30 rounded-xs" />
          <div className="flex-1 h-full bg-current opacity-30 rounded-xs" />
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
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Broadcast Stage Layouts</h3>
        <p className="text-xs text-slate-400 mt-0.5">Switch presets seamlessly without interrupting stream.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {layouts.map((l) => {
          const isSelected = activeLayout === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={cn(
                "p-3 rounded-xl border text-left flex flex-col gap-2 transition-all duration-200 group",
                isSelected
                  ? "border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-lg shadow-indigo-500/10"
                  : "border-white/5 bg-surface-raised hover:border-white/20 text-slate-400 hover:text-white"
              )}
            >
              {l.icon(isSelected)}
              <div>
                <div className="text-xs font-semibold text-white">{l.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1">{l.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
