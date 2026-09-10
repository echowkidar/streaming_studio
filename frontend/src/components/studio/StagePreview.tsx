"use client";

import React from "react";
import { Video } from "lucide-react";
import { useStudioStore } from "@/stores/studio.store";
import { VideoTrackView } from "./VideoTrackView";
import { Participant } from "@/types";
import { cn } from "@/lib/utils";

export const StagePreview: React.FC = () => {
  const {
    activeLayout,
    participants,
    showLogo,
    logoPosition,
    logoUrl,
    activeOverlayUrl,
    activeBackgroundUrl,
    activeThemeColor,
    activeBanner,
    tickerText,
    showTicker,
    pinnedMessage,
  } = useStudioStore();

  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");

  const logoPositionClasses = {
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6",
    "bottom-left": "bottom-14 left-6",
    "bottom-right": "bottom-14 right-6",
  };

  // Helper to render individual participant tile using real WebRTC VideoTrackView
  const renderTile = (p: Participant, index: number, extraClasses = "") => {
    return (
      <div key={p.id} className={cn("relative w-full h-full", extraClasses)}>
        <VideoTrackView
          track={p.videoTrack}
          audioTrack={p.audioTrack}
          name={p.name}
          isSpeaking={p.isSpeaking}
          micOn={p.micOn}
          camOn={p.camOn}
          isLocal={p.isLocal}
          role={p.role}
        />
      </div>
    );
  };

  // Layout Engine Grid Calculator
  const renderLayoutContent = () => {
    if (onStageParticipants.length === 0) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Video className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-sm font-medium">Stage is empty</p>
          <p className="text-xs text-slate-600">Add participants from the right panel to bring them on stage</p>
        </div>
      );
    }

    switch (activeLayout) {
      case "solo":
        return <div className="w-full h-full p-2">{renderTile(onStageParticipants[0], 0, "w-full h-full")}</div>;

      case "side-by-side":
      case "podcast":
      case "interview":
        return (
          <div className="w-full h-full grid grid-cols-2 gap-3 p-3">
            {onStageParticipants.slice(0, 2).map((p, idx) => renderTile(p, idx, "w-full h-full"))}
          </div>
        );

      case "speaker-large":
      case "screen-speaker":
      case "presentation":
        return (
          <div className="w-full h-full flex gap-3 p-3">
            <div className="flex-[3] h-full">
              {renderTile(onStageParticipants[0], 0, "w-full h-full")}
            </div>
            {onStageParticipants.length > 1 && (
              <div className="flex-1 flex flex-col gap-3 h-full">
                {onStageParticipants.slice(1, 4).map((p, idx) => renderTile(p, idx + 1, "w-full flex-1"))}
              </div>
            )}
          </div>
        );

      case "pip":
        return (
          <div className="w-full h-full relative p-3">
            {renderTile(onStageParticipants[0], 0, "w-full h-full")}
            {onStageParticipants.length > 1 && (
              <div className="absolute bottom-6 right-6 w-64 h-36 z-20 shadow-2xl">
                {renderTile(onStageParticipants[1], 1, "w-full h-full border-2 border-indigo-500")}
              </div>
            )}
          </div>
        );

      case "four-grid":
      default:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-3 p-3">
            {onStageParticipants.slice(0, 4).map((p, idx) => renderTile(p, idx, "w-full h-full"))}
          </div>
        );
    }
  };

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-[#050508] shadow-2xl flex flex-col justify-center"
      style={{
        backgroundImage: activeBackgroundUrl ? `url(${activeBackgroundUrl})` : undefined,
        backgroundSize: "cover",
      }}
    >
      {/* Active Video Stage Content */}
      <div className="flex-1 w-full relative">{renderLayoutContent()}</div>

      {/* Watermark Logo Overlay */}
      {showLogo && (
        <div className={cn("absolute z-30 pointer-events-none transition-all", logoPositionClasses[logoPosition])}>
          <div className="px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider text-white font-mono uppercase">{logoUrl}</span>
          </div>
        </div>
      )}

      {/* Lower-Third Banner */}
      {activeBanner && activeBanner.isShowing && (
        <div className="absolute bottom-10 left-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-xl overflow-hidden shadow-2xl flex border border-white/15 backdrop-blur-md bg-black/75">
            <div className="w-2" style={{ backgroundColor: activeBanner.themeColor || activeThemeColor }} />
            <div className="px-5 py-2.5">
              <h4 className="text-sm font-bold text-white tracking-tight">{activeBanner.title}</h4>
              {activeBanner.subtitle && (
                <p className="text-xs text-slate-300 font-medium">{activeBanner.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pinned Stream Message Overlay */}
      {pinnedMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-2xl p-4 bg-black/80 backdrop-blur-md border border-indigo-500/50 shadow-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
              {pinnedMessage.author[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-white">{pinnedMessage.author}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                  {pinnedMessage.platform}
                </span>
              </div>
              <p className="text-xs text-slate-200">{pinnedMessage.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Animated News Ticker Crawl */}
      {showTicker && (
        <div className="absolute bottom-0 inset-x-0 h-8 bg-indigo-950/90 border-t border-indigo-500/30 backdrop-blur-md z-30 flex items-center overflow-hidden">
          <div className="px-3 bg-indigo-600 text-[10px] font-bold tracking-widest text-white uppercase shrink-0 h-full flex items-center">
            LIVE UPDATES
          </div>
          <div className="whitespace-nowrap animate-marquee text-xs font-medium text-white px-4">
            {tickerText}
          </div>
        </div>
      )}
    </div>
  );
};
