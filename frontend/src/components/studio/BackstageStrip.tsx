"use client";

import React, { useState } from "react";
import { useStudioStore } from "@/stores/studio.store";
import { Participant } from "@/types";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MoreVertical,
  UserPlus,
  MonitorUp,
  Sparkles,
  Crop,
  Check,
  Copy,
  Plus,
  X,
  Presentation,
  Play,
  Pause,
} from "lucide-react";

interface BackstageStripProps {
  onInviteGuest?: () => void;
  onShareScreen?: () => void;
  className?: string;
}

export const BackstageStrip: React.FC<BackstageStripProps> = ({
  onInviteGuest,
  onShareScreen,
  className,
}) => {
  const {
    participants,
    moveToStage,
    moveToBackstage,
    activeMedia,
    setActiveMedia,
    tileTransforms,
    setTileTransform,
    customLayoutConfig,
    setCustomLayoutConfig,
  } = useStudioStore();

  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);

  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");

  const toggleParticipantStage = (p: Participant) => {
    if (p.status === "ON_STAGE") {
      moveToBackstage(p.id);
    } else {
      moveToStage(p.id);
    }
  };

  return (
    <div
      className={cn(
        "w-full px-2 py-1 flex items-center gap-2 overflow-x-auto custom-scrollbar select-none shrink-0 min-h-[90px] max-h-[110px]",
        className
      )}
    >
      {/* Participant Stream Cards */}
      {participants.map((p) => {
        const isOnStage = p.status === "ON_STAGE";
        const isScreen = p.role === "screen" || p.isScreen === true;
        const fitMode = (tileTransforms[p.id]?.fitMode as "contain" | "cover") || "cover";
        const isSpotlighted = customLayoutConfig?.heroParticipantId === p.id;

        return (
          <div
            key={p.id}
            onClick={() => toggleParticipantStage(p)}
            className={cn(
              "group relative w-36 sm:w-44 h-20 sm:h-22 rounded-xl border overflow-hidden shrink-0 cursor-pointer transition-all duration-200 bg-[#0e0f18] shadow-lg",
              isOnStage
                ? "border-indigo-500 ring-1 ring-indigo-500/50 bg-[#121324]"
                : "border-white/10 hover:border-white/25 opacity-75 hover:opacity-100"
            )}
            title={isOnStage ? "Click to remove from stage (Backstage)" : "Click to add to stage (In Stream)"}
          >
            {/* Card Preview Background */}
            <div className="absolute inset-0 bg-[#0a0a12] flex items-center justify-center overflow-hidden">
              {p.camOn ? (
                <div className="w-full h-full relative">
                  {/* Live WebRTC or simulated camera video feed */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 z-10 pointer-events-none" />
                  <div className="w-full h-full flex items-center justify-center bg-indigo-950/20">
                    <span className="text-xl font-bold text-indigo-300 opacity-60">
                      {isScreen ? <MonitorUp className="w-6 h-6 text-cyan-400" /> : p.name ? p.name[0]?.toUpperCase() : "G"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-400">
                    {p.name ? p.name[0]?.toUpperCase() : "G"}
                  </div>
                </div>
              )}
            </div>

            {/* Top Quick Status Bar on Card */}
            <div className="absolute top-1.5 left-1.5 right-1.5 z-20 flex items-center justify-between pointer-events-auto">
              {/* Mic Status */}
              <div
                className={cn(
                  "p-1 rounded-md backdrop-blur-md border text-[10px]",
                  p.micOn
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/20 border-rose-500/30 text-rose-400"
                )}
                title={p.micOn ? "Microphone active" : "Microphone muted"}
              >
                {p.micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              </div>

              {/* Cam / Screen Status */}
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    "p-1 rounded-md backdrop-blur-md border text-[10px]",
                    p.camOn
                      ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                      : "bg-slate-800/80 border-white/10 text-slate-400"
                  )}
                  title={p.camOn ? "Camera active" : "Camera off"}
                >
                  {isScreen ? (
                    <MonitorUp className="w-3 h-3 text-cyan-400" />
                  ) : p.camOn ? (
                    <Video className="w-3 h-3" />
                  ) : (
                    <VideoOff className="w-3 h-3" />
                  )}
                </div>

                {/* 3-dots Menu Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === p.id ? null : p.id);
                  }}
                  className="p-1 rounded-md bg-black/60 hover:bg-black/80 border border-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Participant options"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 3-dots Dropdown Context Menu */}
            {activeMenuId === p.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-8 right-1.5 z-50 w-44 bg-[#141524] border border-white/20 rounded-xl shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95"
              >
                <button
                  type="button"
                  onClick={() => {
                    toggleParticipantStage(p);
                    setActiveMenuId(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between text-slate-200 hover:bg-white/10"
                >
                  <span>{isOnStage ? "Remove to Backstage" : "Add to Stage"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomLayoutConfig({
                      heroParticipantId: isSpotlighted ? null : p.id,
                    });
                    setActiveMenuId(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-1.5 text-slate-200 hover:bg-white/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSpotlighted ? "Un-spotlight" : "Spotlight Speaker"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextFit = fitMode === "cover" ? "contain" : "cover";
                    setTileTransform(p.id, { fitMode: nextFit });
                    setActiveMenuId(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-1.5 text-slate-200 hover:bg-white/10"
                >
                  <Crop className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{fitMode === "cover" ? "Switch to Fit (16:9)" : "Switch to Fill (Cropped)"}</span>
                </button>
              </div>
            )}

            {/* Bottom StreamYard-Style Name Badge */}
            <div className="absolute bottom-1 left-1.5 right-1.5 z-20 flex items-center justify-between gap-1">
              <div
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-semibold truncate flex items-center gap-1 shadow-md",
                  isOnStage
                    ? "bg-indigo-600/90 text-white border border-indigo-400/50"
                    : "bg-black/80 text-slate-300 border border-white/10"
                )}
              >
                {isScreen ? <MonitorUp className="w-2.5 h-2.5 text-cyan-300 shrink-0" /> : null}
                <span className="truncate">@{p.name || "Guest"}</span>
              </div>

              {/* On-Stage Indicator Pill */}
              {isOnStage && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                  On Stage
                </span>
              )}
            </div>

            {/* Hover Stage Action Overlay (StreamYard 'Add to stage' & 'Remove' style) */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 pointer-events-none">
              <span
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-bold shadow-lg transition-transform group-hover:scale-105",
                  isOnStage
                    ? "bg-[#8cb4f5] text-[#0a1128] font-black shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                    : "bg-[#1b1c2b] text-white border border-white/20 shadow-xl"
                )}
              >
                {isOnStage ? "Remove" : "Add to stage"}
              </span>
            </div>
          </div>
        );
      })}

      {/* Shared Active Media / Slide Deck Card */}
      {activeMedia && (
        <div
          onClick={() => setActiveMedia(null)}
          className="group relative w-36 sm:w-44 h-20 sm:h-22 rounded-xl border border-indigo-500/80 bg-[#121324] overflow-hidden shrink-0 cursor-pointer shadow-lg hover:border-indigo-400 transition-all"
          title="Click to remove presentation/media from stage"
        >
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center">
            <Presentation className="w-5 h-5 text-indigo-400 mb-0.5" />
            <span className="text-[10px] font-semibold text-slate-200 line-clamp-1">
              {activeMedia.name || "Presentation Slide"}
            </span>
          </div>

          {/* Top-right menu indicator */}
          <div className="absolute top-1 right-1 z-20">
            <span className="p-0.5 rounded bg-black/60 text-slate-400">
              <MoreVertical className="w-3 h-3" />
            </span>
          </div>

          {/* Bottom StreamYard Slide Navigation Pill on Card */}
          <div className="absolute bottom-1 inset-x-1.5 z-20 flex items-center justify-between bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 text-[9px]">
            <span className="font-semibold text-slate-300">Slide 1 ▾</span>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="hover:text-white px-0.5">‹</span>
              <span className="hover:text-white px-0.5">›</span>
            </div>
          </div>

          {/* Hover Remove Pill */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-30">
            <span className="px-3 py-1 rounded-md text-[11px] font-black bg-[#8cb4f5] text-[#0a1128] shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              Remove
            </span>
          </div>
        </div>
      )}

      {/* Add Guest / Present Card */}
      <button
        type="button"
        onClick={onInviteGuest}
        className="w-28 sm:w-32 h-20 sm:h-22 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-indigo-400/50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition-all shrink-0 group"
        title="Invite guest to studio"
      >
        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:border-indigo-400 transition-all text-slate-400 group-hover:text-indigo-300">
          <UserPlus className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-semibold">Invite Guest</span>
      </button>

      {/* Share Screen / Slide Card */}
      <button
        type="button"
        onClick={onShareScreen}
        className="w-28 sm:w-32 h-20 sm:h-22 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-cyan-400/50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition-all shrink-0 group"
        title="Share screen, slides, or presentation"
      >
        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500/20 group-hover:border-cyan-400 transition-all text-slate-400 group-hover:text-cyan-300">
          <MonitorUp className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-semibold">Share Screen</span>
      </button>
    </div>
  );
};
