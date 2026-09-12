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
    customLayoutConfig,
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
    activeMedia,
    setActiveMedia,
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

  // Helper to render active stage media (video/slides/image)
  const renderMediaTile = () => {
    if (!activeMedia) return null;
    return (
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/95 border border-indigo-500/30 shadow-2xl flex items-center justify-center group">
        {activeMedia.type === "video" && (
          <video
            src={activeMedia.url}
            autoPlay
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        )}
        {(activeMedia.type === "image" || activeMedia.type === "pdf") && (
          <img
            src={activeMedia.url}
            alt={activeMedia.name}
            className="w-full h-full object-contain"
          />
        )}
        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate max-w-[180px]">{activeMedia.name}</span>
        </div>
        <button
          onClick={() => setActiveMedia(null)}
          className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/80 hover:bg-rose-600 text-white text-[10px] font-medium border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          Remove Media
        </button>
      </div>
    );
  };

  // Layout Engine Grid Calculator
  const renderLayoutContent = () => {
    // Stage Media Presentation Mode
    if (activeMedia && (activeMedia.type === "video" || activeMedia.type === "image" || activeMedia.type === "pdf")) {
      if (onStageParticipants.length === 0) {
        return <div className="w-full h-full p-3">{renderMediaTile()}</div>;
      }
      return (
        <div className="w-full h-full flex gap-3 p-3">
          <div className="flex-[3] h-full min-w-0 min-h-0">{renderMediaTile()}</div>
          <div className="flex-1 flex flex-col gap-3 h-full min-w-0 min-h-0 overflow-y-auto">
            {onStageParticipants.map((p, idx) => renderTile(p, idx, "w-full flex-1 min-h-[110px]"))}
          </div>
        </div>
      );
    }

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

    // Custom Layout Studio Mode
    if (activeLayout === "custom") {
      const {
        mode = "hero-side",
        columns = 2,
        gap = 12,
        borderRadius = 16,
        heroParticipantId,
        pipPosition = "bottom-right",
        pipSize = "medium",
        highlightColor = "#6366f1",
        showSpeakerBorder = true,
      } = customLayoutConfig || {};

      const heroIndex = heroParticipantId
        ? onStageParticipants.findIndex((p) => String(p.id) === String(heroParticipantId))
        : 0;
      const validHeroIndex = heroIndex !== -1 ? heroIndex : 0;
      const heroParticipant = onStageParticipants[validHeroIndex] || onStageParticipants[0];
      const otherParticipants = onStageParticipants.filter((_, idx) => idx !== validHeroIndex);

      const tileWrapper = (p: Participant, idx: number, extraClass = "") => {
        const isSpeaker = p.isSpeaking && showSpeakerBorder;
        return (
          <div
            key={p.id}
            className={cn(
              "relative w-full h-full transition-all duration-200 overflow-hidden",
              isSpeaker && "ring-2",
              extraClass
            )}
            style={{
              borderRadius: `${borderRadius}px`,
              borderColor: isSpeaker ? highlightColor : undefined,
              boxShadow: isSpeaker ? `0 0 20px ${highlightColor}40` : undefined,
            }}
          >
            {renderTile(p, idx, "w-full h-full")}
          </div>
        );
      };

      if (mode === "hero-side") {
        return (
          <div className="w-full h-full flex p-3 min-w-0 min-h-0" style={{ gap: `${gap}px` }}>
            <div className="flex-[3] h-full min-w-0 min-h-0">
              {tileWrapper(heroParticipant, 0)}
            </div>
            {otherParticipants.length > 0 && (
              <div className="flex-1 flex flex-col h-full min-w-0 min-h-0" style={{ gap: `${gap}px` }}>
                {otherParticipants.map((p, idx) => (
                  <div key={p.id} className="flex-1 min-h-0 min-w-0">
                    {tileWrapper(p, idx + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      if (mode === "hero-bottom") {
        return (
          <div className="w-full h-full flex flex-col p-3 min-w-0 min-h-0" style={{ gap: `${gap}px` }}>
            <div className="flex-[3] w-full min-h-0 min-w-0">
              {tileWrapper(heroParticipant, 0)}
            </div>
            {otherParticipants.length > 0 && (
              <div className="flex-1 flex flex-row w-full min-h-0 min-w-0" style={{ gap: `${gap}px` }}>
                {otherParticipants.map((p, idx) => (
                  <div key={p.id} className="flex-1 min-w-0 min-h-0">
                    {tileWrapper(p, idx + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      if (mode === "pip") {
        const pipPositions: Record<string, string> = {
          "top-left": "top-6 left-6",
          "top-right": "top-6 right-6",
          "bottom-left": "bottom-6 left-6",
          "bottom-right": "bottom-6 right-6",
        };
        const pipSizes: Record<string, string> = {
          small: "w-48 h-28",
          medium: "w-64 h-36",
          large: "w-80 h-44",
        };
        return (
          <div className="w-full h-full relative p-3">
            {tileWrapper(heroParticipant, 0)}
            {otherParticipants.length > 0 && (
              <div className={cn("absolute z-20 shadow-2xl transition-all duration-300", pipPositions[pipPosition] || "bottom-6 right-6", pipSizes[pipSize] || "w-64 h-36")}>
                {tileWrapper(otherParticipants[0], 1, "border-2 border-indigo-500 shadow-2xl")}
              </div>
            )}
          </div>
        );
      }

      if (mode === "cinema") {
        return (
          <div className="w-full h-full flex items-center justify-center p-3">
            <div
              className="w-full h-full flex p-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
              style={{ gap: `${gap}px` }}
            >
              <div className="flex-[4] h-full min-w-0 min-h-0">
                {tileWrapper(heroParticipant, 0)}
              </div>
              {otherParticipants.length > 0 && (
                <div className="flex-1 flex flex-col h-full min-w-0 min-h-0" style={{ gap: `${gap}px` }}>
                  {otherParticipants.map((p, idx) => (
                    <div key={p.id} className="flex-1 min-h-0 min-w-0">
                      {tileWrapper(p, idx + 1)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      const colClass = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
      }[columns] || "grid-cols-2";

      return (
        <div
          className={cn("w-full h-full grid p-3", colClass)}
          style={{ gap: `${gap}px` }}
        >
          {onStageParticipants.map((p, idx) => (
            <div key={p.id} className="min-h-0 min-w-0 h-full w-full">
              {tileWrapper(p, idx)}
            </div>
          ))}
        </div>
      );
    }

    switch (activeLayout) {
      case "solo":
        return <div className="w-full h-full p-2">{renderTile(onStageParticipants[0], 0, "w-full h-full")}</div>;

      case "side-by-side":
      case "podcast":
      case "interview": {
        const sorted = [...onStageParticipants].sort((a, b) => {
          if (a.isScreen && !b.isScreen) return -1;
          if (!a.isScreen && b.isScreen) return 1;
          return 0;
        });
        return (
          <div className="w-full h-full grid grid-cols-2 gap-3 p-3">
            {sorted.slice(0, 2).map((p, idx) => renderTile(p, idx, "w-full h-full"))}
          </div>
        );
      }

      case "speaker-large":
      case "screen-speaker":
      case "presentation": {
        const sorted = [...onStageParticipants].sort((a, b) => {
          if (a.isScreen && !b.isScreen) return -1;
          if (!a.isScreen && b.isScreen) return 1;
          return 0;
        });
        return (
          <div className="w-full h-full flex gap-3 p-3">
            <div className="flex-[3] h-full min-w-0">
              {renderTile(sorted[0], 0, "w-full h-full")}
            </div>
            {sorted.length > 1 && (
              <div className="flex-1 flex flex-col gap-3 h-full min-w-0">
                {sorted.slice(1, 4).map((p, idx) => renderTile(p, idx + 1, "w-full flex-1"))}
              </div>
            )}
          </div>
        );
      }

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
      default: {
        const sorted = [...onStageParticipants].sort((a, b) => {
          if (a.isScreen && !b.isScreen) return -1;
          if (!a.isScreen && b.isScreen) return 1;
          return 0;
        });
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-3 p-3">
            {sorted.slice(0, 4).map((p, idx) => renderTile(p, idx, "w-full h-full"))}
          </div>
        );
      }
    }
  };

  return (
    <div
      className="relative w-full aspect-video max-h-full max-w-full rounded-2xl overflow-hidden border border-white/10 bg-[#050508] shadow-2xl flex flex-col justify-center mx-auto my-auto"
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
          <div className="px-3 bg-indigo-600 text-[10px] font-bold tracking-widest text-white uppercase shrink-0 h-full flex items-center z-10 shadow-lg">
            LIVE UPDATES
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-marquee text-xs font-medium text-white px-4">
              {tickerText}
            </div>
          </div>
        </div>
      )}

      {/* Active Stage Background Audio Stream */}
      {activeMedia && activeMedia.type === "audio" && (
        <>
          <audio src={activeMedia.url} autoPlay loop />
          <div className="absolute top-6 left-6 z-30 animate-in fade-in">
            <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-cyan-500/40 flex items-center gap-2.5 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[11px] font-medium text-cyan-200 truncate max-w-[160px]">
                🎵 {activeMedia.name}
              </span>
              <button
                onClick={() => setActiveMedia(null)}
                className="text-[10px] text-slate-400 hover:text-rose-400 font-bold ml-1 transition-colors"
                title="Stop Audio"
              >
                ✕
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
