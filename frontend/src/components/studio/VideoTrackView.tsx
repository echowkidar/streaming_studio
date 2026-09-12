"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
  Mic, MicOff, VideoOff, MonitorUp, Maximize2, Crop, 
  ZoomIn, ZoomOut, RotateCw, FlipHorizontal, RefreshCw, Move 
} from "lucide-react";
import { useStudioStore } from "@/stores/studio.store";
import { cn } from "@/lib/utils";

interface VideoTrackViewProps {
  id?: string | number;
  track?: any; // LiveKit Track or LocalVideoTrack / RemoteVideoTrack
  audioTrack?: any; // LiveKit RemoteAudioTrack
  mediaStream?: MediaStream | null;
  name: string;
  isSpeaking?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  isLocal?: boolean;
  isScreen?: boolean;
  role?: string;
  className?: string;
}

export function VideoTrackView({
  id,
  track,
  audioTrack,
  mediaStream,
  name,
  isSpeaking = false,
  micOn = true,
  camOn = true,
  isLocal = false,
  isScreen = false,
  role,
  className,
}: VideoTrackViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const attachedTrackRef = useRef<any>(null);

  const { 
    tileTransforms, 
    setTileTransform, 
    resetTileTransform, 
    activeThemeColor 
  } = useStudioStore();

  const tileId = String(id || name || "tile");
  const transform = tileTransforms[tileId] || {
    fitMode: isScreen ? "contain" : "cover",
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  };

  const { fitMode, zoom, panX, panY, rotation, flipH, flipV } = transform;

  // Drag-to-Pan State when zoomed in
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const panStartRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0 });

  // Play video track safely without flickering on re-renders
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (track && typeof track.attach === "function") {
      if (attachedTrackRef.current !== track) {
        if (attachedTrackRef.current && typeof attachedTrackRef.current.detach === "function") {
          try {
            attachedTrackRef.current.detach(videoEl);
          } catch {
            // ignore
          }
        }
        try {
          track.attach(videoEl);
          attachedTrackRef.current = track;
        } catch (attachErr) {
          console.warn("Error attaching video track:", attachErr);
        }
      }
    } else if (mediaStream) {
      if (videoEl.srcObject !== mediaStream) {
        videoEl.srcObject = mediaStream;
      }
    } else {
      if (attachedTrackRef.current && typeof attachedTrackRef.current.detach === "function") {
        try {
          attachedTrackRef.current.detach(videoEl);
        } catch {
          // ignore
        }
        attachedTrackRef.current = null;
      }
      videoEl.srcObject = null;
    }
  }, [track, mediaStream]);

  // Unmount cleanup for video
  useEffect(() => {
    return () => {
      const videoEl = videoRef.current;
      if (videoEl && attachedTrackRef.current && typeof attachedTrackRef.current.detach === "function") {
        try {
          attachedTrackRef.current.detach(videoEl);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Transform Handlers
  const toggleFitMode = () => {
    const next = fitMode === "contain" ? "cover" : "contain";
    setTileTransform(tileId, { fitMode: next });
  };

  const handleZoomIn = () => {
    setTileTransform(tileId, { zoom: Math.min(2.5, Number((zoom + 0.2).toFixed(2))) });
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(1, Number((zoom - 0.2).toFixed(2)));
    setTileTransform(tileId, { 
      zoom: nextZoom,
      panX: nextZoom === 1 ? 0 : panX,
      panY: nextZoom === 1 ? 0 : panY,
    });
  };

  const handleRotate = () => {
    setTileTransform(tileId, { rotation: (rotation + 90) % 360 });
  };

  const handleFlip = () => {
    setTileTransform(tileId, { flipH: !flipH });
  };

  const handleReset = () => {
    resetTileTransform(tileId);
  };

  // Pan Mouse Handlers
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDraggingPan(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panX,
      initialPanY: panY,
    };
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan) return;
    const deltaX = (e.clientX - panStartRef.current.startX) / 4;
    const deltaY = (e.clientY - panStartRef.current.startY) / 4;
    setTileTransform(tileId, {
      panX: Math.max(-50, Math.min(50, Number((panStartRef.current.initialPanX + deltaX).toFixed(1)))),
      panY: Math.max(-50, Math.min(50, Number((panStartRef.current.initialPanY + deltaY).toFixed(1)))),
    });
  };

  const handlePanMouseUp = () => {
    setIsDraggingPan(false);
  };

  const displayName = name || "Guest";
  const initials = displayName
    .split(" ")
    .map((n) => (n ? n[0] : ""))
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const hasActiveVideo = isScreen ? Boolean(track || mediaStream) : (camOn && Boolean(track || mediaStream));

  const isAdjusted = 
    zoom !== 1 || 
    panX !== 0 || 
    panY !== 0 || 
    rotation !== 0 || 
    flipH || 
    (isScreen ? fitMode !== "contain" : fitMode !== "cover");

  // Mirror camera feed for local user if not explicitly flipped
  const mirrorClass = isLocal && !isScreen && !flipH ? "scale-x-[-1]" : "";

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePanMouseDown}
      onMouseMove={handlePanMouseMove}
      onMouseUp={handlePanMouseUp}
      onMouseLeave={handlePanMouseUp}
      style={isSpeaking ? {
        borderColor: activeThemeColor,
        boxShadow: `0 0 24px ${activeThemeColor}70`,
      } : {}}
      className={cn(
        "relative w-full h-full bg-[#0c0c14] rounded-2xl overflow-hidden flex items-center justify-center border transition-all duration-300 group",
        isSpeaking ? "border-2" : "border-white/10 hover:border-white/25",
        zoom > 1 && "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {/* Real Video Element with Transform Matrix */}
      <div className="w-full h-full overflow-hidden flex items-center justify-center relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent audio feedback
          style={{
            objectFit: fitMode,
            transform: `scale(${zoom}) translate(${panX}%, ${panY}%) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            transformOrigin: "center center",
            transition: isDraggingPan ? "none" : "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className={cn(
            "w-full h-full transition-opacity duration-300 pointer-events-none",
            fitMode === "contain" && "bg-black",
            hasActiveVideo ? "opacity-100" : "opacity-0 absolute",
            mirrorClass
          )}
        />
      </div>

      {/* Camera Off / Screen Share Fallback State */}
      {!hasActiveVideo && (
        <div className="flex flex-col items-center justify-center gap-3 p-4 z-10 animate-in fade-in duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-xl">
            {isScreen ? <MonitorUp className="w-8 h-8 text-cyan-400" /> : initials}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            {isScreen ? (
              <>
                <MonitorUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Screen Share Inactive</span>
              </>
            ) : (
              <>
                <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Camera Off</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* FLOATING TILE CONTROLS (StreamYard Paid Parity: Zoom, Fit, Rotate) */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-2xl">
        {/* Fit vs Fill Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFitMode();
          }}
          title={fitMode === "contain" ? "Currently: Fit to Screen (Click to Crop & Fill)" : "Currently: Crop to Fill (Click to Fit 100%)"}
          className={cn(
            "h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors border",
            fitMode === "contain"
              ? "bg-indigo-600/90 border-indigo-400 text-white shadow-md"
              : "bg-white/10 border-white/10 text-slate-300 hover:text-white"
          )}
        >
          {fitMode === "contain" ? <Maximize2 className="w-3 h-3 text-cyan-300" /> : <Crop className="w-3 h-3" />}
          <span>{fitMode === "contain" ? "Fit" : "Fill"}</span>
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center bg-white/5 rounded-lg border border-white/10 px-1 h-7">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            disabled={zoom <= 1}
            title="Zoom Out"
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-200 px-1 min-w-[32px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            disabled={zoom >= 2.5}
            title="Zoom In"
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* Rotate 90° Clockwise */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRotate();
          }}
          title="Rotate 90° (Fix inverted camera / phone screen)"
          className={cn(
            "h-7 px-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold border transition-colors",
            rotation !== 0
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-mono"
              : "bg-white/10 border-white/10 text-slate-300 hover:text-white"
          )}
        >
          <RotateCw className="w-3 h-3" />
          {rotation !== 0 && <span>{rotation}°</span>}
        </button>

        {/* Flip / Mirror Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFlip();
          }}
          title="Flip Horizontal (Mirror)"
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center border transition-colors",
            flipH
              ? "bg-indigo-600/90 border-indigo-400 text-white"
              : "bg-white/10 border-white/10 text-slate-300 hover:text-white"
          )}
        >
          <FlipHorizontal className="w-3 h-3" />
        </button>

        {/* Reset Button (Visible when adjusted) */}
        {isAdjusted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            title="Reset All Adjustments"
            className="h-7 px-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Zoom Drag Hint */}
      {zoom > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[10px] text-slate-300 flex items-center gap-1.5 shadow-lg">
          <Move className="w-3 h-3 text-indigo-400" />
          <span>Click & Drag to Pan Video</span>
        </div>
      )}

      {/* Participant Name & Mic Status Overlay (Styled with Brand Theme Accent) */}
      <div 
        className="absolute bottom-3 left-3 flex items-center gap-2 z-20 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border text-xs shadow-2xl transition-all"
        style={{ borderColor: `${activeThemeColor}50` }}
      >
        <span 
          className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
          style={{ backgroundColor: activeThemeColor }} 
        />
        {isScreen && <MonitorUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
        <span className="font-semibold text-white truncate max-w-[140px] sm:max-w-[200px]">
          {name} {isLocal && !isScreen && "(You)"}
        </span>
        {role && (
          <span 
            className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-wide shrink-0 border"
            style={{ 
              backgroundColor: `${activeThemeColor}20`, 
              color: activeThemeColor,
              borderColor: `${activeThemeColor}40`
            }}
          >
            {role}
          </span>
        )}
        {!isScreen && (
          <>
            <div className="w-px h-3 bg-white/20" />
            {micOn ? (
              <Mic 
                className="w-3.5 h-3.5 transition-colors" 
                style={isSpeaking ? { color: activeThemeColor } : { color: "#94a3b8" }} 
              />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
            )}
          </>
        )}
      </div>

      {/* Speaking Indicator Badge (top-left) */}
      {isSpeaking && (
        <div 
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 border text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in duration-200 shadow-lg backdrop-blur-sm"
          style={{ 
            backgroundColor: `${activeThemeColor}25`, 
            borderColor: activeThemeColor,
            color: activeThemeColor 
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeThemeColor }} />
          <span>SPEAKING</span>
        </div>
      )}
    </div>
  );
}

