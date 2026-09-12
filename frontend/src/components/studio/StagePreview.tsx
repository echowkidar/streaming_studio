"use client";

import React, { useRef } from "react";
import { Video, Volume2, VolumeX, EyeOff, X, Move, Maximize2, Crop } from "lucide-react";
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
    activeStageOverlay,
    updateStageOverlay,
    setStageOverlay,
    toggleStageOverlayVisibility,
    activeBackgroundUrl,
    activeThemeColor,
    activeBanner,
    tickerText,
    showTicker,
    pinnedMessage,
    activeMedia,
    setActiveMedia,
    layoutSplitRatio,
    setLayoutSplitRatio,
  } = useStudioStore();

  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");

  const logoPositionClasses = {
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6",
    "bottom-left": "bottom-14 left-6",
    "bottom-right": "bottom-14 right-6",
  };

  const stageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingOverlayRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Stage Window Resizing Drag Handlers
  const isDraggingSplitRef = useRef(false);

  const handleSplitDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stageContainerRef.current) return;
    isDraggingSplitRef.current = true;

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingSplitRef.current || !stageContainerRef.current) return;
      const rect = stageContainerRef.current.getBoundingClientRect();
      const relativeX = moveEvt.clientX - rect.left;
      const percentage = Math.round((relativeX / rect.width) * 100);
      const clamped = Math.max(20, Math.min(80, percentage));
      setLayoutSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      isDraggingSplitRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSplitDividerTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!stageContainerRef.current || e.touches.length === 0) return;
    isDraggingSplitRef.current = true;

    const handleTouchMove = (touchEvt: TouchEvent) => {
      if (!isDraggingSplitRef.current || !stageContainerRef.current || touchEvt.touches.length === 0) return;
      const rect = stageContainerRef.current.getBoundingClientRect();
      const relativeX = touchEvt.touches[0].clientX - rect.left;
      const percentage = Math.round((relativeX / rect.width) * 100);
      const clamped = Math.max(20, Math.min(80, percentage));
      setLayoutSplitRatio(clamped);
    };

    const handleTouchEnd = () => {
      isDraggingSplitRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (!stageContainerRef.current || !activeStageOverlay) return;
    const stageRect = stageContainerRef.current.getBoundingClientRect();
    isDraggingOverlayRef.current = true;

    const currentX = activeStageOverlay.customCoords?.x ?? (
      activeStageOverlay.position === "top-right" || activeStageOverlay.position === "bottom-right"
        ? Math.max(0, 100 - activeStageOverlay.scale - 4)
        : 4
    );
    const currentY = activeStageOverlay.customCoords?.y ?? (
      activeStageOverlay.position === "bottom-left" || activeStageOverlay.position === "bottom-right"
        ? Math.max(0, 100 - (activeStageOverlay.scale * 0.5625) - 6)
        : 4
    );

    const mouseXPercent = ((e.clientX - stageRect.left) / stageRect.width) * 100;
    const mouseYPercent = ((e.clientY - stageRect.top) / stageRect.height) * 100;

    dragOffsetRef.current = {
      x: mouseXPercent - currentX,
      y: mouseYPercent - currentY,
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingOverlayRef.current || !stageContainerRef.current) return;
      const rect = stageContainerRef.current.getBoundingClientRect();
      const curX = ((moveEvt.clientX - rect.left) / rect.width) * 100;
      const curY = ((moveEvt.clientY - rect.top) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100 - activeStageOverlay.scale, curX - dragOffsetRef.current.x));
      const newY = Math.max(0, Math.min(85, curY - dragOffsetRef.current.y));

      updateStageOverlay({
        position: "custom",
        customCoords: { x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)) },
      });
    };

    const handleMouseUp = () => {
      isDraggingOverlayRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleOverlayTouchStart = (e: React.TouchEvent) => {
    if (!stageContainerRef.current || !activeStageOverlay || e.touches.length === 0) return;
    const touch = e.touches[0];
    const stageRect = stageContainerRef.current.getBoundingClientRect();
    isDraggingOverlayRef.current = true;

    const currentX = activeStageOverlay.customCoords?.x ?? (
      activeStageOverlay.position === "top-right" || activeStageOverlay.position === "bottom-right"
        ? Math.max(0, 100 - activeStageOverlay.scale - 4)
        : 4
    );
    const currentY = activeStageOverlay.customCoords?.y ?? (
      activeStageOverlay.position === "bottom-left" || activeStageOverlay.position === "bottom-right"
        ? Math.max(0, 100 - (activeStageOverlay.scale * 0.5625) - 6)
        : 4
    );

    const touchXPercent = ((touch.clientX - stageRect.left) / stageRect.width) * 100;
    const touchYPercent = ((touch.clientY - stageRect.top) / stageRect.height) * 100;

    const offset = {
      x: touchXPercent - currentX,
      y: touchYPercent - currentY,
    };

    const handleTouchMove = (moveEvt: TouchEvent) => {
      if (moveEvt.touches.length === 0 || !stageContainerRef.current) return;
      const t = moveEvt.touches[0];
      const rect = stageContainerRef.current.getBoundingClientRect();
      const curX = ((t.clientX - rect.left) / rect.width) * 100;
      const curY = ((t.clientY - rect.top) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100 - activeStageOverlay.scale, curX - offset.x));
      const newY = Math.max(0, Math.min(85, curY - offset.y));

      updateStageOverlay({
        position: "custom",
        customCoords: { x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)) },
      });
    };

    const handleTouchEnd = () => {
      isDraggingOverlayRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const getOverlayStyle = (): React.CSSProperties => {
    if (!activeStageOverlay) return {};
    const scale = activeStageOverlay.scale || 35;
    const opacity = (activeStageOverlay.opacity ?? 100) / 100;

    const baseStyle: React.CSSProperties = {
      width: `${scale}%`,
      opacity,
      zIndex: 25,
      transition: isDraggingOverlayRef.current ? "none" : "all 0.15s ease-out",
    };

    if (activeStageOverlay.position === "custom" && activeStageOverlay.customCoords) {
      return {
        ...baseStyle,
        position: "absolute",
        left: `${activeStageOverlay.customCoords.x}%`,
        top: `${activeStageOverlay.customCoords.y}%`,
      };
    }

    switch (activeStageOverlay.position) {
      case "top-left":
        return { ...baseStyle, position: "absolute", top: "4%", left: "4%" };
      case "top-right":
        return { ...baseStyle, position: "absolute", top: "4%", right: "4%" };
      case "bottom-left":
        return { ...baseStyle, position: "absolute", bottom: "7%", left: "4%" };
      case "bottom-right":
        return { ...baseStyle, position: "absolute", bottom: "7%", right: "4%" };
      case "center":
      default:
        return {
          ...baseStyle,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }
  };

  const getCropClasses = () => {
    if (!activeStageOverlay) return "object-contain";
    switch (activeStageOverlay.cropMode) {
      case "cover":
        return "w-full aspect-video object-cover";
      case "square":
        return "w-full aspect-square object-cover";
      case "circle":
        return "w-full aspect-square object-cover rounded-full";
      case "fit":
      default:
        return "w-full h-auto object-contain";
    }
  };

  // Helper to render individual participant tile using real WebRTC VideoTrackView
  const renderTile = (p: Participant, index: number, extraClasses = "") => {
    const isScreen = p.role === "screen" || p.isScreen === true;
    return (
      <div key={p.id} className={cn("relative w-full h-full", extraClasses)}>
        <VideoTrackView
          id={p.id}
          track={p.videoTrack}
          audioTrack={p.audioTrack}
          name={p.name}
          isSpeaking={p.isSpeaking}
          micOn={p.micOn}
          camOn={p.camOn}
          isLocal={p.isLocal}
          isScreen={isScreen}
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
        if (sorted.length <= 1) {
          return <div className="w-full h-full p-2">{renderTile(sorted[0] || onStageParticipants[0], 0, "w-full h-full")}</div>;
        }
        return (
          <div className="w-full h-full flex items-center p-3 relative group/split min-w-0 min-h-0">
            {/* Left Tile (Host / Speaker) */}
            <div
              style={{ width: `${layoutSplitRatio}%` }}
              className="h-full min-w-0 transition-[width] duration-75"
            >
              {renderTile(sorted[0], 0, "w-full h-full")}
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="relative flex items-center justify-center w-4 cursor-col-resize select-none group/divider z-30 shrink-0 h-full -mx-1"
              onMouseDown={handleSplitDividerMouseDown}
              onTouchStart={handleSplitDividerTouchStart}
              title="Drag to resize windows (Left: Host, Right: Guest)"
            >
              <div className="w-1 h-full rounded-full bg-white/10 group-hover/divider:bg-indigo-500 transition-colors" />
              <div className="absolute w-5 h-8 rounded-full bg-black/90 border border-white/20 flex items-center justify-center shadow-2xl group-hover/divider:border-indigo-400 group-hover/divider:scale-110 transition-all">
                <div className="flex flex-col gap-0.5">
                  <span className="w-0.5 h-2 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>

            {/* Right Tile (Guest / Co-Host) */}
            <div
              style={{ width: `${100 - layoutSplitRatio}%` }}
              className="h-full min-w-0 transition-[width] duration-75"
            >
              {renderTile(sorted[1], 1, "w-full h-full")}
            </div>
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
        if (sorted.length <= 1) {
          return <div className="w-full h-full p-2">{renderTile(sorted[0] || onStageParticipants[0], 0, "w-full h-full")}</div>;
        }
        return (
          <div className="w-full h-full flex items-center p-3 relative group/split min-w-0 min-h-0">
            {/* Main Stage Window (Hero / Screen) */}
            <div
              style={{ width: `${layoutSplitRatio}%` }}
              className="h-full min-w-0 transition-[width] duration-75"
            >
              {renderTile(sorted[0], 0, "w-full h-full")}
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="relative flex items-center justify-center w-4 cursor-col-resize select-none group/divider z-30 shrink-0 h-full -mx-1"
              onMouseDown={handleSplitDividerMouseDown}
              onTouchStart={handleSplitDividerTouchStart}
              title="Drag to resize windows (Left: Main, Right: Guests)"
            >
              <div className="w-1 h-full rounded-full bg-white/10 group-hover/divider:bg-indigo-500 transition-colors" />
              <div className="absolute w-5 h-8 rounded-full bg-black/90 border border-white/20 flex items-center justify-center shadow-2xl group-hover/divider:border-indigo-400 group-hover/divider:scale-110 transition-all">
                <div className="flex flex-col gap-0.5">
                  <span className="w-0.5 h-2 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>

            {/* Sidebar Guests Stack */}
            <div
              style={{ width: `${100 - layoutSplitRatio}%` }}
              className="flex-1 flex flex-col gap-2.5 h-full min-w-0 transition-[width] duration-75"
            >
              {sorted.slice(1, 4).map((p, idx) => renderTile(p, idx + 1, "w-full flex-1"))}
            </div>
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
      ref={stageContainerRef}
      className="relative w-full aspect-video max-h-full max-w-full rounded-2xl overflow-hidden border border-white/10 bg-[#050508] shadow-2xl flex flex-col justify-center mx-auto my-auto select-none group/stage"
      style={{
        backgroundImage: activeBackgroundUrl ? `url(${activeBackgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Active Video Stage Content */}
      <div className="flex-1 w-full relative">{renderLayoutContent()}</div>

      {/* StreamYard Stage Window Quick-Split Controller (appears on hover when 2+ on stage) */}
      {onStageParticipants.length >= 2 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/stage:opacity-100 hover:opacity-100 transition-opacity duration-200 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 flex items-center gap-1.5 shadow-2xl pointer-events-auto">
          <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider">Split:</span>
          {[
            { label: "50:50", ratio: 50 },
            { label: "65:35", ratio: 65 },
            { label: "35:65", ratio: 35 },
            { label: "75:25", ratio: 75 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => setLayoutSplitRatio(preset.ratio)}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all border",
                Math.abs(layoutSplitRatio - preset.ratio) <= 2
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-md"
                  : "bg-white/5 border-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              {preset.label}
            </button>
          ))}
          <span className="w-px h-3 bg-white/20 ml-0.5" />
          <span className="text-[10px] font-mono text-cyan-300 font-bold px-1">
            {layoutSplitRatio}% | {100 - layoutSplitRatio}%
          </span>
        </div>
      )}

      {/* StreamYard Full-Frame Overlay (1920x1080 Transparent PNG/GIF/WebM) */}
      {activeOverlayUrl && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <img
            src={activeOverlayUrl}
            alt="Full Frame Overlay"
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      )}

      {/* Real-time Interactive Stage Overlay Layer (Images / Videos / Graphics) */}
      {activeStageOverlay && activeStageOverlay.isShowing && (
        <div
          style={getOverlayStyle()}
          className="group/overlay cursor-move select-none"
          onMouseDown={handleOverlayMouseDown}
          onTouchStart={handleOverlayTouchStart}
        >
          {/* Quick-action Mini Dock: Placed outside cropped container so it NEVER gets clipped by circle or rounded corners! */}
          <div
            className={cn(
              "absolute z-40 left-1/2 -translate-x-1/2 opacity-0 group-hover/overlay:opacity-100 transition-opacity bg-black/90 backdrop-blur-md rounded-xl px-2 py-1 flex items-center gap-1.5 border border-white/20 shadow-2xl pointer-events-auto whitespace-nowrap",
              (activeStageOverlay.customCoords?.y ?? (activeStageOverlay.position.startsWith("top") ? 5 : 80)) < 16
                ? "-bottom-10"
                : "-top-10"
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Drag Handle Indicator */}
            <span className="text-slate-400 p-0.5 mr-0.5 cursor-move" title="Drag to reposition">
              <Move className="w-3 h-3" />
            </span>

            {/* Quick Size cycle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextScale = activeStageOverlay.scale === 20 ? 35 : activeStageOverlay.scale === 35 ? 60 : activeStageOverlay.scale === 60 ? 100 : 20;
                updateStageOverlay({ scale: nextScale });
              }}
              className="px-1.5 py-0.5 hover:bg-white/20 rounded text-slate-300 hover:text-white text-[10px] font-mono"
              title={`Current scale: ${activeStageOverlay.scale}%. Click to cycle scale.`}
            >
              {activeStageOverlay.scale}%
            </button>

            <span className="w-px h-3 bg-white/20" />

            {/* Quick Crop toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const modes: ("fit" | "cover" | "square" | "circle")[] = ["fit", "cover", "square", "circle"];
                const nextIdx = (modes.indexOf(activeStageOverlay.cropMode) + 1) % modes.length;
                updateStageOverlay({ cropMode: modes[nextIdx] });
              }}
              className="px-1.5 py-0.5 hover:bg-white/20 rounded text-slate-300 hover:text-white text-[10px] uppercase font-semibold"
              title={`Crop Mode: ${activeStageOverlay.cropMode}. Click to cycle.`}
            >
              {activeStageOverlay.cropMode}
            </button>

            {/* Mute toggle for video */}
            {activeStageOverlay.type === "video" && (
              <>
                <span className="w-px h-3 bg-white/20" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStageOverlay({ isMuted: !activeStageOverlay.isMuted });
                  }}
                  className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                  title={activeStageOverlay.isMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {activeStageOverlay.isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                </button>
              </>
            )}

            {/* Transparent PNG vs Card Backdrop Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateStageOverlay({ showBackdrop: !activeStageOverlay.showBackdrop });
              }}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors",
                activeStageOverlay.showBackdrop
                  ? "bg-white/20 border-white/30 text-white"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              )}
              title={activeStageOverlay.showBackdrop ? "Currently: Card Background (Click for 100% Transparent PNG)" : "Currently: 100% Transparent PNG (Click for Card Box)"}
            >
              {activeStageOverlay.showBackdrop ? "Card" : "PNG"}
            </button>

            <span className="w-px h-3 bg-white/20" />

            {/* Hide Live */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleStageOverlayVisibility();
              }}
              className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
              title="Hide overlay"
            >
              <EyeOff className="w-3 h-3" />
            </button>

            {/* Remove */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStageOverlay(null);
              }}
              className="p-1 hover:bg-rose-600 rounded text-slate-300 hover:text-white"
              title="Remove overlay from stage"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Inner Cropped Content Container */}
          <div
            className={cn(
              "relative overflow-hidden transition-shadow select-none",
              activeStageOverlay.showBackdrop
                ? "bg-black/75 backdrop-blur-md border border-white/10 shadow-2xl"
                : "bg-transparent",
              activeStageOverlay.cropMode === "circle" ? "rounded-full" : "rounded-2xl"
            )}
            style={{
              borderRadius: activeStageOverlay.cropMode === "circle" ? "9999px" : `${activeStageOverlay.borderRadius || 16}px`,
            }}
          >
            {activeStageOverlay.type === "video" ? (
              <video
                src={activeStageOverlay.url}
                autoPlay
                playsInline
                loop={activeStageOverlay.isLooping !== false}
                muted={activeStageOverlay.isMuted !== false}
                className={getCropClasses()}
              />
            ) : (
              <img
                src={activeStageOverlay.url}
                alt={activeStageOverlay.name}
                className={cn(
                  getCropClasses(),
                  !activeStageOverlay.showBackdrop && "drop-shadow-md"
                )}
                draggable={false}
              />
            )}
          </div>
        </div>
      )}

      {/* Watermark Logo Overlay */}
      {showLogo && (
        <div className={cn("absolute z-30 pointer-events-none transition-all", logoPositionClasses[logoPosition])}>
          <div 
            className="px-3.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border flex items-center gap-2 shadow-xl"
            style={{ borderColor: `${activeThemeColor}50` }}
          >
            <span 
              className="w-2 h-2 rounded-full animate-pulse shadow-sm" 
              style={{ backgroundColor: activeThemeColor }} 
            />
            <span className="text-xs font-bold tracking-wider text-white font-mono uppercase">{logoUrl}</span>
          </div>
        </div>
      )}

      {/* Lower-Third Banner */}
      {activeBanner && activeBanner.isShowing && (
        <div className="absolute bottom-10 left-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-xl overflow-hidden shadow-2xl flex border border-white/15 backdrop-blur-md bg-black/85">
            <div className="w-2.5" style={{ backgroundColor: activeBanner.themeColor || activeThemeColor }} />
            <div className="px-5 py-2.5">
              <h4 className="text-sm font-bold text-white tracking-tight">{activeBanner.title}</h4>
              {activeBanner.subtitle && (
                <p className="text-xs font-medium" style={{ color: activeThemeColor }}>{activeBanner.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pinned Stream Message Overlay */}
      {pinnedMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div 
            className="rounded-2xl p-4 bg-black/85 backdrop-blur-md border shadow-2xl flex items-start gap-3"
            style={{ borderColor: `${activeThemeColor}60` }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-md"
              style={{ backgroundColor: activeThemeColor }}
            >
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
        <div 
          className="absolute bottom-0 inset-x-0 h-8 bg-black/90 border-t backdrop-blur-md z-30 flex items-center overflow-hidden"
          style={{ 
            borderColor: `${activeThemeColor}40`,
            borderBottom: `2px solid ${activeThemeColor}`
          }}
        >
          <div 
            className="px-3 text-[10px] font-black tracking-widest text-white uppercase shrink-0 h-full flex items-center z-10 shadow-lg"
            style={{ backgroundColor: activeThemeColor }}
          >
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
