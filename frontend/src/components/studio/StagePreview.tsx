"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Video,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  EyeOff,
  X,
  Move,
  Maximize2,
  Crop,
  Layers,
  RotateCcw,
  Repeat,
  Sparkles,
  UserPlus,
  Copy,
  Check,
  Youtube,
  Twitch,
  Globe,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldAlert,
  MonitorUp,
  Trash2,
  Play,
  Pause,
  RotateCw,
  Scissors,
  Clipboard,
  ArrowLeftRight,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useStudioStore, ParticipantBounds, CustomLayoutConfig, MediaFileItem } from "@/stores/studio.store";
import { VideoTrackView } from "./VideoTrackView";
import { Participant } from "@/types";
import { cn } from "@/lib/utils";
import { getDefaultSlotBounds, getLayoutExpectedSlots, calculateStageLayout } from "@/lib/layoutBounds";
import { stageBroadcaster } from "@/lib/stageBroadcaster";
import { StageTelestrator } from "./StageTelestrator";
import { YouTubeLibraryModal, extractYouTubeVideoId } from "./YouTubeLibraryModal";
import { TacticalMapStageCanvas, TacticalMapModal } from "./TacticalMapModal";
import { InteractiveWebsiteStageView, WebsiteLibraryModal } from "./WebsiteLibraryModal";

/**
 * Dedicated 60FPS HTML5 Canvas Overlay for Fair-Use Film Grain, Refined 35mm Cinema Hairlines,
 * Traveling Scanlines & Dynamic Vignette on Stage Preview
 */
const FairUseCanvasOverlay: React.FC<{
  grainEnabled: boolean;
  grainIntensity: "light" | "medium" | "strong" | "random";
  linesEnabled: boolean;
  linesIntensity: "light" | "medium" | "strong";
}> = ({ grainEnabled, grainIntensity, linesEnabled, linesIntensity }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateSize = () => {
      if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvas.width = Math.round(rect.width);
          canvas.height = Math.round(rect.height);
        }
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    let animId: number;
    let lastDraw = 0;

    const renderLoop = (now: number) => {
      if (now - lastDraw >= 42) {
        lastDraw = now;
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // 1. Dynamic Multi-Scale Film Grain & Specular Dust Particles
        if (grainEnabled) {
          const isRandom = grainIntensity === "random";
          const particleCount =
            grainIntensity === "light"
              ? 360
              : grainIntensity === "medium"
                ? 680
                : grainIntensity === "strong"
                  ? 1100
                  : 540 + ((Math.sin(now / 380) + 1) * 280) | 0;

          const baseAlpha =
            grainIntensity === "light"
              ? 0.16
              : grainIntensity === "medium"
                ? 0.25
                : grainIntensity === "strong"
                  ? 0.36
                  : 0.2 + ((Math.cos(now / 520) + 1) * 0.08);

          for (let i = 0; i < particleCount; i++) {
            const gx = (Math.random() * W) | 0;
            const gy = (Math.random() * H) | 0;
            const sz = Math.random() < 0.78 ? 1.5 : 2.3;
            const isBright = Math.random() > 0.45;
            if (isRandom && i % 5 === 0) {
              const r = isBright ? 255 : 35;
              const g = isBright ? 235 : 45;
              const b = isBright ? 190 : 75;
              ctx.fillStyle = `rgba(${r},${g},${b},${(baseAlpha * (0.45 + Math.random() * 0.55)).toFixed(2)})`;
            } else {
              ctx.fillStyle = isBright
                ? `rgba(255,252,240,${(baseAlpha * (0.45 + Math.random() * 0.55)).toFixed(2)})`
                : `rgba(12,14,22,${(baseAlpha * 0.65).toFixed(2)})`;
            }
            ctx.fillRect(gx, gy, sz, sz);
          }

          // Subtle 35mm cinema dust flecks
          const fleckCount = grainIntensity === "light" ? 2 : grainIntensity === "strong" ? 6 : 4;
          for (let f = 0; f < fleckCount; f++) {
            const fx = Math.random() * W;
            const fy = Math.random() * H;
            ctx.fillStyle = `rgba(255,250,230,${(baseAlpha * 0.85).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(fx, fy, 0.9 + Math.random() * 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 2. Refined 35mm Vintage Projector Scratches (Crisp Hairlines that NEVER block faces!)
        if (linesEnabled) {
          const lineCount =
            linesIntensity === "light" ? 2 : linesIntensity === "strong" ? 5 : 3;
          const lineThick =
            linesIntensity === "light" ? 0.8 : linesIntensity === "strong" ? 2.1 : 1.35;
          const baseLineAlpha =
            linesIntensity === "light" ? 0.22 : linesIntensity === "strong" ? 0.42 : 0.32;

          for (let i = 0; i < lineCount; i++) {
            const seed = (i * 157 + Math.floor(now / 110)) % 1000;
            const lx = ((seed * 73) % 94 + 3) * (W / 100) + (Math.random() - 0.5) * 6;
            const tilt = (Math.random() - 0.5) * 5;
            const isGlowing = i % 2 === 0;
            const alpha = baseLineAlpha * (0.6 + Math.random() * 0.4);

            ctx.save();
            ctx.lineWidth = lineThick;
            ctx.strokeStyle = isGlowing
              ? `rgba(255, 248, 225, ${alpha.toFixed(2)})`
              : `rgba(15, 18, 26, ${(alpha * 0.85).toFixed(2)})`;

            ctx.beginPath();
            const startY = Math.random() < 0.5 ? 0 : Math.random() * H * 0.3;
            const endY = Math.random() < 0.5 ? H : startY + H * (0.4 + Math.random() * 0.45);
            ctx.moveTo(lx, startY);
            ctx.lineTo(lx + tilt, Math.min(H, endY));
            ctx.stroke();
            ctx.restore();
          }

          // Traveling horizontal VHS/35mm micro-scanline bar
          const scanY = ((now * 0.11) % (H + 60)) - 30;
          const scanGrad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
          scanGrad.addColorStop(0, "rgba(255,255,255,0)");
          scanGrad.addColorStop(0.5, `rgba(255,248,230,${(baseLineAlpha * 0.22).toFixed(2)})`);
          scanGrad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = scanGrad;
          ctx.fillRect(0, scanY - 8, W, 16);
        }

        // 3. Subtle Dynamic Corner Vignette (shifts edge macroblock luminance)
        const vigGrad = ctx.createRadialGradient(
          W / 2,
          H / 2,
          Math.min(W, H) * 0.36,
          W / 2,
          H / 2,
          Math.max(W, H) * 0.72
        );
        vigGrad.addColorStop(0, "rgba(0,0,0,0)");
        vigGrad.addColorStop(1, "rgba(0,0,0,0.2)");
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, W, H);
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", updateSize);
    };
  }, [grainEnabled, grainIntensity, linesEnabled, linesIntensity]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      className="absolute inset-0 w-full h-full pointer-events-none z-[25] select-none"
    />
  );
};

export const StagePreview: React.FC = () => {
  const {
    activeLayout,
    customLayoutConfig,
    setCustomLayoutConfig,
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
    activeBackgroundType,
    activeThemeColor,
    activeBanner,
    tickerText,
    showTicker,
    tickerConfig,
    logoConfig,
    pinnedMessage,
    pinMessage,
    commentConfig,
    activeMedia,
    setActiveMedia,
    secondaryMedia,
    setSecondaryMedia,
    toggleSecondaryMediaMute,
    setSecondaryMediaMuted,
    setSecondaryMediaVolume,
    layoutSplitRatio,
    setLayoutSplitRatio,
    participantBounds,
    setParticipantBounds,
    resetParticipantBounds,
    resetAllParticipantBounds,
    selectedParticipantId,
    setSelectedParticipantId,
    tileTransforms,
    setTileTransform,
    isDrawingMode,
    toggleMediaMute,
    setMediaMuted,
    setMediaVolume,
    toggleParticipantMic,
    mediaSlotIndex,
    setMediaSlotIndex,
    moveParticipantOrder,
    soloTargetId,
    toggleSoloParticipant,
    scenes,
    activeSceneId,
    isStageCropped,
    fairUseConfig,
    setFairUseConfig,
    activeTextCard,
    nextSlide,
    prevSlide,
    isSceneTransitioning,
    isMediaTransitioning,
    newlyAddedParticipantIds,
    addMediaLibraryItem,
    updateMediaLibraryItem,
    updateScene,
  } = useStudioStore();

  const defaultMediaFit: "contain" | "cover" = isStageCropped ? "cover" : "contain";
  const mediaTransform = tileTransforms["active-media"] || {
    fitMode: defaultMediaFit,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  };
  const secondaryMediaTransform = tileTransforms["secondary-media"] || {
    fitMode: defaultMediaFit,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  };
  const secondaryMediaFitMode = (secondaryMediaTransform.fitMode as "contain" | "cover") || defaultMediaFit;
  const mediaFitMode = (mediaTransform.fitMode as "contain" | "cover") || defaultMediaFit;
  const mediaZoom = Math.max(1, mediaTransform.zoom || 1);
  const mediaPanX = Math.max(-50, Math.min(50, mediaTransform.panX || 0));
  const mediaPanY = Math.max(-50, Math.min(50, mediaTransform.panY || 0));
  const mediaRotation = mediaTransform.rotation || 0;

  const isMediaMirrored = Boolean(
    (fairUseConfig?.enabled && fairUseConfig?.mirrorMediaVideo) || mediaTransform.flipH
  );

  // Convert pan coordinates (-50 to +50) to CSS object-position & transform-origin (0% to 100%)
  const objectPosX = Math.max(0, Math.min(100, 50 + mediaPanX));
  const objectPosY = Math.max(0, Math.min(100, 50 + mediaPanY));
  const hasActivePanOffset = Math.abs(mediaPanX) > 0.5 || Math.abs(mediaPanY) > 0.5;
  const effectiveObjectPosX = mediaFitMode === "contain" && mediaZoom <= 1 && !hasActivePanOffset ? 50 : objectPosX;
  const effectiveObjectPosY = mediaFitMode === "contain" && mediaZoom <= 1 && !hasActivePanOffset ? 50 : objectPosY;
  const effectiveTransformOriginX = isMediaMirrored ? 100 - effectiveObjectPosX : effectiveObjectPosX;

  const [isDraggingMediaPan, setIsDraggingMediaPan] = useState(false);
  const mediaPanStartRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0, rectWidth: 1, rectHeight: 1 });
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);

  // Live Media Transport State (for Video, YouTube, and Audio on stage)
  const [isMediaPaused, setIsMediaPaused] = useState(false);
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [breathState, setBreathState] = useState({ scale: 1, tx: 0, ty: 0, rot: 0 });
  const [isYtJerking, setIsYtJerking] = useState(false);
  const [ytStreamAttempt, setYtStreamAttempt] = useState<0 | 1>(0);
  const [ytAudioAttempt, setYtAudioAttempt] = useState<0 | 1>(0);
  const [useYtIframeFallback, setUseYtIframeFallback] = useState(false);
  const [mediaBoundsHistory, setMediaBoundsHistory] = useState<Array<ParticipantBounds | null>>([]);
  const [isMediaHovered, setIsMediaHovered] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isTacticalMapModalOpen, setIsTacticalMapModalOpen] = useState(false);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [pastedToastMsg, setPastedToastMsg] = useState<string | null>(null);
  const [clipSavedToast, setClipSavedToast] = useState<string | null>(null);
  const [focusedMediaSlot, setFocusedMediaSlot] = useState<"primary" | "secondary">("primary");
  const [mediaToolbarPos, setMediaToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [isMediaToolbarCollapsed, setIsMediaToolbarCollapsed] = useState(false);
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const dragToolbarStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const mediaCurrentTimeRef = useRef<number>(0);
  const mediaDurationRef = useRef<number>(0);
  const isMediaPausedRef = useRef<boolean>(false);
  const ytTelemetryActiveRef = useRef<boolean>(false);
  const ytReadyConfirmedRef = useRef<boolean>(false);

  useEffect(() => {
    mediaCurrentTimeRef.current = mediaCurrentTime;
  }, [mediaCurrentTime]);
  useEffect(() => {
    mediaDurationRef.current = mediaDuration;
  }, [mediaDuration]);
  useEffect(() => {
    isMediaPausedRef.current = isMediaPaused;
  }, [isMediaPaused]);

  // Live 2D Pan + Zoom + Micro-Tilt Breathing Animation Loop for Stage Preview
  useEffect(() => {
    if (!fairUseConfig?.enabled || !(fairUseConfig?.zoomBreathing ?? true)) {
      setBreathState({ scale: 1, tx: 0, ty: 0, rot: 0 });
      return;
    }
    const intensity = fairUseConfig?.breathIntensity || "medium";
    const maxDelta = intensity === "subtle" ? 0.06 : intensity === "strong" ? 0.18 : 0.11;
    let rafId: number;
    let lastUpdate = 0;
    const tick = (now: number) => {
      if (now - lastUpdate > 45) {
        lastUpdate = now;
        const wave = (1 + Math.sin(now / 520)) / 2;
        const scale = Number((1 + wave * maxDelta).toFixed(4));
        const tx = Number((Math.sin(now / 730) * (maxDelta * 12)).toFixed(2));
        const ty = Number((Math.cos(now / 890) * (maxDelta * 9)).toFixed(2));
        const rot = Number((Math.sin(now / 1150) * 0.32).toFixed(3));
        setBreathState({ scale, tx, ty, rot });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [fairUseConfig?.enabled, fairUseConfig?.zoomBreathing, fairUseConfig?.breathIntensity]);

  const breathScale = breathState.scale;

  // Global AudioContext Autoplay Unlock on First User Gesture
  useEffect(() => {
    const handleUnlockAudio = () => {
      stageBroadcaster.ensureAudioContext();
      stageBroadcaster.refreshAudioConnections();
    };
    window.addEventListener("pointerdown", handleUnlockAudio, { passive: true });
    window.addEventListener("keydown", handleUnlockAudio, { passive: true });
    window.addEventListener("touchstart", handleUnlockAudio, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handleUnlockAudio);
      window.removeEventListener("keydown", handleUnlockAudio);
      window.removeEventListener("touchstart", handleUnlockAudio);
    };
  }, []);

  // Global Clipboard Screenshot Paste (Ctrl+V / Cmd+V)
  const handleSaveClipboardBlobToStage = React.useCallback(
    (blob: Blob) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const screenshotItem = {
          id: `screenshot-${Date.now()}`,
          name: `Screenshot ${timeStr}`,
          type: "image" as const,
          url: dataUrl,
          thumbnail: dataUrl,
          duration: "Pasted Image",
          isUploaded: true,
        };
        addMediaLibraryItem(screenshotItem);
        if (activeSceneId) {
          updateScene(activeSceneId, { activeMedia: screenshotItem });
        }
        setActiveMedia(screenshotItem);
        setPastedToastMsg(`📸 ${screenshotItem.name} pasted to Stage & Library!`);
        setTimeout(() => setPastedToastMsg(null), 3200);
      };
      reader.readAsDataURL(blob);
    },
    [addMediaLibraryItem, activeSceneId, updateScene, setActiveMedia]
  );

  useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            handleSaveClipboardBlobToStage(blob);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onGlobalPaste);
    return () => window.removeEventListener("paste", onGlobalPaste);
  }, [handleSaveClipboardBlobToStage]);

  const handleTriggerClipboardPasteButton = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipItems = await navigator.clipboard.read();
        for (const clipItem of clipItems) {
          const imgType = clipItem.types.find((t) => t.startsWith("image/"));
          if (imgType) {
            const blob = await clipItem.getType(imgType);
            handleSaveClipboardBlobToStage(blob);
            return;
          }
        }
      }
      setPastedToastMsg("💡 Press Ctrl+V (or Cmd+V) anywhere to paste your screenshot!");
      setTimeout(() => setPastedToastMsg(null), 3200);
    } catch {
      setPastedToastMsg("💡 Press Ctrl+V (or Cmd+V) anywhere to paste your screenshot!");
      setTimeout(() => setPastedToastMsg(null), 3200);
    }
  };

  const sendYouTubeIframeCommand = React.useCallback((func: string, args: any[] = []) => {
    if (typeof document === "undefined") return;
    const iframe = document.getElementById("livestudio-active-youtube-iframe") as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    }
  }, []);

  const handleStartDragToolbar = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const stageEl = document.getElementById("livestudio-stage-container");
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    const currentX = mediaToolbarPos?.x ?? Math.max(10, Math.round(stageRect.width / 2 - 200));
    const currentY = mediaToolbarPos?.y ?? (activeMedia?.type === "website" ? 48 : 12);

    dragToolbarStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: currentX,
      startY: currentY,
    };
    setIsDraggingToolbar(true);

    const handleMouseMove = (moveEv: MouseEvent) => {
      const deltaX = moveEv.clientX - dragToolbarStartRef.current.mouseX;
      const deltaY = moveEv.clientY - dragToolbarStartRef.current.mouseY;
      const nextX = Math.max(4, Math.min(stageRect.width - 140, dragToolbarStartRef.current.startX + deltaX));
      const nextY = Math.max(4, Math.min(stageRect.height - 48, dragToolbarStartRef.current.startY + deltaY));
      setMediaToolbarPos({ x: Math.round(nextX), y: Math.round(nextY) });
    };

    const handleMouseUp = () => {
      setIsDraggingToolbar(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleChangeMediaSpeed = (rate: number) => {
    if (!activeMedia) return;
    setActiveMedia({ ...activeMedia, playbackRate: rate });
    if (fairUseConfig?.enabled) {
      setFairUseConfig({ playbackRate: rate });
    }
    const mediaEl = getActiveHtmlMediaElement();
    if (mediaEl) {
      mediaEl.playbackRate = rate;
    }
    if (activeMedia.type === "youtube" && useYtIframeFallback) {
      sendYouTubeIframeCommand("setPlaybackRate", [rate]);
    }
  };

  const handleChangeMediaPitch = (rate: number, enablePitchShift: boolean) => {
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (videoEl) {
      videoEl.playbackRate = rate;
      try {
        (videoEl as any).preservesPitch = !enablePitchShift;
        (videoEl as any).mozPreservesPitch = !enablePitchShift;
        (videoEl as any).webkitPreservesPitch = !enablePitchShift;
      } catch { }
    }
    if (audioEl) {
      audioEl.playbackRate = rate;
      try {
        (audioEl as any).preservesPitch = !enablePitchShift;
        (audioEl as any).mozPreservesPitch = !enablePitchShift;
        (audioEl as any).webkitPreservesPitch = !enablePitchShift;
      } catch { }
    }
    if (activeMedia && activeMedia.type === "youtube" && useYtIframeFallback) {
      sendYouTubeIframeCommand("setPlaybackRate", [rate]);
    }
    setFairUseConfig({
      playbackRate: rate,
      enableAudioFairUse: enablePitchShift,
    });
  };

  // Fast YouTube Scene Switch & Pre-Warm + Default Unmuted Audible Volume Enforcement
  React.useEffect(() => {
    setMediaLoadError(false);
    setYtStreamAttempt(0);
    setYtAudioAttempt(0);
    setUseYtIframeFallback(false);
    ytTelemetryActiveRef.current = false;
    ytReadyConfirmedRef.current = false;

    const initStart = activeMedia?.startTimeSec || 0;
    setMediaCurrentTime(initStart);
    mediaCurrentTimeRef.current = initStart;

    const knownDur =
      activeMedia?.endTimeSec && activeMedia.endTimeSec > 0
        ? activeMedia.endTimeSec
        : activeMedia?.durationSeconds && activeMedia.durationSeconds > 0
          ? activeMedia.durationSeconds
          : 0;
    setMediaDuration(knownDur);
    mediaDurationRef.current = knownDur;

    setIsMediaPaused(false);
    isMediaPausedRef.current = false;

    if (!activeMedia) return;

    // Ensure YouTube / Video plays UNMUTED at full audible volume by default upon scene switch!
    if (
      (activeMedia.type === "youtube" || activeMedia.type === "video" || activeMedia.type === "audio") &&
      (activeMedia.isMuted === undefined || activeMedia.volume === undefined || activeMedia.volume === 0)
    ) {
      setMediaMuted(false);
      if (!activeMedia.volume || activeMedia.volume <= 0) {
        setMediaVolume(100);
      }
    }

    // Fetch YouTube duration metadata + pre-warm stream cache in parallel
    const resolvedYtId =
      activeMedia.type === "youtube"
        ? activeMedia.youtubeId || (activeMedia.url ? extractYouTubeVideoId(activeMedia.url) : "")
        : null;

    if (activeMedia.type === "youtube" && resolvedYtId) {
      let cancelled = false;
      fetch(`/api/media/youtube/info?url=${encodeURIComponent(resolvedYtId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json?.success || !json?.data) return;
          const durSec = Number(json.data.durationSeconds || 0);
          if (durSec > 0 && Number.isFinite(durSec)) {
            setMediaDuration((prev) => (prev > 0 && Number.isFinite(prev) ? prev : durSec));
            mediaDurationRef.current = durSec;
            if (!activeMedia.durationSeconds) {
              updateMediaLibraryItem(activeMedia.id, { durationSeconds: durSec });
            }
          }
        })
        .catch(() => { });

      // Resilient watchdog: only switch to iframe fallback if direct MP4 stream fails to decode/buffer or has no video frames
      const streamWatchdog = setTimeout(() => {
        if (cancelled || ytReadyConfirmedRef.current) return;
        const v = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
        if (v && v.videoWidth > 0 && (v.readyState >= 2 || v.currentTime > 0 || !v.paused)) {
          ytReadyConfirmedRef.current = true;
          return;
        }
        setUseYtIframeFallback(true);
      }, 2500);

      return () => {
        cancelled = true;
        clearTimeout(streamWatchdog);
      };
    }
  }, [activeMedia?.id, activeMedia?.url, activeMedia?.youtubeId]);

  // Listen to YouTube IFrame PostMessage telemetry + continuous handshake + caption killer + wall-clock timer
  useEffect(() => {
    if (activeMedia?.type !== "youtube" || !useYtIframeFallback) return;

    const syncYouTubePlayerState = () => {
      const iframe = document.getElementById("livestudio-active-youtube-iframe") as HTMLIFrameElement | null;
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        "*"
      );
      sendYouTubeIframeCommand("unloadModule", ["captions"]);
      sendYouTubeIframeCommand("unloadModule", ["cc"]);
      sendYouTubeIframeCommand("setOption", ["captions", "track", {}]);
      sendYouTubeIframeCommand("setOption", ["cc", "track", {}]);
    };

    const handleYtMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;

        if (data?.event === "onReady") {
          syncYouTubePlayerState();
          sendYouTubeIframeCommand("playVideo", []);
          if (!activeMedia?.isMuted && normalizedMediaVolumePct > 0) {
            sendYouTubeIframeCommand("unMute", []);
            sendYouTubeIframeCommand("setVolume", [Math.min(100, normalizedMediaVolumePct)]);
          } else {
            sendYouTubeIframeCommand("mute", []);
          }
          if (audioEl && !activeMedia?.isMuted && normalizedMediaVolumePct > 0) {
            audioEl.muted = false;
            audioEl.play().catch(() => { });
          }
        }
        if (data?.event === "infoDelivery" && data?.info) {
          ytTelemetryActiveRef.current = true;
          if (typeof data.info.currentTime === "number" && data.info.currentTime >= 0) {
            const ct = data.info.currentTime;
            mediaCurrentTimeRef.current = ct;
            setMediaCurrentTime(ct);
            if (audioEl && Math.abs(audioEl.currentTime - ct) > 0.45) {
              try { audioEl.currentTime = ct; } catch { }
            }
            const endSec = activeMedia?.endTimeSec;
            if (endSec && endSec > 0 && ct >= endSec) {
              if (activeMedia.loop !== false) {
                const startTarget = activeMedia.startTimeSec || 0;
                mediaCurrentTimeRef.current = startTarget;
                setMediaCurrentTime(startTarget);
                sendYouTubeIframeCommand("seekTo", [startTarget, true]);
                sendYouTubeIframeCommand("playVideo", []);
                if (audioEl) {
                  try { audioEl.currentTime = startTarget; } catch { }
                  audioEl.play().catch(() => { });
                }
              } else {
                sendYouTubeIframeCommand("pauseVideo", []);
                audioEl?.pause();
                setIsMediaPaused(true);
                isMediaPausedRef.current = true;
                useStudioStore.getState().triggerMediaEnded();
              }
            }
          }
          if (
            typeof data.info.duration === "number" &&
            Number.isFinite(data.info.duration) &&
            data.info.duration > 0
          ) {
            mediaDurationRef.current = data.info.duration;
            setMediaDuration(data.info.duration);
          }
          if (typeof data.info.playerState === "number") {
            if (data.info.playerState === 1) {
              setIsMediaPaused(false);
              isMediaPausedRef.current = false;
              sendYouTubeIframeCommand("unloadModule", ["captions"]);
              sendYouTubeIframeCommand("unloadModule", ["cc"]);
              const isAudioElActive = Boolean(
                audioEl && !audioEl.paused && audioEl.readyState >= 2 && !audioEl.error
              );
              if (activeMedia?.isMuted || normalizedMediaVolumePct === 0) {
                sendYouTubeIframeCommand("mute", []);
              } else if (isAudioElActive) {
                sendYouTubeIframeCommand("mute", []);
              } else {
                sendYouTubeIframeCommand("unMute", []);
                sendYouTubeIframeCommand("setVolume", [Math.min(100, normalizedMediaVolumePct)]);
              }
              if (audioEl && audioEl.paused && !activeMedia?.isMuted) {
                audioEl.play().catch(() => { });
              }
            }
            if (data.info.playerState === 2) {
              setIsMediaPaused(true);
              isMediaPausedRef.current = true;
              if (audioEl && !audioEl.paused) {
                audioEl.pause();
              }
            }
            if (data.info.playerState === 0) {
              if (activeMedia.loop !== false) {
                const startTarget = activeMedia.startTimeSec || 0;
                mediaCurrentTimeRef.current = startTarget;
                setMediaCurrentTime(startTarget);
                sendYouTubeIframeCommand("seekTo", [startTarget, true]);
                sendYouTubeIframeCommand("playVideo", []);
                if (audioEl) {
                  try { audioEl.currentTime = startTarget; } catch { }
                  audioEl.play().catch(() => { });
                }
              } else {
                audioEl?.pause();
                useStudioStore.getState().triggerMediaEnded();
              }
            }
          }
        }
      } catch { }
    };

    window.addEventListener("message", handleYtMessage);

    const handshakeIv = setInterval(() => {
      syncYouTubePlayerState();
      if (!ytTelemetryActiveRef.current && !isMediaPausedRef.current) {
        const rate = activeMedia?.playbackRate || (fairUseConfig?.enabled ? (fairUseConfig?.playbackRate || 1.04) : 1.0);
        const nextT = mediaCurrentTimeRef.current + 0.5 * rate;
        mediaCurrentTimeRef.current = nextT;
        setMediaCurrentTime(nextT);
        const endSec = activeMedia?.endTimeSec;
        if (endSec && endSec > 0 && nextT >= endSec) {
          if (activeMedia.loop !== false) {
            const startTarget = activeMedia.startTimeSec || 0;
            mediaCurrentTimeRef.current = startTarget;
            setMediaCurrentTime(startTarget);
            sendYouTubeIframeCommand("seekTo", [startTarget, true]);
          } else {
            sendYouTubeIframeCommand("pauseVideo", []);
            setIsMediaPaused(true);
            isMediaPausedRef.current = true;
          }
        }
      }
    }, 500);

    return () => {
      window.removeEventListener("message", handleYtMessage);
      clearInterval(handshakeIv);
    };
  }, [
    activeMedia?.id,
    activeMedia?.type,
    activeMedia?.startTimeSec,
    activeMedia?.endTimeSec,
    activeMedia?.loop,
    activeMedia?.playbackRate,
    activeMedia?.isMuted,
    fairUseConfig?.enabled,
    fairUseConfig?.playbackRate,
    useYtIframeFallback,
    sendYouTubeIframeCommand,
  ]);

  // Normalized volume percentage (0 to 200%, default 100%)
  const normalizedMediaVolumePct = React.useMemo(() => {
    const raw = activeMedia?.volume;
    if (typeof raw !== "number" || Number.isNaN(raw)) return 100;
    if (raw > 0 && raw <= 1 && !Number.isInteger(raw)) return Math.round(raw * 100);
    return Math.max(0, Math.min(200, Math.round(raw)));
  }, [activeMedia?.volume]);

  // Sanitizes non-finite durations so "Infinity:NaN" NEVER appears in the transport bar!
  const formatMediaTime = (sec: number) => {
    if (
      typeof sec !== "number" ||
      !Number.isFinite(sec) ||
      Number.isNaN(sec) ||
      sec <= 0 ||
      sec > 86400 * 3
    ) {
      return "0:00";
    }
    const hrs = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (hrs > 0) {
      return `${hrs}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formattedTotalDuration = React.useMemo(() => {
    const candidate =
      Number.isFinite(mediaDuration) && mediaDuration > 0 && mediaDuration < 86400 * 3
        ? mediaDuration
        : activeMedia?.endTimeSec && activeMedia.endTimeSec > 0
          ? activeMedia.endTimeSec
          : activeMedia?.durationSeconds && activeMedia.durationSeconds > 0
            ? activeMedia.durationSeconds
            : 0;
    if (candidate > 0) return formatMediaTime(candidate);
    if (
      activeMedia?.duration &&
      !activeMedia.duration.includes("NaN") &&
      !activeMedia.duration.includes("Infinity") &&
      activeMedia.duration !== "Full Video"
    ) {
      return activeMedia.duration;
    }
    return "LIVE";
  }, [mediaDuration, activeMedia?.endTimeSec, activeMedia?.durationSeconds, activeMedia?.duration]);

  const getActiveHtmlMediaElement = (): HTMLMediaElement | null => {
    if (typeof document === "undefined") return null;
    return (
      (document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null) ||
      (document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null)
    );
  };

  const handleToggleMediaPlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    stageBroadcaster.ensureAudioContext();
    stageBroadcaster.refreshAudioConnections();
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (activeMedia?.type === "youtube" && useYtIframeFallback) {
      if (isMediaPaused) {
        sendYouTubeIframeCommand("playVideo", []);
        audioEl?.play().catch(() => { });
        setIsMediaPaused(false);
      } else {
        sendYouTubeIframeCommand("pauseVideo", []);
        audioEl?.pause();
        setIsMediaPaused(true);
      }
      return;
    }
    const el = getActiveHtmlMediaElement();
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => { });
      setIsMediaPaused(false);
    } else {
      el.pause();
      setIsMediaPaused(true);
    }
  };

  const handleSeekMedia = (targetSeconds: number) => {
    const minSec = activeMedia?.startTimeSec || 0;
    const finiteDur = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : activeMedia?.durationSeconds || 0;
    const maxDur =
      activeMedia?.endTimeSec && activeMedia.endTimeSec > 0
        ? activeMedia.endTimeSec
        : finiteDur;
    const clamped = Math.max(minSec, maxDur > 0 ? Math.min(maxDur, targetSeconds) : targetSeconds);

    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (audioEl) {
      try { audioEl.currentTime = clamped; } catch { }
    }

    if (activeMedia?.type === "youtube" && useYtIframeFallback) {
      mediaCurrentTimeRef.current = clamped;
      sendYouTubeIframeCommand("seekTo", [clamped, true]);
      setMediaCurrentTime(clamped);
      return;
    }
    const el = getActiveHtmlMediaElement();
    if (!el) return;
    try {
      el.currentTime = clamped;
    } catch { }
    setMediaCurrentTime(clamped);
  };

  const handleSkipMediaSeconds = (deltaSec: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeMedia?.type === "youtube" && useYtIframeFallback) {
      handleSeekMedia((mediaCurrentTimeRef.current || mediaCurrentTime || 0) + deltaSec);
      return;
    }
    const el = getActiveHtmlMediaElement();
    if (!el) return;
    handleSeekMedia((el.currentTime || 0) + deltaSec);
  };

  // Instant 30s Clip Extractor directly from Live Stage Video / YouTube Transport Bar
  const handleQuickClipFromTransport = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!activeMedia) return;
    const curSec = Math.max(0, Math.floor(mediaCurrentTimeRef.current || mediaCurrentTime || 0));
    const clipStart = Math.max(0, curSec - 15);
    const finiteDur = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : activeMedia?.durationSeconds || 0;
    const clipEnd = finiteDur > 0 ? Math.min(Math.floor(finiteDur), clipStart + 30) : clipStart + 30;
    const clipItem = {
      ...activeMedia,
      id: `clip-${Date.now()}`,
      name: `✂️ Clip (${formatMediaTime(clipStart)}–${formatMediaTime(clipEnd)}) • ${activeMedia.name}`,
      startTimeSec: clipStart,
      endTimeSec: clipEnd,
      duration: `${formatMediaTime(clipStart)} → ${formatMediaTime(clipEnd)}`,
      isMuted: false,
      volume: 100,
    };
    addMediaLibraryItem(clipItem);
    setClipSavedToast(`✂️ Saved 30s Clip (${formatMediaTime(clipStart)}–${formatMediaTime(clipEnd)}) to Media Library!`);
    setTimeout(() => setClipSavedToast(null), 3200);
  };

  const pushMediaBoundsUndoState = React.useCallback(() => {
    const currentCustom = useStudioStore.getState().participantBounds["active-media"] || null;
    setMediaBoundsHistory((prev) => [...prev.slice(-14), currentCustom ? { ...currentCustom } : null]);
  }, []);

  const handleApplyMediaSizePreset = React.useCallback(
    (nextBounds: ParticipantBounds) => {
      pushMediaBoundsUndoState();
      setParticipantBounds("active-media", nextBounds);
    },
    [pushMediaBoundsUndoState, setParticipantBounds]
  );

  const handleUndoMediaBounds = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMediaBoundsHistory((prev) => {
        if (prev.length === 0) {
          resetParticipantBounds("active-media");
          return prev;
        }
        const copy = [...prev];
        const lastState = copy.pop() ?? null;
        if (lastState) {
          setParticipantBounds("active-media", lastState);
        } else {
          resetParticipantBounds("active-media");
        }
        return copy;
      });
    },
    [resetParticipantBounds, setParticipantBounds]
  );

  const handleResetMediaBoundsToSlot = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      pushMediaBoundsUndoState();
      resetParticipantBounds("active-media");
    },
    [pushMediaBoundsUndoState, resetParticipantBounds]
  );

  const handleToggleMediaCrop = () => {
    if (mediaFitMode === "contain") {
      setTileTransform("active-media", { fitMode: "cover", panX: 0, panY: 0 });
      const customB = participantBounds["active-media"];
      if (customB && customB.height > 45 && (customB.y > 0 || customB.height < 100)) {
        setParticipantBounds("active-media", {
          ...customB,
          y: 0,
          height: 100,
        });
      }
    } else {
      setTileTransform("active-media", { fitMode: "contain", panX: 0, panY: 0, zoom: 1 });
    }
  };

  const handleMediaZoomIn = () => {
    const nextZoom = Math.min(3.0, Number((mediaZoom + 0.25).toFixed(2)));
    setTileTransform("active-media", { zoom: nextZoom });
  };

  const handleMediaZoomOut = () => {
    const nextZoom = Math.max(1.0, Number((mediaZoom - 0.25).toFixed(2)));
    setTileTransform("active-media", {
      zoom: nextZoom,
      panX: nextZoom === 1.0 && mediaFitMode === "contain" ? 0 : mediaPanX,
      panY: nextZoom === 1.0 && mediaFitMode === "contain" ? 0 : mediaPanY,
    });
  };

  // Left / Center / Right / Top / Bottom Pan Presets — Always active for YouTube & Video!
  const handleMediaCropPreset = (preset: "top" | "center" | "bottom" | "left" | "right") => {
    const targetFit = mediaZoom > 1 ? mediaFitMode : "cover";
    if (preset === "top") {
      setTileTransform("active-media", { fitMode: targetFit, panY: -50 });
    } else if (preset === "bottom") {
      setTileTransform("active-media", { fitMode: targetFit, panY: 50 });
    } else if (preset === "left") {
      setTileTransform("active-media", { fitMode: targetFit, panX: -50 });
    } else if (preset === "right") {
      setTileTransform("active-media", { fitMode: targetFit, panX: 50 });
    } else if (preset === "center") {
      setTileTransform("active-media", { fitMode: targetFit, panY: 0, panX: 0 });
    }
  };

  const handleResetMediaTransform = () => {
    setTileTransform("active-media", {
      fitMode: "contain",
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
    });
  };

  const handleMediaPanMouseDown = (e: React.MouseEvent) => {
    if (mediaFitMode !== "cover" && mediaZoom <= 1 && !hasActivePanOffset) return;
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("input") ||
      (e.target as HTMLElement).closest("select")
    )
      return;
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDraggingMediaPan(true);
    mediaPanStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: mediaPanX,
      initialPanY: mediaPanY,
      rectWidth: Math.max(10, rect.width),
      rectHeight: Math.max(10, rect.height),
    };
  };

  const handleMediaPanMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDraggingMediaPan) return;
      const { startX, startY, initialPanX, initialPanY, rectWidth, rectHeight } = mediaPanStartRef.current;
      const deltaPixelX = e.clientX - startX;
      const deltaPixelY = e.clientY - startY;

      const sensitivity = mediaZoom > 1 ? 100 / Math.max(1, mediaZoom * 0.75) : 100;
      const deltaXPercent = (deltaPixelX / (rectWidth || 400)) * sensitivity * -1;
      const deltaYPercent = (deltaPixelY / (rectHeight || 300)) * sensitivity * -1;

      setTileTransform("active-media", {
        panX: Math.max(-50, Math.min(50, Number((initialPanX + deltaXPercent).toFixed(1)))),
        panY: Math.max(-50, Math.min(50, Number((initialPanY + deltaYPercent).toFixed(1)))),
      });
    },
    [isDraggingMediaPan, mediaZoom, setTileTransform]
  );

  const handleMediaPanMouseUp = React.useCallback(() => {
    setIsDraggingMediaPan(false);
  }, []);

  React.useEffect(() => {
    if (isDraggingMediaPan) {
      window.addEventListener("mousemove", handleMediaPanMouseMove);
      window.addEventListener("mouseup", handleMediaPanMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMediaPanMouseMove);
        window.removeEventListener("mouseup", handleMediaPanMouseUp);
      };
    }
  }, [isDraggingMediaPan, handleMediaPanMouseMove, handleMediaPanMouseUp]);

  const handleMediaPanTouchStart = (e: React.TouchEvent) => {
    if (mediaFitMode !== "cover" && mediaZoom <= 1 && !hasActivePanOffset) return;
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDraggingMediaPan(true);
    mediaPanStartRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      initialPanX: mediaPanX,
      initialPanY: mediaPanY,
      rectWidth: Math.max(10, rect.width),
      rectHeight: Math.max(10, rect.height),
    };
  };

  const handleMediaPanTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingMediaPan || e.touches.length !== 1) return;
    const { startX, startY, initialPanX, initialPanY, rectWidth, rectHeight } = mediaPanStartRef.current;
    const deltaPixelX = e.touches[0].clientX - startX;
    const deltaPixelY = e.touches[0].clientY - startY;

    const sensitivity = mediaZoom > 1 ? 100 / Math.max(1, mediaZoom * 0.75) : 100;
    const deltaXPercent = (deltaPixelX / (rectWidth || 400)) * sensitivity * -1;
    const deltaYPercent = (deltaPixelY / (rectHeight || 300)) * sensitivity * -1;

    setTileTransform("active-media", {
      panX: Math.max(-50, Math.min(50, Number((initialPanX + deltaXPercent).toFixed(1)))),
      panY: Math.max(-50, Math.min(50, Number((initialPanY + deltaYPercent).toFixed(1)))),
    });
  };

  const handleMediaPanTouchEnd = () => {
    setIsDraggingMediaPan(false);
  };

  const handleMediaWheel = (e: React.WheelEvent) => {
    if (mediaFitMode !== "cover" && mediaZoom <= 1 && !hasActivePanOffset) return;
    e.stopPropagation();
    if (e.shiftKey) {
      const stepX = e.deltaY > 0 ? 5 : -5;
      const nextPanX = Math.max(-50, Math.min(50, Number((mediaPanX + stepX).toFixed(1))));
      setTileTransform("active-media", { panX: nextPanX });
    } else {
      const stepY = e.deltaY > 0 ? 5 : -5;
      const nextPanY = Math.max(-50, Math.min(50, Number((mediaPanY + stepY).toFixed(1))));
      setTileTransform("active-media", { panY: nextPanY });
    }
  };

  // Sync active media video, YouTube IFrame & audio elements with store isMuted, volume, and Auto-Ducking
  React.useEffect(() => {
    const isAnySpeakerSpeaking = participants.some(
      (p) => (p.status === "ON_STAGE" || p.isLocal) && p.micOn !== false && p.isSpeaking
    );
    const shouldDuck = Boolean(
      fairUseConfig?.enabled && fairUseConfig?.autoAudioDucking && isAnySpeakerSpeaking
    );
    const effectiveVolPct = shouldDuck
      ? Math.min(normalizedMediaVolumePct, fairUseConfig?.duckingVolumePct ?? 25)
      : normalizedMediaVolumePct;

    const htmlVol = Math.max(0, Math.min(1, effectiveVolPct / 100));
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (videoEl && activeMedia) {
      videoEl.muted = Boolean(activeMedia.isMuted || effectiveVolPct === 0);
      try {
        videoEl.volume = htmlVol;
      } catch { }
    }
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (audioEl && activeMedia) {
      audioEl.muted = Boolean(activeMedia.isMuted || effectiveVolPct === 0);
      try {
        audioEl.volume = htmlVol;
      } catch { }
    }
    if (activeMedia?.type === "youtube" && useYtIframeFallback) {
      const isAudioElActive = Boolean(
        audioEl && !audioEl.paused && audioEl.readyState >= 2 && !audioEl.error
      );
      if (activeMedia.isMuted || effectiveVolPct === 0) {
        sendYouTubeIframeCommand("mute", []);
      } else if (isAudioElActive) {
        sendYouTubeIframeCommand("mute", []);
      } else {
        sendYouTubeIframeCommand("unMute", []);
        sendYouTubeIframeCommand("setVolume", [Math.min(100, effectiveVolPct)]);
      }
    }
  }, [
    activeMedia?.isMuted,
    normalizedMediaVolumePct,
    activeMedia?.id,
    activeMedia?.type,
    useYtIframeFallback,
    participants,
    fairUseConfig?.enabled,
    fairUseConfig?.autoAudioDucking,
    fairUseConfig?.duckingVolumePct,
    sendYouTubeIframeCommand,
  ]);

  // Real-time Web Audio DSP filter routing for Studio Preview & Broadcast/Recording
  useEffect(() => {
    stageBroadcaster.ensureAudioContext();
    stageBroadcaster.refreshAudioConnections();
  }, [
    activeMedia?.id,
    activeMedia?.isMuted,
    fairUseConfig?.enabled,
    fairUseConfig?.audioEqProtection,
    fairUseConfig?.dynamicTempoVariance,
    fairUseConfig?.autoAudioDucking,
    fairUseConfig?.duckingVolumePct,
    participants,
  ]);

  // Enforce Playback Speed, Pitch Shift & 8-12s Random Jerk/Pause on Video, YouTube, and Audio during Studio Preview
  useEffect(() => {
    if (
      !activeMedia ||
      (activeMedia.type !== "video" && activeMedia.type !== "youtube" && activeMedia.type !== "audio")
    )
      return;

    const isTempoOn = Boolean(fairUseConfig?.enabled && (fairUseConfig.dynamicTempoVariance ?? true));
    const isAudioEqOn = Boolean(fairUseConfig?.enabled && (fairUseConfig.audioEqProtection ?? true));
    const shouldShiftPitch = isTempoOn || isAudioEqOn || Boolean(fairUseConfig?.enableAudioFairUse);

    const baseRate = activeMedia.playbackRate || (isTempoOn ? (fairUseConfig?.playbackRate || 1.06) : 1.0);

    const mediaEl = getActiveHtmlMediaElement();
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;

    if (mediaEl) {
      mediaEl.playbackRate = baseRate;
      try {
        (mediaEl as any).preservesPitch = !shouldShiftPitch;
        (mediaEl as any).mozPreservesPitch = !shouldShiftPitch;
        (mediaEl as any).webkitPreservesPitch = !shouldShiftPitch;
      } catch { }
    }
    if (audioEl) {
      audioEl.playbackRate = baseRate;
      try {
        (audioEl as any).preservesPitch = !shouldShiftPitch;
        (audioEl as any).mozPreservesPitch = !shouldShiftPitch;
        (audioEl as any).webkitPreservesPitch = !shouldShiftPitch;
      } catch { }
    }
    if (activeMedia.type === "youtube" && useYtIframeFallback) {
      sendYouTubeIframeCommand("setPlaybackRate", [baseRate]);
    }

    if (!fairUseConfig?.enabled) return;

    // Distinct Dynamic Tempo LFO wave when Tempo+EQ is active (audible dynamic speed & natural pitch motion)
    let lfoInterval: NodeJS.Timeout | null = null;
    if (isTempoOn) {
      lfoInterval = setInterval(() => {
        const el = getActiveHtmlMediaElement();
        const aud = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
        const nowT = performance.now();
        const jitter = Math.sin(nowT / 1400) * 0.025 + Math.cos(nowT / 2700) * 0.015;
        const centerRate = activeMedia.playbackRate || fairUseConfig?.playbackRate || 1.06;
        const currentRate = Number(Math.max(0.5, Math.min(2.0, centerRate + jitter)).toFixed(3));

        if (el && !el.paused) {
          el.playbackRate = currentRate;
          try {
            (el as any).preservesPitch = false;
            (el as any).mozPreservesPitch = false;
            (el as any).webkitPreservesPitch = false;
          } catch { }
        }
        if (aud && !aud.paused) {
          aud.playbackRate = currentRate;
          try {
            (aud as any).preservesPitch = false;
            (aud as any).mozPreservesPitch = false;
            (aud as any).webkitPreservesPitch = false;
          } catch { }
        }
        if (activeMedia.type === "youtube" && useYtIframeFallback) {
          sendYouTubeIframeCommand("setPlaybackRate", [currentRate]);
        }
      }, 600);
    }

    if (
      !fairUseConfig.autoPauseIntervalSec ||
      fairUseConfig.autoPauseIntervalSec <= 0 ||
      (activeMedia.type !== "video" && activeMedia.type !== "youtube")
    ) {
      return () => {
        if (lfoInterval) clearInterval(lfoInterval);
      };
    }

    let timer: NodeJS.Timeout;
    const runCycle = () => {
      const delayMs =
        fairUseConfig.autoPauseIntervalSec === 8
          ? Math.floor(8000 + Math.random() * 4000)
          : fairUseConfig.autoPauseIntervalSec * 1000;

      timer = setTimeout(() => {
        const mode = fairUseConfig.antiMatchMode || "jerk-skip";
        const pauseMs = mode === "jerk-skip" ? 180 : mode === "micro-pause" ? 340 : 1500;

        if (activeMedia.type === "youtube" && useYtIframeFallback) {
          if (!isMediaPausedRef.current) {
            if (mode === "jerk-skip") {
              setIsYtJerking(true);
              setTimeout(() => setIsYtJerking(false), 240);
            }
            sendYouTubeIframeCommand("pauseVideo", []);
            setTimeout(() => {
              if (mode === "jerk-skip" && ytTelemetryActiveRef.current && mediaCurrentTimeRef.current > 2) {
                const nextSec = mediaCurrentTimeRef.current + 0.25;
                mediaCurrentTimeRef.current = nextSec;
                sendYouTubeIframeCommand("seekTo", [nextSec, true]);
              }
              sendYouTubeIframeCommand("playVideo", []);
              sendYouTubeIframeCommand("unloadModule", ["captions"]);
              sendYouTubeIframeCommand("unloadModule", ["cc"]);
            }, pauseMs);
          }
        } else {
          const v = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
          if (v && !v.paused) {
            if (mode === "jerk-skip") {
              setIsYtJerking(true);
              setTimeout(() => setIsYtJerking(false), 220);
            }
            v.pause();
            setTimeout(() => {
              if (
                mode === "jerk-skip" &&
                v.currentTime > 0.5 &&
                (!Number.isFinite(v.duration) || v.currentTime + 0.4 < v.duration)
              ) {
                try {
                  v.currentTime += 0.22 + Math.random() * 0.1;
                } catch { }
              }
              v.play().catch(() => { });
            }, pauseMs);
          }
        }
        runCycle();
      }, delayMs);
    };
    runCycle();
    return () => {
      clearTimeout(timer);
      if (lfoInterval) clearInterval(lfoInterval);
    };
  }, [
    activeMedia?.id,
    activeMedia?.type,
    activeMedia?.playbackRate,
    fairUseConfig?.enabled,
    fairUseConfig?.autoPauseIntervalSec,
    fairUseConfig?.antiMatchMode,
    fairUseConfig?.playbackRate,
    fairUseConfig?.enableAudioFairUse,
    fairUseConfig?.audioEqProtection,
    fairUseConfig?.dynamicTempoVariance,
    useYtIframeFallback,
    sendYouTubeIframeCommand,
  ]);

  const params = useParams();
  const [copiedSlotIndex, setCopiedSlotIndex] = useState<number | null>(null);

  const handleCopyInviteForSlot = (slotIdx: number) => {
    try {
      const broadcastId = (params?.id as string) || "preview";
      const roomName = `studio-${broadcastId}`;
      const inviteUrl = `${window.location.origin}/join/${roomName}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedSlotIndex(slotIdx);
      setTimeout(() => setCopiedSlotIndex(null), 2500);
    } catch { }
  };

  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");
  const orderedParticipants = React.useMemo(() => {
    if (activeLayout === "custom" && customLayoutConfig?.heroParticipantId) {
      const heroId = String(customLayoutConfig.heroParticipantId);
      return [...onStageParticipants].sort((a, b) => {
        if (String(a.id) === heroId) return -1;
        if (String(b.id) === heroId) return 1;
        return 0;
      });
    }
    return onStageParticipants;
  }, [onStageParticipants, activeLayout, customLayoutConfig?.heroParticipantId]);

  const hasAnyCustomBounds = Object.keys(participantBounds).length > 0;
  const expectedSlots = getLayoutExpectedSlots(activeLayout, customLayoutConfig);

  const activeScene = scenes.find((s) => s.id === activeSceneId);
  const remoteGuestsOnStageCount = onStageParticipants.filter(
    (p) => !p.isLocal && !p.isScreen && p.role !== "host"
  ).length;

  const expectedGuestSlots = activeScene?.expectedGuestSlots ?? 0;
  const remainingExpectedGuestSlots = Math.max(0, expectedGuestSlots - remoteGuestsOnStageCount);

  const hasVisualMedia = Boolean(
    activeMedia &&
    (activeMedia.type === "video" ||
      activeMedia.type === "youtube" ||
      activeMedia.type === "map" ||
      activeMedia.type === "website" ||
      activeMedia.type === "image" ||
      activeMedia.type === "pdf")
  );

  // Helper to swap Media and Host/Participant between Left and Right sides with 1 click!
  const handleSwapMediaAndHostPosition = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const totalSlots = Math.max(2, totalPlannedSlots + 1);
    if (
      activeLayout === "cropped" ||
      activeLayout === "podcast" ||
      activeLayout === "side-by-side" ||
      activeLayout === "fit" ||
      activeLayout === "interview" ||
      activeLayout === "stacked" ||
      activeLayout === "presentation" ||
      activeLayout === "speaker-large" ||
      activeLayout === "screen-speaker"
    ) {
      setMediaSlotIndex(mediaSlotIndex >= 1 ? 0 : 1);
    } else {
      setMediaSlotIndex((mediaSlotIndex + 1) % totalSlots);
    }
  };

  const isFullBleedLayout =
    isStageCropped ||
    activeLayout === "cropped" ||
    activeLayout === "podcast" ||
    activeLayout === "interview" ||
    activeLayout === "cinema" ||
    activeLayout === "screen-full" ||
    activeLayout === "solo" ||
    (activeLayout === "custom" &&
      (customLayoutConfig?.mode === "solo" ||
        customLayoutConfig?.mode === "cinema" ||
        customLayoutConfig?.mode === "cropped" ||
        customLayoutConfig?.mode === "podcast"));

  const [isMediaDragOverStage, setIsMediaDragOverStage] = useState(false);

  const isSoloOrCinema =
    activeLayout === "solo" ||
    activeLayout === "cinema" ||
    (activeLayout === "custom" &&
      (customLayoutConfig?.mode === "solo" || customLayoutConfig?.mode === "cinema"));

  const allowGhostSlots = !isSoloOrCinema;

  const effectiveExpectedSlots = hasVisualMedia
    ? Math.max(1, expectedSlots - 1)
    : expectedSlots;

  const effectiveRemainingGuestSlots = Math.min(
    remainingExpectedGuestSlots,
    Math.max(0, effectiveExpectedSlots - orderedParticipants.length)
  );

  const totalGhostSlots = allowGhostSlots
    ? effectiveRemainingGuestSlots > 0
      ? effectiveRemainingGuestSlots
      : orderedParticipants.length >= 1 && orderedParticipants.length < effectiveExpectedSlots
        ? effectiveExpectedSlots - orderedParticipants.length
        : 0
    : 0;

  const totalPlannedSlots = totalGhostSlots > 0
    ? Math.max(effectiveExpectedSlots, orderedParticipants.length + totalGhostSlots)
    : orderedParticipants.length;

  const logoPositionClasses = {
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6",
    "bottom-left": "bottom-14 left-6",
    "bottom-right": "bottom-14 right-6",
  };

  const outerStageWrapperRef = useRef<HTMLDivElement>(null);
  const [stageBox, setStageBox] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = outerStageWrapperRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const targetRatio = 16 / 9;
        let w = rect.width;
        let h = w / targetRatio;
        if (h > rect.height) {
          h = rect.height;
          w = h * targetRatio;
        }
        setStageBox({ width: Math.floor(w), height: Math.floor(h) });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    window.addEventListener("resize", updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const stageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingOverlayRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const isDraggingSplitRef = useRef(false);

  const [activeDragState, setActiveDragState] = useState<{
    type: "move" | "resize";
    handle?: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";
    participantId: string | number;
  } | null>(null);

  const dragSessionRef = useRef<{
    type: "move" | "resize";
    handle?: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";
    participantId: string | number;
    startClientX: number;
    startClientY: number;
    startBounds: ParticipantBounds;
    isLockedRatio: boolean;
    hasMoved: boolean;
  } | null>(null);

  const handleSplitDividerMouseDown = (e: React.MouseEvent, orientation: "vertical" | "horizontal" = "vertical") => {
    e.preventDefault();
    e.stopPropagation();
    if (!stageContainerRef.current) return;
    isDraggingSplitRef.current = true;
    setIsDraggingSplit(true);

    let rafId: number | null = null;
    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingSplitRef.current || !stageContainerRef.current) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!stageContainerRef.current) return;
        const rect = stageContainerRef.current.getBoundingClientRect();
        if (orientation === "vertical") {
          const relativeX = moveEvt.clientX - rect.left;
          const percentage = Math.round((relativeX / rect.width) * 100);
          const isThreeCol = activeLayout === "three-equal" || (activeLayout === "custom" && customLayoutConfig?.mode === "three-equal");
          const maxPct = isThreeCol ? 58 : 80;
          const clamped = Math.max(20, Math.min(maxPct, percentage));
          setLayoutSplitRatio(clamped);
        } else {
          const relativeY = moveEvt.clientY - rect.top;
          const percentage = Math.round((relativeY / rect.height) * 100);
          const clamped = Math.max(20, Math.min(80, percentage));
          setLayoutSplitRatio(clamped);
        }
      });
    };

    const handleMouseUp = () => {
      isDraggingSplitRef.current = false;
      setIsDraggingSplit(false);
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSplitDividerTouchStart = (e: React.TouchEvent, orientation: "vertical" | "horizontal" = "vertical") => {
    e.stopPropagation();
    if (!stageContainerRef.current || e.touches.length === 0) return;
    isDraggingSplitRef.current = true;
    setIsDraggingSplit(true);

    let rafId: number | null = null;
    const handleTouchMove = (touchEvt: TouchEvent) => {
      if (!isDraggingSplitRef.current || !stageContainerRef.current || touchEvt.touches.length === 0) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!stageContainerRef.current) return;
        const rect = stageContainerRef.current.getBoundingClientRect();
        if (orientation === "vertical") {
          const relativeX = touchEvt.touches[0].clientX - rect.left;
          const percentage = Math.round((relativeX / rect.width) * 100);
          const isThreeCol = activeLayout === "three-equal" || (activeLayout === "custom" && customLayoutConfig?.mode === "three-equal");
          const maxPct = isThreeCol ? 58 : 80;
          const clamped = Math.max(20, Math.min(maxPct, percentage));
          setLayoutSplitRatio(clamped);
        } else {
          const relativeY = touchEvt.touches[0].clientY - rect.top;
          const percentage = Math.round((relativeY / rect.height) * 100);
          const clamped = Math.max(20, Math.min(80, percentage));
          setLayoutSplitRatio(clamped);
        }
      });
    };

    const handleTouchEnd = () => {
      isDraggingSplitRef.current = false;
      setIsDraggingSplit(false);
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleTileMouseDown = (e: React.MouseEvent, p: Participant, currentBounds: ParticipantBounds) => {
    if (e.button !== 0 || isDrawingMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".no-drag")) return;

    e.preventDefault();
    e.stopPropagation();

    setSelectedParticipantId(p.id);

    const isPipMode = activeLayout === "pip" || customLayoutConfig.mode === "pip";
    const hasCustomBounds = Boolean(participantBounds[String(p.id)]);
    if ((!isPipMode && !hasCustomBounds) || !stageContainerRef.current) return;

    if (String(p.id) === "active-media") {
      pushMediaBoundsUndoState();
    }
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const isLocked = currentBounds.isLockedRatio !== false;

    dragSessionRef.current = {
      type: "move",
      participantId: p.id,
      startClientX,
      startClientY,
      startBounds: { ...currentBounds },
      isLockedRatio: isLocked,
      hasMoved: false,
    };

    setActiveDragState({ type: "move", participantId: p.id });

    let rafId: number | null = null;

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!dragSessionRef.current || !stageContainerRef.current) return;

      const deltaPixelX = moveEvt.clientX - startClientX;
      const deltaPixelY = moveEvt.clientY - startClientY;

      if (!dragSessionRef.current.hasMoved) {
        if (Math.hypot(deltaPixelX, deltaPixelY) < 4) return;
        dragSessionRef.current.hasMoved = true;
      }

      if (rafId !== null) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!dragSessionRef.current || !stageContainerRef.current) return;
        const rect = stageContainerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const deltaXPercent = (deltaPixelX / rect.width) * 100;
        const deltaYPercent = (deltaPixelY / rect.height) * 100;

        const { startBounds, participantId } = dragSessionRef.current;
        const newX = Math.max(0, Math.min(100 - startBounds.width, startBounds.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100 - startBounds.height, startBounds.y + deltaYPercent));

        setParticipantBounds(participantId, {
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1)),
          width: startBounds.width,
          height: startBounds.height,
          isLockedRatio: dragSessionRef.current.isLockedRatio,
        });
      });
    };

    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      dragSessionRef.current = null;
      setActiveDragState(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleTileTouchStart = (e: React.TouchEvent, p: Participant, currentBounds: ParticipantBounds) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".no-drag")) return;

    e.stopPropagation();
    setSelectedParticipantId(p.id);
    const isPipMode = activeLayout === "pip" || customLayoutConfig.mode === "pip";
    if (!isPipMode || !stageContainerRef.current) return;

    const startClientX = touch.clientX;
    const startClientY = touch.clientY;
    const isLocked = currentBounds.isLockedRatio !== false;

    dragSessionRef.current = {
      type: "move",
      participantId: p.id,
      startClientX,
      startClientY,
      startBounds: { ...currentBounds },
      isLockedRatio: isLocked,
      hasMoved: false,
    };

    setActiveDragState({ type: "move", participantId: p.id });

    let rafId: number | null = null;

    const onTouchMove = (touchEvt: TouchEvent) => {
      if (!dragSessionRef.current || !stageContainerRef.current || touchEvt.touches.length === 0) return;
      const t = touchEvt.touches[0];
      const deltaPixelX = t.clientX - startClientX;
      const deltaPixelY = t.clientY - startClientY;

      if (!dragSessionRef.current.hasMoved) {
        if (Math.hypot(deltaPixelX, deltaPixelY) < 5) return;
        dragSessionRef.current.hasMoved = true;
      }

      if (rafId !== null) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!dragSessionRef.current || !stageContainerRef.current) return;
        const rect = stageContainerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const deltaXPercent = (deltaPixelX / rect.width) * 100;
        const deltaYPercent = (deltaPixelY / rect.height) * 100;

        const { startBounds, participantId } = dragSessionRef.current;
        const newX = Math.max(0, Math.min(100 - startBounds.width, startBounds.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100 - startBounds.height, startBounds.y + deltaYPercent));

        setParticipantBounds(participantId, {
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1)),
          width: startBounds.width,
          height: startBounds.height,
          isLockedRatio: dragSessionRef.current.isLockedRatio,
        });
      });
    };

    const onTouchEnd = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      dragSessionRef.current = null;
      setActiveDragState(null);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  };

  const handleTileResizeMouseDown = (
    e: React.MouseEvent,
    targetId: string | number,
    handle: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w",
    currentBounds: ParticipantBounds
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stageContainerRef.current) return;

    if (String(targetId) === "active-media") {
      pushMediaBoundsUndoState();
    }
    setSelectedParticipantId(targetId);
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startB = { ...currentBounds };

    setActiveDragState({ type: "resize", handle, participantId: targetId });

    let rafId: number | null = null;
    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!stageContainerRef.current) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!stageContainerRef.current) return;
        const rect = stageContainerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dxPct = ((moveEvt.clientX - startClientX) / rect.width) * 100;
        const dyPct = ((moveEvt.clientY - startClientY) / rect.height) * 100;

        let nextX = startB.x;
        let nextY = startB.y;
        let nextW = startB.width;
        let nextH = startB.height;
        const minW = 18;
        const minH = 18;

        if (handle.includes("e")) {
          nextW = Math.max(minW, Math.min(100 - startB.x, startB.width + dxPct));
        }
        if (handle.includes("s")) {
          nextH = Math.max(minH, Math.min(100 - startB.y, startB.height + dyPct));
        }
        if (handle.includes("w")) {
          const maxDeltaLeft = startB.width - minW;
          const clampedDx = Math.max(-startB.x, Math.min(maxDeltaLeft, dxPct));
          nextX = startB.x + clampedDx;
          nextW = startB.width - clampedDx;
        }
        if (handle.includes("n")) {
          const maxDeltaTop = startB.height - minH;
          const clampedDy = Math.max(-startB.y, Math.min(maxDeltaTop, dyPct));
          nextY = startB.y + clampedDy;
          nextH = startB.height - clampedDy;
        }

        setParticipantBounds(targetId, {
          x: Number(nextX.toFixed(1)),
          y: Number(nextY.toFixed(1)),
          width: Number(nextW.toFixed(1)),
          height: Number(nextH.toFixed(1)),
          zIndex: startB.zIndex || 25,
          isLockedRatio: false,
        });
      });
    };

    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      setActiveDragState(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);
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

  const renderTile = (p?: Participant | null, index: number = 0, extraClasses = "") => {
    if (!p) return null;
    const isScreen = p.role === "screen" || p.isScreen === true;
    return (
      <div
        key={p.id || index}
        data-stage-tile="true"
        data-participant-tile="true"
        data-participant-id={String(p.id)}
        data-participant-name={p.name || "Guest"}
        data-participant-initials={
          p.name
            ? p.name
              .trim()
              .split(" ")
              .map((n) => (n ? n[0] : ""))
              .filter(Boolean)
              .join("")
              .toUpperCase()
              .slice(0, 2) || "G"
            : "G"
        }
        data-participant-cam={p.camOn ? "on" : "off"}
        data-participant-mic={p.micOn ? "on" : "off"}
        data-participant-speaking={p.isSpeaking ? "true" : "false"}
        data-participant-role={p.role || "guest"}
        data-participant-local={p.isLocal ? "true" : "false"}
        data-participant-screen={isScreen ? "true" : "false"}
        className={cn("relative w-full h-full", extraClasses)}
      >
        <VideoTrackView
          id={p.id}
          track={p.videoTrack}
          audioTrack={p.audioTrack}
          name={p.name || "Guest"}
          isSpeaking={p.isSpeaking}
          micOn={p.micOn}
          camOn={p.camOn}
          isLocal={p.isLocal}
          isScreen={isScreen}
          role={p.role}
          className={isFullBleedLayout ? "rounded-none border-0" : undefined}
        />
      </div>
    );
  };

  // Helper to render active stage media (video/slides/image/youtube/map/website)
  const renderMediaTile = (
    targetMedia: MediaFileItem | null = activeMedia,
    currentMediaBounds?: ParticipantBounds,
    isSecondary: boolean = false
  ) => {
    if (!targetMedia) return null;
    const tileKey = isSecondary ? "secondary-media" : "active-media";
    const tf = tileTransforms[tileKey] || {
      fitMode: defaultMediaFit,
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
    };
    const currentFitMode = (tf.fitMode as "contain" | "cover") || defaultMediaFit;
    const currentZoom = Math.max(1, tf.zoom || 1);
    const currentPanX = Math.max(-50, Math.min(50, tf.panX || 0));
    const currentPanY = Math.max(-50, Math.min(50, tf.panY || 0));
    const currentRotation = tf.rotation || 0;
    const currentMirrored = Boolean(
      (fairUseConfig?.enabled && fairUseConfig?.mirrorMediaVideo) || tf.flipH
    );
    const effObjPosX = Math.max(0, Math.min(100, 50 + currentPanX));
    const effObjPosY = Math.max(0, Math.min(100, 50 + currentPanY));
    const effOriginX = currentMirrored ? 100 - effObjPosX : effObjPosX;

    const isTransparentCard = Boolean(tf.isTransparentBg);
    const isMediaFullBleed = isFullBleedLayout || currentFitMode === "cover";
    const effBounds = currentMediaBounds || { x: 0, y: 0, width: 100, height: 100 };
    const touchesBottomTicker = Boolean(showTicker && effBounds.y + effBounds.height > 88);
    const activeYtVideoId =
      targetMedia.type === "youtube"
        ? targetMedia.youtubeId || (targetMedia.url ? extractYouTubeVideoId(targetMedia.url) : "")
        : "";
    return (
      <div
        data-stage-tile="true"
        data-stage-media="true"
        data-participant-id={tileKey}
        data-media-name={targetMedia.name}
        data-participant-fit={currentFitMode}
        data-transparent-card={isTransparentCard ? "true" : "false"}
        className={cn(
          "relative w-full h-full overflow-hidden flex items-center justify-center group select-none transition-all",
          isMediaFullBleed ? "rounded-none" : "rounded-2xl",
          isTransparentCard
            ? "bg-transparent border-0 shadow-none"
            : isMediaFullBleed
              ? "bg-black border-0 shadow-none"
              : "bg-black/95 border border-indigo-500/30 shadow-2xl"
        )}
      >
        {/* Inner Media Viewport with Pan & Zoom Transform */}
        <div
          className="relative w-full h-full overflow-hidden flex items-center justify-center select-none"
          onMouseDown={!isSecondary ? handleMediaPanMouseDown : undefined}
          onTouchStart={!isSecondary ? handleMediaPanTouchStart : undefined}
          onTouchMove={!isSecondary ? handleMediaPanTouchMove : undefined}
          onTouchEnd={!isSecondary ? handleMediaPanTouchEnd : undefined}
          onWheel={!isSecondary ? handleMediaWheel : undefined}
        >
          {mediaLoadError && !isSecondary ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2.5 bg-black/90 w-full h-full">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Video className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-rose-300">Media source unavailable or expired</p>
              <p className="text-[10px] text-slate-500 max-w-[220px] truncate">{targetMedia.name}</p>
              <div className="flex items-center gap-2 mt-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("livestudio-open-tab", { detail: "media" }));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Open media library to select or upload a replacement file"
                >
                  <MonitorUp className="w-3.5 h-3.5" />
                  <span>Change / Replace Media</span>
                </button>
                <button
                  type="button"
                  onClick={() => (isSecondary ? setSecondaryMedia(null) : setActiveMedia(null))}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Remove from Stage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : targetMedia.type === "website" ? (
            <InteractiveWebsiteStageView
              item={targetMedia}
              zoom={Number((currentZoom * breathScale).toFixed(3))}
              panX={currentPanX}
              panY={currentPanY}
              rotation={currentRotation}
              isMirrored={currentMirrored}
              onOpenLibraryModal={() => setIsWebsiteModalOpen(true)}
            />
          ) : targetMedia.type === "map" && targetMedia.mapConfig ? (
            (() => {
              const isBreathingActive = Boolean(fairUseConfig?.enabled && (fairUseConfig?.zoomBreathing ?? true));
              const effectiveZoom = Number((currentZoom * breathScale).toFixed(4));

              return (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform:
                      [
                        effectiveZoom > 1.0005 ? `scale(${effectiveZoom})` : "",
                        isBreathingActive && (Math.abs(breathState.tx) > 0.01 || Math.abs(breathState.ty) > 0.01)
                          ? `translate3d(${breathState.tx}px, ${breathState.ty}px, 0)`
                          : "",
                        currentRotation ? `rotate(${currentRotation}deg)` : "",
                        currentMirrored ? "scaleX(-1)" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined,
                    transformOrigin: `${effOriginX}% ${effObjPosY}%`,
                  }}
                  className="w-full h-full relative pointer-events-auto"
                >
                  <TacticalMapStageCanvas
                    config={targetMedia.mapConfig}
                    fitMode={currentFitMode}
                    isInteractive={true}
                    onOpenEditorModal={() => setIsTacticalMapModalOpen(true)}
                    onConfigChange={(nextMapCfg) => {
                      const mergedCfg = { ...targetMedia.mapConfig!, ...nextMapCfg };
                      const updatedMedia = { ...targetMedia, mapConfig: mergedCfg };
                      if (isSecondary) {
                        setSecondaryMedia(updatedMedia);
                      } else {
                        setActiveMedia(updatedMedia);
                      }
                      useStudioStore.getState().updateMediaLibraryItem(targetMedia.id, { mapConfig: mergedCfg });
                    }}
                  />
                </div>
              );
            })()
          ) : targetMedia.type === "youtube" && (useYtIframeFallback || isSecondary) && (activeYtVideoId || extractYouTubeVideoId(targetMedia.url || "")) ? (
            (() => {
              const ytVideoId = activeYtVideoId || extractYouTubeVideoId(targetMedia.url || "");
              const tileRelAspect = Math.max(
                0.2,
                Math.min(4.0, (effBounds.width || 100) / Math.max(1, effBounds.height || 100))
              );
              const isCoverFill = currentFitMode === "cover" || Math.abs(currentPanX) > 0.5;
              const iframeWidthPct = isCoverFill
                ? tileRelAspect < 1
                  ? Math.ceil((1 / tileRelAspect) * 108)
                  : 106
                : 102;
              const iframeHeightPct = isCoverFill
                ? tileRelAspect > 1
                  ? Math.ceil(tileRelAspect * 124)
                  : 124
                : 118;

              const isBreathingActive = Boolean(fairUseConfig?.enabled && (fairUseConfig?.zoomBreathing ?? true));
              const effectiveZoom = Number((currentZoom * breathScale).toFixed(4));

              return (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform:
                      [
                        effectiveZoom > 1.0005 ? `scale(${effectiveZoom})` : "",
                        isBreathingActive && (Math.abs(breathState.tx) > 0.01 || Math.abs(breathState.ty) > 0.01)
                          ? `translate3d(${breathState.tx}px, ${breathState.ty}px, 0)`
                          : "",
                        currentRotation ? `rotate(${currentRotation}deg)` : "",
                        currentMirrored ? "scaleX(-1)" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined,
                    transformOrigin: `${effOriginX}% ${effObjPosY}%`,
                  }}
                  className="w-full h-full relative overflow-hidden pointer-events-auto bg-black"
                >
                  <iframe
                    id={isSecondary ? "livestudio-secondary-youtube-iframe" : "livestudio-active-youtube-iframe"}
                    key={`yt-${tileKey}-${ytVideoId || targetMedia.id}`}
                    src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&controls=0&cc_load_policy=0&hl=en&iv_load_policy=3&rel=0&fs=0&disablekb=1&modestbranding=1&playsinline=1&loop=${targetMedia.loop !== false ? 1 : 0}&playlist=${ytVideoId}${targetMedia.startTimeSec ? `&start=${Math.floor(targetMedia.startTimeSec)}` : ""}${targetMedia.endTimeSec ? `&end=${Math.floor(targetMedia.endTimeSec)}` : ""}`}
                    title={targetMedia.name}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: `${iframeWidthPct}%`,
                      height: `${iframeHeightPct}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="border-0 pointer-events-none select-none"
                  />
                  <audio
                    id={isSecondary ? "livestudio-secondary-media-audio" : "livestudio-active-media-audio"}
                    key={`yt-audio-${tileKey}-${ytVideoId || targetMedia.id}-${ytAudioAttempt}`}
                    src={
                      ytAudioAttempt === 0
                        ? `/api/media/youtube/audio?videoId=${ytVideoId}`
                        : `/youtube-stream?videoId=${ytVideoId}`
                    }
                    autoPlay
                    playsInline
                    preload="auto"
                    crossOrigin="anonymous"
                    muted={Boolean(targetMedia.isMuted)}
                    className="hidden pointer-events-none"
                    onError={() => {
                      if (ytAudioAttempt === 0) {
                        setYtAudioAttempt(1);
                      } else {
                        // Emergency fail-safe: direct audio proxy failed, ensure iframe stays unmuted with sound
                        sendYouTubeIframeCommand("unMute", []);
                        sendYouTubeIframeCommand("setVolume", [Math.min(100, normalizedMediaVolumePct)]);
                      }
                    }}
                    onCanPlay={(e) => {
                      stageBroadcaster.ensureAudioContext();
                      stageBroadcaster.refreshAudioConnections();
                      const a = e.currentTarget;
                      const vol = targetMedia.volume !== undefined ? targetMedia.volume : 100;
                      if (!targetMedia.isMuted && vol > 0) {
                        a.muted = false;
                        try {
                          a.volume = Math.max(0.05, Math.min(1, vol / 100));
                        } catch { }
                      }
                      if (a.paused) a.play().catch(() => { });
                    }}
                    onPlaying={() => {
                      stageBroadcaster.ensureAudioContext();
                      stageBroadcaster.refreshAudioConnections();
                      // Only mute iframe once proxy audio is verified to be outputting audio
                      sendYouTubeIframeCommand("mute", []);
                    }}
                    onPause={() => {
                      // If proxy audio pauses, keep iframe unmuted so host never experiences silence
                      if (!activeMedia?.isMuted && normalizedMediaVolumePct > 0) {
                        sendYouTubeIframeCommand("unMute", []);
                        sendYouTubeIframeCommand("setVolume", [Math.min(100, normalizedMediaVolumePct)]);
                      }
                    }}
                    onPlay={() => {
                      stageBroadcaster.ensureAudioContext();
                      stageBroadcaster.refreshAudioConnections();
                    }}
                  />
                </div>
              );
            })()
          ) : targetMedia.type === "video" || targetMedia.type === "youtube" ? (
            (() => {
              const isBreathingActive = Boolean(fairUseConfig?.enabled && (fairUseConfig?.zoomBreathing ?? true));
              const effectiveZoom = Number((currentZoom * breathScale).toFixed(4));

              return (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform:
                      [
                        effectiveZoom > 1.0005 ? `scale(${effectiveZoom})` : "",
                        isBreathingActive && (Math.abs(breathState.tx) > 0.01 || Math.abs(breathState.ty) > 0.01)
                          ? `translate3d(${breathState.tx}px, ${breathState.ty}px, 0)`
                          : "",
                        currentRotation ? `rotate(${currentRotation}deg)` : "",
                        currentMirrored ? "scaleX(-1)" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined,
                    transformOrigin: `${effOriginX}% ${effObjPosY}%`,
                  }}
                  className="w-full h-full relative overflow-hidden pointer-events-auto"
                >
                  <video
                    id={isSecondary ? "livestudio-secondary-media-video" : "livestudio-active-media-video"}
                    key={`vid-${tileKey}-${targetMedia.id}`}
                    src={
                      targetMedia.type === "youtube" && activeYtVideoId
                        ? ytStreamAttempt === 0
                          ? `/api/media/youtube/stream?videoId=${activeYtVideoId}`
                          : `/youtube-stream?videoId=${activeYtVideoId}`
                        : targetMedia.url
                    }
                    autoPlay
                    playsInline
                    preload="auto"
                    loop={(targetMedia.loop ?? true) && !targetMedia.startTimeSec && !targetMedia.endTimeSec}
                    muted={Boolean(targetMedia.isMuted)}
                    crossOrigin="anonymous"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (targetMedia.type === "youtube" && v.videoWidth === 0) {
                        setUseYtIframeFallback(true);
                      }
                    }}
                    onCanPlay={(e) => {
                      const v = e.currentTarget;
                      if (targetMedia.type === "youtube" && v.videoWidth === 0) {
                        setUseYtIframeFallback(true);
                        return;
                      }
                      ytReadyConfirmedRef.current = true;
                      stageBroadcaster.ensureAudioContext();
                      stageBroadcaster.refreshAudioConnections();
                      const vol = targetMedia.volume !== undefined ? targetMedia.volume : 100;
                      if (!targetMedia.isMuted && vol > 0) {
                        v.muted = false;
                        try {
                          v.volume = Math.max(0.05, Math.min(1, vol / 100));
                        } catch { }
                      }
                      if (v.paused) v.play().catch(() => { });
                    }}
                    onPlaying={() => {
                      const v = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
                      if (targetMedia.type === "youtube" && v && v.videoWidth === 0) {
                        setUseYtIframeFallback(true);
                        return;
                      }
                      ytReadyConfirmedRef.current = true;
                      stageBroadcaster.ensureAudioContext();
                      stageBroadcaster.refreshAudioConnections();
                    }}
                    onPlay={() => {
                      stageBroadcaster.ensureAudioContext();
                      stageBroadcaster.refreshAudioConnections();
                    }}
                    onError={() => {
                      if (targetMedia.type === "youtube") {
                        setUseYtIframeFallback(true);
                      }
                    }}
                    style={{
                      objectFit: currentFitMode,
                      objectPosition: `${effObjPosX}% ${effObjPosY}%`,
                      userSelect: "none",
                    }}
                    className="w-full h-full max-w-none pointer-events-auto"
                  />
                </div>
              );
            })()
          ) : (
            (() => {
              const isBreathingActive = Boolean(fairUseConfig?.enabled && (fairUseConfig?.zoomBreathing ?? true));
              const effectiveZoom = Number((currentZoom * breathScale).toFixed(4));

              return (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform:
                      [
                        effectiveZoom > 1.0005 ? `scale(${effectiveZoom})` : "",
                        isBreathingActive && (Math.abs(breathState.tx) > 0.01 || Math.abs(breathState.ty) > 0.01)
                          ? `translate3d(${breathState.tx}px, ${breathState.ty}px, 0)`
                          : "",
                        currentRotation ? `rotate(${currentRotation}deg)` : "",
                        currentMirrored ? "scaleX(-1)" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined,
                    transformOrigin: `${effOriginX}% ${effObjPosY}%`,
                  }}
                  className="w-full h-full relative overflow-hidden pointer-events-auto"
                >
                  <img
                    src={targetMedia.thumbnail || targetMedia.url}
                    alt={targetMedia.name}
                    crossOrigin="anonymous"
                    draggable={false}
                    style={{
                      objectFit: currentFitMode,
                      objectPosition: `${effObjPosX}% ${effObjPosY}%`,
                      userSelect: "none",
                    }}
                    className="w-full h-full max-w-none pointer-events-auto"
                  />
                </div>
              );
            })()
          )}

          {/* 60FPS HTML5 Canvas Fair-Use Film Grain + Refined 35mm Vintage Hairlines + Traveling Scanline Bars */}
          {fairUseConfig?.enabled &&
            ((fairUseConfig?.filmGrainOverlay ?? true) ||
              (fairUseConfig?.vintageLinesOverlay ?? true)) && (
              <FairUseCanvasOverlay
                grainEnabled={fairUseConfig?.filmGrainOverlay ?? true}
                grainIntensity={fairUseConfig?.grainIntensity || "random"}
                linesEnabled={fairUseConfig?.vintageLinesOverlay ?? true}
                linesIntensity={fairUseConfig?.vintageLinesIntensity || "medium"}
              />
            )}

          {/* Fair Use / Safe Mode Badge on Active Media */}
          {fairUseConfig?.enabled && (fairUseConfig?.showFairUseBadge ?? true) && (
            <div
              className={cn(
                "absolute left-3 bottom-3 z-30 flex items-center gap-1.5 bg-amber-500/95 text-slate-950 font-black text-[9px] tracking-wider uppercase px-2 py-0.5 rounded shadow-lg pointer-events-none transition-all select-none"
              )}
            >
              <ShieldAlert className="w-3 h-3 text-slate-950" />
              <span>{fairUseConfig.badgeText || "Fair Use • Safe Mode"}</span>
            </div>
          )}

          {/* Quick Corner Controls Overlay on Tile */}
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
            {(targetMedia.type === "video" || targetMedia.type === "youtube" || targetMedia.type === "audio") && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSecondary) toggleSecondaryMediaMute();
                  else toggleMediaMute();
                }}
                className="p-1 rounded-md bg-black/80 hover:bg-black text-white text-[10px] border border-white/20 shadow"
                title={targetMedia.isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {targetMedia.isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isSecondary) {
                  resetParticipantBounds("secondary-media");
                  setSecondaryMedia(null);
                } else {
                  resetParticipantBounds("active-media");
                  setActiveMedia(null);
                }
              }}
              className="p-1 rounded-md bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white text-[10px] border border-white/20 shadow"
              title="Remove from Stage"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Layout Engine: StreamYard-Parity Canvas with Selection Tool & Independent Window Resizing
  const renderLayoutContent = () => {
    const isPipMode = activeLayout === "pip" || customLayoutConfig.mode === "pip";
    const hasVisualMedia = Boolean(
      activeMedia &&
      (activeMedia.type === "video" ||
        activeMedia.type === "youtube" ||
        activeMedia.type === "map" ||
        activeMedia.type === "website" ||
        activeMedia.type === "image" ||
        activeMedia.type === "pdf")
    );
    const hasSecondaryVisualMedia = Boolean(
      secondaryMedia &&
      (secondaryMedia.type === "video" ||
        secondaryMedia.type === "youtube" ||
        secondaryMedia.type === "map" ||
        secondaryMedia.type === "website" ||
        secondaryMedia.type === "image" ||
        secondaryMedia.type === "pdf")
    );

    if (onStageParticipants.length === 0 && !hasVisualMedia && !hasSecondaryVisualMedia) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Video className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-sm font-medium">Stage is empty</p>
          <p className="text-xs text-slate-600">Add participants or play media to bring them on stage</p>
        </div>
      );
    }

    const shouldEnforceReactionPiP = Boolean(
      fairUseConfig?.enabled &&
      fairUseConfig?.enforceReactionPiP &&
      activeMedia &&
      (activeMedia.type === "video" || activeMedia.type === "youtube")
    );
    const customMediaBounds = participantBounds["active-media"];
    const isMediaFloatingPip = Boolean(
      customMediaBounds && customMediaBounds.width <= 42 && customMediaBounds.height <= 45
    );
    const effectiveMediaCropped = Boolean(isStageCropped || mediaFitMode === "cover");

    const rawMediaLayoutResult = calculateStageLayout(
      activeLayout,
      totalPlannedSlots,
      hasVisualMedia,
      layoutSplitRatio,
      customLayoutConfig,
      shouldEnforceReactionPiP,
      mediaSlotIndex,
      effectiveMediaCropped,
      hasSecondaryVisualMedia
    );

    const stageLayoutResult = isMediaFloatingPip
      ? {
        mediaBounds: rawMediaLayoutResult.mediaBounds,
        secondaryMediaBounds: rawMediaLayoutResult.secondaryMediaBounds,
        participantBounds: calculateStageLayout(
          activeLayout,
          totalPlannedSlots,
          false,
          layoutSplitRatio,
          customLayoutConfig,
          false,
          mediaSlotIndex,
          isStageCropped,
          false
        ).participantBounds,
      }
      : rawMediaLayoutResult;

    const defaultMediaBounds: ParticipantBounds =
      stageLayoutResult.mediaBounds || (
        onStageParticipants.length === 0
          ? effectiveMediaCropped
            ? { x: 0, y: 0, width: hasSecondaryVisualMedia ? 50 : 100, height: 100, zIndex: 10, isLockedRatio: true }
            : { x: 2, y: 3, width: hasSecondaryVisualMedia ? 46 : 96, height: 94, zIndex: 10, isLockedRatio: true }
          : effectiveMediaCropped
            ? { x: 0, y: 0, width: 68, height: 100, zIndex: 10, isLockedRatio: true }
            : { x: 2, y: 4, width: 68, height: 92, zIndex: 10, isLockedRatio: true }
      );
    const mediaBounds: ParticipantBounds = customMediaBounds || defaultMediaBounds;
    const isMediaSelected = String(selectedParticipantId) === "active-media";
    const isMediaDragging = activeDragState?.participantId === "active-media";
    const isMediaTileEdgeToEdge =
      (isFullBleedLayout || mediaFitMode === "cover") && !isMediaFloatingPip;

    const customSecondaryMediaBounds = participantBounds["secondary-media"];
    const isSecondaryFloatingPip = Boolean(
      customSecondaryMediaBounds && customSecondaryMediaBounds.width <= 42 && customSecondaryMediaBounds.height <= 45
    );
    const defaultSecondaryMediaBounds: ParticipantBounds =
      stageLayoutResult.secondaryMediaBounds || (
        effectiveMediaCropped
          ? { x: 50, y: 0, width: 50, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 51, y: 3, width: 47, height: 94, zIndex: 10, isLockedRatio: true }
      );
    const secondaryMediaBounds: ParticipantBounds = customSecondaryMediaBounds || defaultSecondaryMediaBounds;
    const isSecondaryMediaSelected = String(selectedParticipantId) === "secondary-media";
    const isSecondaryMediaDragging = activeDragState?.participantId === "secondary-media";
    const isSecondaryMediaTileEdgeToEdge =
      (isFullBleedLayout || secondaryMediaFitMode === "cover") && !isSecondaryFloatingPip;

    return (
      <div
        className={cn(
          "w-full h-full relative select-none",
          isFullBleedLayout || (hasVisualMedia && mediaFitMode === "cover") ? "p-0" : "p-2"
        )}
      >
        {/* Active Stage Media Window */}
        {hasVisualMedia && activeMedia && (
          <div
            key="stage-active-media"
            onMouseEnter={() => setIsMediaHovered(true)}
            onMouseLeave={() => setIsMediaHovered(false)}
            style={{
              position: "absolute",
              left: `${mediaBounds.x}%`,
              top: `${mediaBounds.y}%`,
              width: `${mediaBounds.width}%`,
              height: `${mediaBounds.height}%`,
              zIndex: isMediaSelected ? 35 : (mediaBounds.zIndex || 10),
              transition: isMediaDragging ? "none" : "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseDown={(e) =>
              handleTileMouseDown(e, { id: "active-media", name: activeMedia.name } as any, mediaBounds)
            }
            onTouchStart={(e) =>
              handleTileTouchStart(e, { id: "active-media", name: activeMedia.name } as any, mediaBounds)
            }
            onClick={(e) => {
              e.stopPropagation();
              setSelectedParticipantId("active-media");
            }}
            className={cn(
              "overflow-visible select-none transition-shadow group/mediatile",
              isMediaTileEdgeToEdge ? "rounded-none" : "rounded-2xl",
              isMediaSelected
                ? cn(
                  "ring-2 ring-indigo-500 ring-inset shadow-[0_0_25px_rgba(99,102,241,0.5)] cursor-pointer",
                  !isMediaTileEdgeToEdge && "border-indigo-400"
                )
                : mediaTransform.isTransparentBg || isMediaTileEdgeToEdge
                  ? "border-0 cursor-pointer"
                  : "border border-white/10 hover:border-indigo-400/50 cursor-pointer"
            )}
          >
            {/* Inner Media Content */}
            <div
              className={cn(
                "w-full h-full overflow-hidden relative pointer-events-auto",
                isMediaTileEdgeToEdge ? "rounded-none" : "rounded-2xl",
                isMediaTransitioning && "animate-in fade-in zoom-in-95 duration-300"
              )}
            >
              {renderMediaTile(activeMedia, mediaBounds, false)}
              {isMediaTransitioning && (
                <div className="absolute inset-0 bg-[#07070d]/35 backdrop-blur-[1.5px] z-40 pointer-events-none animate-out fade-out duration-300" />
              )}
            </div>

            {/* Quick Corner Restore / Undo Pill directly on Custom-Resized Media Window */}
            {(customMediaBounds || mediaBoundsHistory.length > 0) && (
              <div
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="no-drag absolute top-2 right-2 z-40 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md border border-amber-400/60 rounded-lg px-2 py-1 shadow-xl pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={handleUndoMediaBounds}
                  className="px-1.5 py-0.5 rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 text-[10px] font-bold flex items-center gap-1 transition-colors"
                  title="Undo last media window resize or move"
                >
                  <RotateCcw className="w-3 h-3 text-amber-300" />
                  <span>Undo</span>
                </button>
                {customMediaBounds && (
                  <button
                    type="button"
                    onClick={handleResetMediaBoundsToSlot}
                    className="px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors"
                    title="Restore media window to full layout slot"
                  >
                    Fit Slot
                  </button>
                )}
              </div>
            )}

            {/* 8-Way Interactive Mouse Resize Handles for Active Media Window */}
            {(isMediaSelected || Boolean(participantBounds["active-media"])) && (
              <>
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "nw", mediaBounds)}
                  className="no-drag absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-nwse-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "ne", mediaBounds)}
                  className="no-drag absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-nesw-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "sw", mediaBounds)}
                  className="no-drag absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-nesw-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "se", mediaBounds)}
                  className="no-drag absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-nwse-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "n", mediaBounds)}
                  className="no-drag absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-cyan-400/90 border border-slate-950 cursor-ns-resize z-50 shadow"
                  title="Drag top edge to resize height"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "s", mediaBounds)}
                  className="no-drag absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-cyan-400/90 border border-slate-950 cursor-ns-resize z-50 shadow"
                  title="Drag bottom edge to resize height"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "w", mediaBounds)}
                  className="no-drag absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-8 rounded-full bg-cyan-400/90 border border-slate-950 cursor-ew-resize z-50 shadow"
                  title="Drag left edge to resize width"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "active-media", "e", mediaBounds)}
                  className="no-drag absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-8 rounded-full bg-cyan-400/90 border border-slate-950 cursor-ew-resize z-50 shadow"
                  title="Drag right edge to resize width"
                />
              </>
            )}
          </div>
        )}

        {/* Secondary Stage Media Window (Window 2) */}
        {hasSecondaryVisualMedia && secondaryMedia && (
          <div
            key="stage-secondary-media"
            style={{
              position: "absolute",
              left: `${secondaryMediaBounds.x}%`,
              top: `${secondaryMediaBounds.y}%`,
              width: `${secondaryMediaBounds.width}%`,
              height: `${secondaryMediaBounds.height}%`,
              zIndex: isSecondaryMediaSelected ? 35 : (secondaryMediaBounds.zIndex || 10),
              transition: isSecondaryMediaDragging ? "none" : "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseDown={(e) =>
              handleTileMouseDown(e, { id: "secondary-media", name: secondaryMedia.name } as any, secondaryMediaBounds)
            }
            onTouchStart={(e) =>
              handleTileTouchStart(e, { id: "secondary-media", name: secondaryMedia.name } as any, secondaryMediaBounds)
            }
            onClick={(e) => {
              e.stopPropagation();
              setSelectedParticipantId("secondary-media");
              setFocusedMediaSlot("secondary");
            }}
            className={cn(
              "overflow-visible select-none transition-shadow group/secondarymediatile",
              isSecondaryMediaTileEdgeToEdge ? "rounded-none" : "rounded-2xl",
              isSecondaryMediaSelected
                ? cn(
                  "ring-2 ring-emerald-500 ring-inset shadow-[0_0_25px_rgba(16,185,129,0.5)] cursor-pointer",
                  !isSecondaryMediaTileEdgeToEdge && "border-emerald-400"
                )
                : secondaryMediaTransform.isTransparentBg || isSecondaryMediaTileEdgeToEdge
                  ? "border-0 cursor-pointer"
                  : "border border-white/10 hover:border-emerald-400/50 cursor-pointer"
            )}
          >
            {/* Inner Media Content */}
            <div
              className={cn(
                "w-full h-full overflow-hidden relative pointer-events-auto",
                isSecondaryMediaTileEdgeToEdge ? "rounded-none" : "rounded-2xl",
                isMediaTransitioning && "animate-in fade-in zoom-in-95 duration-300"
              )}
            >
              {renderMediaTile(secondaryMedia, secondaryMediaBounds, true)}
              {isMediaTransitioning && (
                <div className="absolute inset-0 bg-[#07070d]/35 backdrop-blur-[1.5px] z-40 pointer-events-none animate-out fade-out duration-300" />
              )}
            </div>

            {/* Quick Corner Restore / Undo Pill directly on Custom-Resized Secondary Media Window */}
            {customSecondaryMediaBounds && (
              <div
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="no-drag absolute top-2 right-2 z-40 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md border border-emerald-400/60 rounded-lg px-2 py-1 shadow-xl pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => resetParticipantBounds("secondary-media")}
                  className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors"
                  title="Restore secondary media window to full layout slot"
                >
                  Fit Slot
                </button>
              </div>
            )}

            {/* 8-Way Interactive Mouse Resize Handles for Secondary Media Window */}
            {(isSecondaryMediaSelected || Boolean(participantBounds["secondary-media"])) && (
              <>
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "nw", secondaryMediaBounds)}
                  className="no-drag absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 cursor-nwse-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "ne", secondaryMediaBounds)}
                  className="no-drag absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 cursor-nesw-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "sw", secondaryMediaBounds)}
                  className="no-drag absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 cursor-nesw-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "se", secondaryMediaBounds)}
                  className="no-drag absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 cursor-nwse-resize z-50 shadow-lg hover:scale-125 transition-transform"
                  title="Drag corner to resize media window"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "n", secondaryMediaBounds)}
                  className="no-drag absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-emerald-400/90 border border-slate-950 cursor-ns-resize z-50 shadow"
                  title="Drag top edge to resize height"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "s", secondaryMediaBounds)}
                  className="no-drag absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-emerald-400/90 border border-slate-950 cursor-ns-resize z-50 shadow"
                  title="Drag bottom edge to resize height"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "w", secondaryMediaBounds)}
                  className="no-drag absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-8 rounded-full bg-emerald-400/90 border border-slate-950 cursor-ew-resize z-50 shadow"
                  title="Drag left edge to resize width"
                />
                <div
                  onMouseDown={(e) => handleTileResizeMouseDown(e, "secondary-media", "e", secondaryMediaBounds)}
                  className="no-drag absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-8 rounded-full bg-emerald-400/90 border border-slate-950 cursor-ew-resize z-50 shadow"
                  title="Drag right edge to resize width"
                />
              </>
            )}
          </div>
        )}

        {/* Unified Draggable Floating Action Pill Toolbar for Media */}
        {(hasVisualMedia || hasSecondaryVisualMedia) && (activeMedia || secondaryMedia) && (() => {
          const isSecondaryToolbar = Boolean(focusedMediaSlot === "secondary" && secondaryMedia);
          const currentToolbarMedia = isSecondaryToolbar && secondaryMedia ? secondaryMedia : (activeMedia || secondaryMedia);
          if (!currentToolbarMedia) return null;
          return (
          <div
            style={
              mediaToolbarPos
                ? {
                    left: `${mediaToolbarPos.x}px`,
                    top: `${mediaToolbarPos.y}px`,
                    transform: "none",
                  }
                : undefined
            }
            className={cn(
              "absolute z-50 flex flex-wrap items-center justify-center gap-1 pointer-events-auto transition-all duration-75 max-w-[calc(100%-16px)]",
              mediaToolbarPos
                ? ""
                : currentToolbarMedia.type === "website"
                ? showTicker
                  ? "bottom-14 left-1/2 -translate-x-1/2"
                  : "top-12 left-1/2 -translate-x-1/2"
                : "top-2 left-1/2 -translate-x-1/2",
              isMediaToolbarCollapsed
                ? "bg-transparent p-0"
                : "bg-[#0c0c16]/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-indigo-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.85)]"
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {isMediaToolbarCollapsed ? (
              <div className="flex items-center gap-1">
                <div
                  onMouseDown={handleStartDragToolbar}
                  className="cursor-grab active:cursor-grabbing px-2 py-1 rounded-xl bg-[#0c0c16]/95 backdrop-blur-md border border-indigo-500/60 text-slate-400 hover:text-white flex items-center shadow-lg text-[10px] select-none cursor-move"
                  title="Drag controls"
                >
                  ⠿ Drag
                </div>
                {hasVisualMedia && hasSecondaryVisualMedia && activeMedia && secondaryMedia && (
                  <div className="flex items-center gap-1 bg-[#121324] px-1.5 py-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFocusedMediaSlot("primary")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold transition-all",
                        focusedMediaSlot === "primary" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      Win 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setFocusedMediaSlot("secondary")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold transition-all",
                        focusedMediaSlot === "secondary" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      Win 2
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsMediaToolbarCollapsed(false)}
                  className="px-3 py-1 rounded-xl bg-[#0c0c16]/95 backdrop-blur-md border border-indigo-500/60 shadow-[0_4px_20px_rgba(0,0,0,0.7)] text-indigo-300 hover:text-white text-[10px] font-bold flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                  title="Expand Floating Media Action Controls"
                >
                  <span>🎬 {isSecondaryToolbar ? "Win 2: " : "Win 1: "}{currentToolbarMedia.name}</span>
                  <span className="text-[9px] text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30">⚙️ Controls ▾</span>
                </button>
              </div>
            ) : (
              <>
                {/* Drag Handle */}
                <div
                  onMouseDown={handleStartDragToolbar}
                  className="cursor-grab active:cursor-grabbing px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white flex items-center gap-1 select-none text-[9.5px] font-mono border border-transparent hover:border-white/20 transition-all cursor-move"
                  title="Click and drag to move controls anywhere on the stage"
                >
                  <span className="text-[12px] leading-none">⠿</span>
                  <span>Drag</span>
                </div>

                {/* Dual Media Window Focus Selector */}
                {hasVisualMedia && hasSecondaryVisualMedia && activeMedia && secondaryMedia && (
                  <div className="flex items-center gap-0.5 bg-black/60 p-0.5 rounded-lg border border-white/15">
                    <button
                      type="button"
                      onClick={() => setFocusedMediaSlot("primary")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[9.5px] font-bold transition-all flex items-center gap-1",
                        focusedMediaSlot === "primary"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span>Win 1</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMediaMute();
                        }}
                        className="text-slate-300 hover:text-white"
                        title={activeMedia.isMuted ? "Unmute Win 1" : "Mute Win 1"}
                      >
                        {activeMedia.isMuted ? "🔇" : "🔊"}
                      </button>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFocusedMediaSlot("secondary")}
                      className={cn(
                        "px-2 py-0.5 rounded text-[9.5px] font-bold transition-all flex items-center gap-1",
                        focusedMediaSlot === "secondary"
                          ? "bg-emerald-600 text-white shadow"
                          : "text-slate-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span>Win 2</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSecondaryMediaMute();
                        }}
                        className="text-slate-300 hover:text-white"
                        title={secondaryMedia.isMuted ? "Unmute Win 2" : "Mute Win 2"}
                      >
                        {secondaryMedia.isMuted ? "🔇" : "🔊"}
                      </button>
                    </button>
                  </div>
                )}

                {mediaToolbarPos !== null && (
                  <button
                    type="button"
                    onClick={() => setMediaToolbarPos(null)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-400 hover:text-cyan-300 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                    title="Reset controls position to default"
                  >
                    ↺ Reset
                  </button>
                )}

                {/* Media Name Tag */}
                <span className="text-[10px] font-semibold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 max-w-[130px] truncate select-none">
                  🎬 {isSecondaryToolbar ? "Win 2: " : "Win 1: "}{currentToolbarMedia.name}
                </span>

                {/* Multi-Step Undo Button */}
                {mediaBoundsHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoMediaBounds}
                    className="px-2 py-0.5 hover:bg-white/15 rounded text-amber-300 hover:text-amber-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-amber-500/30"
                    title="Undo previous resize / position change"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}

                {/* Reset Media Pan & Zoom */}
                <button
                  type="button"
                  onClick={handleResetMediaTransform}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9.5px] text-slate-300 hover:text-white flex items-center gap-0.5 border border-white/10 cursor-pointer"
                  title="Reset Media Pan, Zoom & Crop"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                  <span>Reset Pan</span>
                </button>

                {/* Crop vs Fit Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleMediaCrop}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors cursor-pointer",
                    mediaFitMode === "cover"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                      : "bg-white/10 text-slate-300 border-white/20 hover:text-white"
                  )}
                  title={
                    mediaFitMode === "cover"
                      ? "Currently: Cropped (Fill) — Click to Fit 100%"
                      : "Currently: Fit — Click to Crop & Fill Window"
                  }
                >
                  <Crop className="w-3 h-3 text-amber-400" />
                  <span>{mediaFitMode === "cover" ? "Cropped (Fill)" : "Fit"}</span>
                </button>

                {/* Always-Visible Zoom Controls */}
                <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/15 px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={handleMediaZoomOut}
                    disabled={mediaZoom <= 1}
                    className="p-0.5 rounded text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3 text-cyan-400" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 min-w-[28px] text-center">
                    {Number(mediaZoom.toFixed(1))}x
                  </span>
                  <button
                    type="button"
                    onClick={handleMediaZoomIn}
                    disabled={mediaZoom >= 3}
                    className="p-0.5 rounded text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3 text-cyan-400" />
                  </button>
                </div>

                {/* ALWAYS-VISIBLE LEFT / MID / RIGHT / TOP / BTM PAN CONTROLS + HORIZONTAL L/R SLIDER FOR YOUTUBE & VIDEO */}
                <div className="flex items-center gap-1 bg-cyan-950/50 rounded-lg border border-cyan-500/40 px-1.5 py-0.5">
                  <span className="text-[9px] font-bold text-cyan-300 uppercase">Pan:</span>
                  <button
                    type="button"
                    onClick={() => handleMediaCropPreset("left")}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-colors cursor-pointer",
                      mediaPanX <= -15
                        ? "bg-cyan-500 text-slate-950 shadow"
                        : "bg-white/10 text-slate-200 hover:text-white"
                    )}
                    title="Pan Video to Left Side (Show Left)"
                  >
                    ◄ Left
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMediaCropPreset("center")}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-colors cursor-pointer",
                      Math.abs(mediaPanX) < 15 && Math.abs(mediaPanY) < 15
                        ? "bg-cyan-500 text-slate-950 shadow"
                        : "bg-white/10 text-slate-200 hover:text-white"
                    )}
                    title="Center Video Alignment"
                  >
                    Mid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMediaCropPreset("right")}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-colors cursor-pointer",
                      mediaPanX >= 15
                        ? "bg-cyan-500 text-slate-950 shadow"
                        : "bg-white/10 text-slate-200 hover:text-white"
                    )}
                    title="Pan Video to Right Side (Show Right)"
                  >
                    Right ►
                  </button>

                  {/* Smooth Horizontal Left <-> Right Slider */}
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={Math.round(mediaPanX)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const targetFit = mediaZoom > 1 ? mediaFitMode : "cover";
                      setTileTransform("active-media", {
                        fitMode: targetFit,
                        panX: val,
                      });
                    }}
                    className="w-16 h-1.5 accent-cyan-400 bg-white/20 rounded cursor-pointer"
                    title={`Horizontal Left/Right Pan: ${Math.round(objectPosX)}% (Slide Left or Right)`}
                  />

                  <span className="w-px h-3 bg-white/20 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => handleMediaCropPreset("top")}
                    className={cn(
                      "px-1 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer",
                      mediaPanY <= -15 ? "bg-amber-500/35 text-amber-200 font-bold" : "text-slate-300 hover:text-white"
                    )}
                    title="Pan Video to Top"
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMediaCropPreset("bottom")}
                    className={cn(
                      "px-1 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer",
                      mediaPanY >= 15 ? "bg-amber-500/35 text-amber-200 font-bold" : "text-slate-300 hover:text-white"
                    )}
                    title="Pan Video to Bottom"
                  >
                    Btm
                  </button>
                </div>

                {/* Mirror Video Button */}
                <button
                  type="button"
                  onClick={() =>
                    setFairUseConfig({
                      mirrorMediaVideo: !fairUseConfig?.mirrorMediaVideo,
                    })
                  }
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer",
                    fairUseConfig?.mirrorMediaVideo
                      ? "bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold"
                      : "bg-white/10 text-slate-300 border-white/20 hover:text-white"
                  )}
                  title="Mirror / Flip Video Horizontally"
                >
                  <span>Mirror</span>
                </button>

                {/* VIDEO & YOUTUBE TRANSPORT CONTROLS (ALWAYS VISIBLE & DRAGGABLE TOGETHER!) */}
                {(currentToolbarMedia.type === "video" || currentToolbarMedia.type === "youtube") && (
                  <div className="flex items-center gap-1 bg-[#10121e]/90 border border-indigo-400/40 rounded-lg px-2 py-0.5 shadow">
                    {/* Instant 30s Clip Button */}
                    <button
                      type="button"
                      onClick={handleQuickClipFromTransport}
                      className="px-1.5 py-0.5 rounded bg-rose-600/90 hover:bg-rose-500 text-white text-[9px] font-bold flex items-center gap-1 shrink-0 shadow cursor-pointer"
                      title="Extract 30s Highlight Clip around current timestamp to Media Library"
                    >
                      <Scissors className="w-2.5 h-2.5" />
                      <span>Clip</span>
                    </button>

                    {/* Play / Pause */}
                    <button
                      type="button"
                      onClick={handleToggleMediaPlayPause}
                      className="w-5 h-5 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow cursor-pointer"
                      title={isMediaPaused ? "Play Video" : "Pause Video"}
                    >
                      {isMediaPaused ? <Play className="w-2.5 h-2.5 fill-current ml-0.5" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
                    </button>

                    {/* Rewind -10s / Forward +10s */}
                    <button
                      type="button"
                      onClick={(e) => handleSkipMediaSeconds(-10, e)}
                      className="px-1 py-0.2 rounded bg-white/10 hover:bg-white/20 text-[8.5px] font-mono text-slate-300 hover:text-white shrink-0 cursor-pointer"
                      title="Rewind 10 seconds"
                    >
                      -10s
                    </button>

                    {/* Timeline Seekbar with Clean Duration */}
                    <span className="text-[9px] font-mono text-cyan-300 shrink-0">
                      {formatMediaTime(mediaCurrentTime)} / {formattedTotalDuration}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(
                        1,
                        Number.isFinite(mediaDuration) && mediaDuration > 0 && mediaDuration < 86400 * 3
                          ? mediaDuration
                          : currentToolbarMedia.durationSeconds || 300
                      )}
                      step={0.5}
                      value={Math.min(
                        mediaCurrentTime,
                        Math.max(
                          1,
                          Number.isFinite(mediaDuration) && mediaDuration > 0 && mediaDuration < 86400 * 3
                            ? mediaDuration
                            : currentToolbarMedia.durationSeconds || 300
                        )
                      )}
                      onChange={(e) => handleSeekMedia(Number(e.target.value))}
                      className="w-20 h-1 accent-indigo-500 bg-white/20 rounded cursor-pointer"
                      title="Seek video timeline"
                    />

                    <button
                      type="button"
                      onClick={(e) => handleSkipMediaSeconds(10, e)}
                      className="px-1 py-0.2 rounded bg-white/10 hover:bg-white/20 text-[8.5px] font-mono text-slate-300 hover:text-white shrink-0 cursor-pointer"
                      title="Forward 10 seconds"
                    >
                      +10s
                    </button>

                    {/* Playback Speed Selector (Direct execution) */}
                    <select
                      value={String(currentToolbarMedia.playbackRate || (fairUseConfig?.enabled ? (fairUseConfig?.playbackRate || 1.04) : 1))}
                      onChange={(e) => handleChangeMediaSpeed(Number(e.target.value))}
                      className="bg-slate-900 border border-white/20 rounded px-1 py-0.2 text-[9px] font-mono text-slate-200 focus:outline-none shrink-0 cursor-pointer"
                      title="Playback Speed"
                    >
                      <option value="0.75">0.75x</option>
                      <option value="1">1.0x</option>
                      <option value="1.04">1.04x Safe</option>
                      <option value="1.15">1.15x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2">2.0x</option>
                    </select>

                    {/* Volume Control */}
                    <button
                      type="button"
                      onClick={() => (isSecondaryToolbar ? toggleSecondaryMediaMute() : toggleMediaMute())}
                      className="text-slate-300 hover:text-white shrink-0 ml-0.5 cursor-pointer"
                      title={(isSecondaryToolbar ? secondaryMedia?.isMuted : activeMedia?.isMuted) ? "Unmute Video" : "Mute Video"}
                    >
                      {(isSecondaryToolbar ? secondaryMedia?.isMuted : activeMedia?.isMuted) || (isSecondaryToolbar ? (secondaryMedia?.volume === 0) : normalizedMediaVolumePct === 0) ? (
                        <VolumeX className="w-3 h-3 text-rose-400" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-emerald-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={5}
                      value={
                        isSecondaryToolbar
                          ? (secondaryMedia?.isMuted ? 0 : (secondaryMedia?.volume ?? 100))
                          : (activeMedia?.isMuted ? 0 : normalizedMediaVolumePct)
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (isSecondaryToolbar) setSecondaryMediaVolume(val);
                        else setMediaVolume(val);
                      }}
                      className="w-10 h-1 accent-emerald-400 bg-white/20 rounded cursor-pointer shrink-0"
                      title={`Media Volume: ${isSecondaryToolbar ? (secondaryMedia?.volume ?? 100) : normalizedMediaVolumePct}%`}
                    />

                    {/* Loop Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isSecondaryToolbar && secondaryMedia) {
                          setSecondaryMedia({ ...secondaryMedia, loop: !(secondaryMedia.loop ?? true) });
                        } else if (activeMedia) {
                          setActiveMedia({ ...activeMedia, loop: !(activeMedia.loop ?? true) });
                        }
                      }}
                      className={cn(
                        "p-0.5 rounded border transition-colors shrink-0 cursor-pointer",
                        (currentToolbarMedia.loop ?? true)
                          ? "bg-indigo-600/40 border-indigo-400 text-indigo-200"
                          : "bg-white/5 border-white/10 text-slate-400"
                      )}
                      title="Toggle Loop"
                    >
                      <Repeat className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* Fair-Use Safe Mode Master Button */}
                <button
                  type="button"
                  onClick={() => setFairUseConfig({ enabled: !fairUseConfig.enabled })}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer",
                    fairUseConfig?.enabled
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                      : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
                  )}
                  title="Toggle YouTube Fair-Use & Anti-Content-ID Safe Mode"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Fair-Use {fairUseConfig?.enabled ? "ON" : "OFF"}</span>
                </button>

                {fairUseConfig?.enabled && (
                  <>
                    <div className="flex items-center gap-0.5 bg-amber-950/30 border border-amber-500/40 rounded px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setFairUseConfig({
                            zoomBreathing: !(fairUseConfig?.zoomBreathing ?? true),
                          })
                        }
                        className={cn(
                          "px-1 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                          (fairUseConfig?.zoomBreathing ?? true)
                            ? "text-amber-300 font-bold"
                            : "text-slate-400 hover:text-white"
                        )}
                        title="Toggle Zoom Breathing"
                      >
                        Breath {(fairUseConfig?.zoomBreathing ?? true) ? "ON" : "OFF"}
                      </button>
                    </div>

                    {((activeMedia?.type === "video" || activeMedia?.type === "youtube") || (secondaryMedia?.type === "video" || secondaryMedia?.type === "youtube")) && (
                      <button
                        type="button"
                        onClick={() => {
                          const isCurrentlyOn = Boolean(
                            (fairUseConfig?.dynamicTempoVariance ?? true) &&
                            (fairUseConfig?.audioEqProtection ?? true)
                          );
                          const nextState = !isCurrentlyOn;
                          const nextRate = nextState ? 1.06 : 1.0;

                          setFairUseConfig({
                            dynamicTempoVariance: nextState,
                            audioEqProtection: nextState,
                            enableAudioFairUse: nextState,
                            playbackRate: nextRate,
                          });

                          handleChangeMediaPitch(nextRate, nextState);
                          stageBroadcaster.ensureAudioContext();
                          stageBroadcaster.refreshAudioConnections();
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer",
                          (fairUseConfig?.dynamicTempoVariance ?? true) &&
                            (fairUseConfig?.audioEqProtection ?? true)
                            ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 font-bold"
                            : "bg-white/10 text-slate-400 border-white/15 hover:text-white"
                        )}
                        title="Audio Tempo LFO + Spectral Formant EQ Protection"
                      >
                        <span>
                          🎵 Tempo+EQ{" "}
                          {(fairUseConfig?.dynamicTempoVariance ?? true) &&
                            (fairUseConfig?.audioEqProtection ?? true)
                            ? "ON"
                            : "OFF"}
                        </span>
                      </button>
                    )}

                    {/* Interactive Real-Time Pitch Shift Selector */}
                    <select
                      value={
                        fairUseConfig?.enableAudioFairUse === false
                          ? "1.0-normal"
                          : fairUseConfig?.playbackRate === 1.08
                          ? "1.08-high"
                          : fairUseConfig?.playbackRate === 0.95
                          ? "0.95-deep"
                          : "1.04-safe"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "1.0-normal") {
                          handleChangeMediaPitch(1.0, false);
                        } else if (val === "1.08-high") {
                          handleChangeMediaPitch(1.08, true);
                        } else if (val === "0.95-deep") {
                          handleChangeMediaPitch(0.95, true);
                        } else {
                          handleChangeMediaPitch(1.04, true);
                        }
                        stageBroadcaster.ensureAudioContext();
                        stageBroadcaster.refreshAudioConnections();
                      }}
                      className="bg-slate-900 border border-amber-500/40 rounded px-1.5 py-0.5 text-[9.5px] font-bold text-amber-300 focus:outline-none cursor-pointer"
                      title="Real-time Audio Pitch Shift (prevents audio content-ID match)"
                    >
                      <option value="1.0-normal">🎵 1.0x Normal</option>
                      <option value="1.04-safe">🎵 1.04x Safe Pitch (+0.7st)</option>
                      <option value="1.08-high">🎵 1.08x High Pitch (+1.3st)</option>
                      <option value="0.95-deep">🎵 0.95x Deep Pitch (-0.9st)</option>
                    </select>

                    {/* Vintage Lines Toggle + Refined Thickness Selector */}
                    <div className="flex items-center gap-0.5 bg-emerald-950/30 border border-emerald-500/40 rounded px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setFairUseConfig({
                            vintageLinesOverlay: !(fairUseConfig?.vintageLinesOverlay ?? true),
                          })
                        }
                        className={cn(
                          "px-1 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                          (fairUseConfig?.vintageLinesOverlay ?? true)
                            ? "text-emerald-300 font-bold"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Lines {(fairUseConfig?.vintageLinesOverlay ?? true) ? "ON" : "OFF"}
                      </button>
                      {(fairUseConfig?.vintageLinesOverlay ?? true) && (
                        <select
                          value={fairUseConfig?.vintageLinesIntensity || "medium"}
                          onChange={(e) =>
                            setFairUseConfig({
                              vintageLinesIntensity: e.target.value as "light" | "medium" | "strong",
                            })
                          }
                          className="bg-slate-900 border border-emerald-500/30 rounded px-1 py-0 text-[9px] text-emerald-200 font-mono focus:outline-none cursor-pointer"
                          title="35mm Vintage Hairline Thickness"
                        >
                          <option value="light">Light 0.8px</option>
                          <option value="medium">Medium 1.4px</option>
                          <option value="strong">Strong 2.1px</option>
                        </select>
                      )}
                    </div>

                    {/* Film Grain Toggle + Intensity Selector */}
                    <div className="flex items-center gap-0.5 bg-amber-950/30 border border-amber-500/40 rounded px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setFairUseConfig({
                            filmGrainOverlay: !(fairUseConfig?.filmGrainOverlay ?? true),
                          })
                        }
                        className={cn(
                          "px-1 rounded text-[10px] font-semibold transition-colors cursor-pointer",
                          (fairUseConfig?.filmGrainOverlay ?? true)
                            ? "text-amber-300 font-bold"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Grain {(fairUseConfig?.filmGrainOverlay ?? true) ? "ON" : "OFF"}
                      </button>
                      {(fairUseConfig?.filmGrainOverlay ?? true) && (
                        <select
                          value={fairUseConfig?.grainIntensity || "random"}
                          onChange={(e) =>
                            setFairUseConfig({
                              grainIntensity: e.target.value as "light" | "medium" | "strong" | "random",
                            })
                          }
                          className="bg-slate-900 border border-amber-500/30 rounded px-1 py-0 text-[9px] text-amber-200 font-mono focus:outline-none cursor-pointer"
                        >
                          <option value="random">🎲 Random</option>
                          <option value="light">Light</option>
                          <option value="medium">Medium</option>
                          <option value="strong">Strong</option>
                        </select>
                      )}
                    </div>

                    {/* 8-12s Skip Selector */}
                    <select
                      value={`${fairUseConfig?.autoPauseIntervalSec ?? 8}:${fairUseConfig?.antiMatchMode || "jerk-skip"}`}
                      onChange={(e) => {
                        const [sec, mode] = e.target.value.split(":");
                        setFairUseConfig({
                          autoPauseIntervalSec: Number(sec),
                          antiMatchMode: (mode as any) || "jerk-skip",
                        });
                      }}
                      className="bg-slate-900 border border-rose-500/40 rounded px-1.5 py-0.5 text-[9.5px] text-rose-300 font-mono focus:outline-none cursor-pointer"
                      title="Anti-Content ID Jerk / Frame-Skip Mode"
                    >
                      <option value="0:jerk-skip">Skip OFF</option>
                      <option value="8:jerk-skip">⚡ 8-12s Skip ON</option>
                      <option value="8:micro-pause">8-12s Micro-Pause</option>
                      <option value="10:pause">10s Full Pause</option>
                    </select>
                  </>
                )}

                {/* Quick Media Window Resize Presets */}
                <div className="flex items-center gap-0.5 bg-indigo-950/70 border border-indigo-400/40 rounded-lg px-1.5 py-0.5">
                  <span className="text-[9px] font-bold text-indigo-300 uppercase mr-0.5">Size:</span>
                  {[
                    {
                      label: "25% PiP",
                      w: 28,
                      h: 30,
                      x: mediaSlotIndex === 0 ? 3 : 69,
                      y: showTicker ? 58 : 64,
                      z: 30,
                    },
                    {
                      label: "50% Half",
                      w: 50,
                      h: 100,
                      x: mediaSlotIndex >= 1 ? 50 : 0,
                      y: 0,
                      z: 20,
                    },
                    {
                      label: "75% Large",
                      w: 75,
                      h: 100,
                      x: 0,
                      y: 0,
                      z: 20,
                    },
                    {
                      label: "100% Full",
                      w: 100,
                      h: 100,
                      x: 0,
                      y: 0,
                      z: 20,
                    },
                  ].map((sz) => (
                    <button
                      key={sz.label}
                      type="button"
                      onClick={() =>
                        handleApplyMediaSizePreset({
                          x: sz.x,
                          y: sz.y,
                          width: sz.w,
                          height: sz.h,
                          zIndex: sz.z,
                          isLockedRatio: false,
                        })
                      }
                      className={cn(
                        "px-1.5 py-0.2 rounded text-[9.5px] font-bold transition-colors cursor-pointer",
                        customMediaBounds && Math.abs(mediaBounds.width - sz.w) <= 3
                          ? "bg-indigo-500 text-white shadow"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {sz.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleResetMediaBoundsToSlot}
                    className={cn(
                      "px-1.5 py-0.2 rounded text-[9.5px] font-bold transition-colors ml-0.5 cursor-pointer",
                      !customMediaBounds
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200"
                    )}
                    title="Fit Media to Default Scene Slot"
                  >
                    Fit Slot
                  </button>
                </div>

                {/* Host ⇄ Media Swap Position Controls */}
                {totalPlannedSlots >= 1 && !isSoloOrCinema && (
                  <div className="flex items-center gap-1 bg-indigo-950/90 border border-indigo-400/60 rounded-lg px-1.5 py-0.5 shadow">
                    <button
                      type="button"
                      onClick={handleSwapMediaAndHostPosition}
                      className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[9.5px] flex items-center gap-1 shadow transition-all cursor-pointer"
                      title="1-Click Swap: Shift Media Left/Right & Move Host to Opposite Side!"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>
                        {mediaSlotIndex === 0
                          ? "Shift Right (Host Left)"
                          : "Shift Left (Host Right)"}
                      </span>
                    </button>

                    <select
                      value={mediaSlotIndex}
                      onChange={(e) => setMediaSlotIndex(Number(e.target.value))}
                      className="bg-slate-900 border border-white/15 rounded px-1 py-0.2 text-[9.5px] font-bold text-white focus:outline-none cursor-pointer"
                      title="Choose Media & Host Slot Position"
                    >
                      {activeLayout === "cropped" ||
                        activeLayout === "podcast" ||
                        activeLayout === "side-by-side" ||
                        activeLayout === "fit" ||
                        activeLayout === "interview" ? (
                        <>
                          <option value={0} className="bg-slate-900">
                            ◧ Media Left (Host Right)
                          </option>
                          <option value={1} className="bg-slate-900">
                            ◨ Media Right (Host Left)
                          </option>
                        </>
                      ) : activeLayout === "three-equal" && totalPlannedSlots >= 2 ? (
                        <>
                          <option value={0} className="bg-slate-900">◧ Left Col</option>
                          <option value={1} className="bg-slate-900">⫿ Middle Col</option>
                          <option value={2} className="bg-slate-900">◨ Right Col</option>
                        </>
                      ) : activeLayout === "four-grid" && totalPlannedSlots >= 3 ? (
                        <>
                          <option value={0} className="bg-slate-900">↖ Top-Left</option>
                          <option value={1} className="bg-slate-900">↗ Top-Right</option>
                          <option value={2} className="bg-slate-900">↙ Bottom-Left</option>
                          <option value={3} className="bg-slate-900">↘ Bottom-Right</option>
                        </>
                      ) : activeLayout === "speaker-large" || activeLayout === "screen-speaker" ? (
                        <>
                          <option value={0} className="bg-slate-900">★ Hero Left (Host Right)</option>
                          <option value={1} className="bg-slate-900">▤ Side Right (Host Left)</option>
                          {totalPlannedSlots >= 2 && (
                            <option value={2} className="bg-slate-900">▤ Side Btm-Right</option>
                          )}
                        </>
                      ) : activeLayout === "stacked" || activeLayout === "presentation" ? (
                        <>
                          <option value={0} className="bg-slate-900">⬆ Media Top (Host Bottom)</option>
                          <option value={1} className="bg-slate-900">⬇ Media Bottom (Host Top)</option>
                        </>
                      ) : (
                        Array.from({ length: totalPlannedSlots + 1 }).map((_, sIdx) => (
                          <option key={sIdx} value={sIdx} className="bg-slate-900">
                            Slot {sIdx + 1}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {/* 1-Click Solo / Restore Media Button */}
                <button
                  type="button"
                  onClick={() => toggleSoloParticipant("active-media")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer",
                    soloTargetId === "active-media"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md"
                      : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/20"
                  )}
                  title="Solo Media Fullscreen"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>{soloTargetId === "active-media" ? "Un-Solo" : "Solo"}</span>
                </button>

                {/* Replace Media */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentToolbarMedia.type === "youtube") {
                      setIsYouTubeModalOpen(true);
                    } else if (currentToolbarMedia.type === "map") {
                      setIsTacticalMapModalOpen(true);
                    } else if (currentToolbarMedia.type === "website") {
                      setIsWebsiteModalOpen(true);
                    } else {
                      window.dispatchEvent(new CustomEvent("livestudio-open-tab", { detail: "media" }));
                    }
                  }}
                  className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Replace or Edit Media"
                >
                  <MonitorUp className="w-3 h-3 text-emerald-400" />
                  <span>Replace</span>
                </button>

                {/* Stop / Remove Media */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSecondaryToolbar) {
                      resetParticipantBounds("secondary-media");
                      setSecondaryMedia(null);
                    } else {
                      resetParticipantBounds("active-media");
                      setActiveMedia(null);
                    }
                  }}
                  className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Remove Media from Stage"
                >
                  Remove
                </button>

                {/* Minimize / Collapse Toolbar Button */}
                <button
                  type="button"
                  onClick={() => setIsMediaToolbarCollapsed(true)}
                  className="px-1.5 py-0.5 hover:bg-white/15 rounded text-slate-400 hover:text-white text-[9.5px] font-bold border border-white/10 transition-colors cursor-pointer"
                  title="Minimize Media Action Controls"
                >
                  ✕
                </button>
              </>
            )}
          </div>
          );
        })()}

        {/* Participant Tiles */}
        {orderedParticipants.map((p, idx) => {
          const calculatedBounds =
            stageLayoutResult.participantBounds[idx] ||
            getDefaultSlotBounds(
              activeLayout,
              idx,
              totalPlannedSlots,
              layoutSplitRatio,
              customLayoutConfig,
              isStageCropped
            );
          const isPip = activeLayout === "pip" || customLayoutConfig.mode === "pip";
          const bounds: ParticipantBounds =
            isPip && participantBounds[p.id] ? participantBounds[p.id] : calculatedBounds;
          if (
            bounds.width <= 0 ||
            bounds.height <= 0 ||
            (bounds.zIndex !== undefined && bounds.zIndex < 0)
          ) {
            return null;
          }
          const isSelected = String(selectedParticipantId) === String(p.id);
          const isThisDragging = activeDragState?.participantId === p.id;
          const isFloatingPipTile = (bounds.zIndex || 10) >= 25 && bounds.width < 50 && bounds.height < 50;
          const tileIsFullBleed = isFullBleedLayout && !isFloatingPipTile;

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${bounds.x}%`,
                top: `${bounds.y}%`,
                width: `${bounds.width}%`,
                height: `${bounds.height}%`,
                zIndex: isSelected ? 35 : (bounds.zIndex || 10),
                padding:
                  !tileIsFullBleed && activeLayout === "custom" && customLayoutConfig?.gap !== undefined
                    ? `${customLayoutConfig.gap / 2}px`
                    : undefined,
                transition: isThisDragging
                  ? "none"
                  : "left 0.22s ease-out, top 0.22s ease-out, width 0.22s ease-out, height 0.22s ease-out",
              }}
              onMouseDown={(e) => handleTileMouseDown(e, p, bounds)}
              onTouchStart={(e) => handleTileTouchStart(e, p, bounds)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedParticipantId(p.id);
              }}
              className={cn(
                "overflow-visible select-none",
                newlyAddedParticipantIds.includes(String(p.id)) && "animate-in fade-in zoom-in-95 duration-300",
                isSelected
                  ? cn(
                    "ring-2 ring-indigo-500",
                    tileIsFullBleed ? "rounded-none ring-inset" : "rounded-2xl",
                    "shadow-[0_0_25px_rgba(99,102,241,0.5)]",
                    isPipMode ? "cursor-move" : "cursor-pointer"
                  )
                  : "cursor-pointer"
              )}
            >
              {/* Inner Video Container */}
              <div
                className={cn(
                  "w-full h-full overflow-hidden relative pointer-events-auto transition-all",
                  tileIsFullBleed
                    ? isSelected
                      ? "border border-indigo-400 rounded-none bg-[#0c0c14]"
                      : "border-0 rounded-none bg-[#0c0c14]"
                    : cn(
                      "border rounded-2xl bg-[#0c0c14]",
                      isSelected
                        ? "border-indigo-400"
                        : "border-white/15 hover:border-indigo-400/50 shadow-xl"
                    )
                )}
                style={{
                  borderRadius: tileIsFullBleed
                    ? "0px"
                    : activeLayout === "custom" && customLayoutConfig?.borderRadius !== undefined
                      ? `${customLayoutConfig.borderRadius}px`
                      : undefined,
                  boxShadow:
                    activeLayout === "custom" && customLayoutConfig?.showSpeakerBorder && p.isSpeaking
                      ? `0 0 20px ${customLayoutConfig.highlightColor || "#6366f1"}`
                      : undefined,
                  borderColor:
                    activeLayout === "custom" && customLayoutConfig?.showSpeakerBorder && p.isSpeaking
                      ? customLayoutConfig.highlightColor || "#6366f1"
                      : undefined,
                }}
              >
                {renderTile(p, idx, "w-full h-full")}
              </div>

              {/* StreamYard Floating Action Pill Toolbar for Selected Participant / Host */}
              {isSelected && (
                <div
                  className={cn(
                    "absolute z-50 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0c0c16]/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-indigo-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.85)] pointer-events-auto whitespace-nowrap animate-in fade-in duration-150 max-w-[calc(100%-12px)] overflow-x-auto scrollbar-none",
                    bounds.height >= 85 || bounds.y < 12 ? "top-3" : "-top-11"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {/* Participant Name Tag */}
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded bg-white/10 max-w-[105px] truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {p.name || "Host"}
                  </span>

                  {/* Mic Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleParticipantMic(p.id)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors cursor-pointer",
                      p.micOn
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                    )}
                  >
                    {p.micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                    <span>{p.micOn ? "Mic ON" : "Muted"}</span>
                  </button>

                  {/* SHIFT HOST LEFT / RIGHT (Always visible when Media is on stage, even with 1 Host!) */}
                  {hasVisualMedia && !isSoloOrCinema && (
                    <button
                      type="button"
                      onClick={handleSwapMediaAndHostPosition}
                      className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[10px] flex items-center gap-1 shadow transition-all cursor-pointer"
                      title="Shift Host Left / Right (Swap position with Media window)"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>
                        {bounds.x < 35 ? "Shift Host Right ►" : "◄ Shift Host Left"}
                      </span>
                    </button>
                  )}

                  {/* Swap Participant Slot Order (when 2+ Participants are on stage) */}
                  {orderedParticipants.length >= 2 && (
                    <div className="flex items-center gap-0.5 bg-white/10 rounded-lg border border-white/15 px-1 py-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveParticipantOrder(p.id, "left")}
                        className="px-1 text-[10px] font-bold text-cyan-300 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Left / Up"
                      >
                        ◄
                      </button>
                      <span className="text-[9px] text-slate-300 font-mono px-0.5">Slot {idx + 1}</span>
                      <button
                        type="button"
                        disabled={idx === orderedParticipants.length - 1}
                        onClick={() => moveParticipantOrder(p.id, "right")}
                        className="px-1 text-[10px] font-bold text-cyan-300 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Right / Down"
                      >
                        ►
                      </button>
                    </div>
                  )}

                  {/* 1-Click Solo / Restore Layout Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSoloParticipant(p.id)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer",
                      String(soloTargetId) === String(p.id)
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md"
                        : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/20"
                    )}
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>{String(soloTargetId) === String(p.id) ? "Un-Solo" : "Solo"}</span>
                  </button>

                  {/* Spotlight / Hero Speaker Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (customLayoutConfig.heroParticipantId === p.id) {
                        setCustomLayoutConfig({ ...customLayoutConfig, heroParticipantId: undefined });
                      } else {
                        setCustomLayoutConfig({ ...customLayoutConfig, heroParticipantId: p.id, mode: "hero-side" });
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors",
                      customLayoutConfig.heroParticipantId === p.id
                        ? "bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold"
                        : "bg-white/10 text-slate-300 border-white/15 hover:bg-white/20 hover:text-white"
                    )}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{customLayoutConfig.heroParticipantId === p.id ? "Spotlighted" : "Spotlight"}</span>
                  </button>

                  {/* Fit vs Fill Frame Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const curFit = (tileTransforms[p.id]?.fitMode as "contain" | "cover") || "cover";
                      setTileTransform(p.id, { fitMode: curFit === "cover" ? "contain" : "cover" });
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors",
                      (tileTransforms[p.id]?.fitMode || "cover") === "contain"
                        ? "bg-indigo-500/25 text-indigo-300 border-indigo-500/50"
                        : "bg-white/10 text-slate-300 border-white/15 hover:bg-white/20 hover:text-white"
                    )}
                  >
                    <Crop className="w-3 h-3 text-indigo-400" />
                    <span>{(tileTransforms[p.id]?.fitMode || "cover") === "contain" ? "Fit (16:9)" : "Fill"}</span>
                  </button>

                  {isPipMode && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentPos = customLayoutConfig.pipPosition || "bottom-right";
                        const nextPos: CustomLayoutConfig["pipPosition"] =
                          currentPos === "bottom-right"
                            ? "bottom-left"
                            : currentPos === "bottom-left"
                              ? "top-left"
                              : currentPos === "top-left"
                                ? "top-right"
                                : "bottom-right";
                        setCustomLayoutConfig({ pipPosition: nextPos });
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 flex items-center gap-1 transition-colors"
                    >
                      <Move className="w-3 h-3 text-slate-300" />
                      <span>Corner</span>
                    </button>
                  )}

                  {participantBounds[p.id] && (
                    <button
                      type="button"
                      onClick={() => resetParticipantBounds(p.id)}
                      className="px-2 py-0.5 hover:bg-white/15 rounded text-amber-300 hover:text-amber-200 text-[10px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Reset</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedParticipantId(null)}
                    className="p-1 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* StreamYard Ghost / Placeholder Slots */}
        {allowGhostSlots && totalGhostSlots > 0 && (
          <>
            {Array.from({ length: totalGhostSlots }).map((_, i) => {
              const slotIdx = orderedParticipants.length + i;
              const emptySlotBounds =
                stageLayoutResult.participantBounds[slotIdx] ||
                getDefaultSlotBounds(
                  activeLayout,
                  slotIdx,
                  totalPlannedSlots,
                  layoutSplitRatio,
                  customLayoutConfig,
                  isStageCropped
                );
              const isCopied = copiedSlotIndex === slotIdx;
              const slotTitle =
                activeLayout === "presentation"
                  ? "Slide Deck / Screen Slot"
                  : `Guest Slot ${slotIdx + 1}`;

              return (
                <div
                  key={`empty-guest-slot-${slotIdx}`}
                  style={{
                    position: "absolute",
                    left: `${emptySlotBounds.x}%`,
                    top: `${emptySlotBounds.y}%`,
                    width: `${emptySlotBounds.width}%`,
                    height: `${emptySlotBounds.height}%`,
                    zIndex: 5,
                    padding:
                      !isFullBleedLayout && activeLayout === "custom" && customLayoutConfig?.gap !== undefined
                        ? `${customLayoutConfig.gap / 2}px`
                        : undefined,
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  className="select-none pointer-events-auto"
                >
                  <div
                    style={{
                      borderRadius: isFullBleedLayout
                        ? "0px"
                        : activeLayout === "custom" && customLayoutConfig?.borderRadius !== undefined
                          ? `${customLayoutConfig.borderRadius}px`
                          : undefined,
                    }}
                    className={cn(
                      "w-full h-full flex flex-col items-center justify-center p-4 text-center transition-all group",
                      isFullBleedLayout
                        ? "rounded-none border-2 border-dashed border-indigo-500/40 bg-[#0c0c16]/90 hover:border-indigo-400 hover:bg-[#121324]"
                        : "rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-950/10 backdrop-blur-xs"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:border-indigo-400/60 group-hover:bg-indigo-500/20 transition-all text-slate-400 group-hover:text-indigo-300">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                      {slotTitle}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 max-w-[160px] line-clamp-1">
                      Waiting for participant to join
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyInviteForSlot(slotIdx);
                      }}
                      className={cn(
                        "mt-2.5 px-3 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95",
                        isCopied
                          ? "bg-emerald-600 text-white shadow-emerald-500/30"
                          : "bg-indigo-600/80 hover:bg-indigo-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40"
                      )}
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? "Copied! ✓" : "Invite Guest"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* StreamYard Responsive Stage Split Dividers */}
        {((hasVisualMedia && totalPlannedSlots >= 1) || orderedParticipants.length >= 2) && (() => {
          const isVerticalSplit =
            activeLayout === "side-by-side" ||
            activeLayout === "fit" ||
            activeLayout === "cropped" ||
            activeLayout === "podcast" ||
            activeLayout === "interview" ||
            activeLayout === "speaker-large" ||
            activeLayout === "screen-speaker" ||
            activeLayout === "three-equal" ||
            activeLayout === "four-grid" ||
            (activeLayout === "custom" &&
              (customLayoutConfig?.mode === "side-by-side" ||
                customLayoutConfig?.mode === "fit" ||
                customLayoutConfig?.mode === "cropped" ||
                customLayoutConfig?.mode === "podcast" ||
                customLayoutConfig?.mode === "hero-side" ||
                customLayoutConfig?.mode === "three-equal"));

          const isHorizontalSplit =
            activeLayout === "stacked" ||
            activeLayout === "presentation" ||
            (activeLayout === "custom" &&
              (customLayoutConfig?.mode === "stacked" || customLayoutConfig?.mode === "hero-bottom"));

          const isThreeCol = activeLayout === "three-equal" || (activeLayout === "custom" && customLayoutConfig?.mode === "three-equal");
          const isCustom3Split = layoutSplitRatio !== 50 && layoutSplitRatio !== 33 && layoutSplitRatio !== 65;
          const dividerLeftPct = isThreeCol
            ? isCustom3Split
              ? Math.max(20, Math.min(58, layoutSplitRatio))
              : 33.33
            : layoutSplitRatio;

          if (isVerticalSplit) {
            return (
              <div
                style={{ left: `${dividerLeftPct}%` }}
                className="absolute top-1 bottom-1 -ml-3 w-6 flex items-center justify-center cursor-col-resize select-none group/divider z-30 pointer-events-auto"
                onMouseDown={(e) => handleSplitDividerMouseDown(e, "vertical")}
                onTouchStart={(e) => handleSplitDividerTouchStart(e, "vertical")}
                title={`Drag to resize stage split (${dividerLeftPct}% / ${Number((100 - dividerLeftPct).toFixed(1))}%)`}
              >
                <div className="w-1 h-full rounded-full bg-white/20 group-hover/divider:bg-indigo-400 group-hover/divider:w-1.5 transition-all shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <div className="absolute w-5 h-9 rounded-full bg-black/90 border border-white/25 flex flex-col items-center justify-center gap-0.5 shadow-2xl group-hover/divider:border-indigo-400 group-hover/divider:scale-110 group-hover/divider:bg-indigo-950 transition-all">
                  <span className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
                  <span className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
                </div>
              </div>
            );
          }

          if (isHorizontalSplit) {
            return (
              <div
                style={{ top: `${layoutSplitRatio}%` }}
                className="absolute left-1 right-1 -mt-3 h-6 flex items-center justify-center cursor-row-resize select-none group/divider z-30 pointer-events-auto"
                onMouseDown={(e) => handleSplitDividerMouseDown(e, "horizontal")}
                onTouchStart={(e) => handleSplitDividerTouchStart(e, "horizontal")}
                title={`Drag to resize stage split (${layoutSplitRatio}% top / ${100 - layoutSplitRatio}% bottom)`}
              >
                <div className="h-1 w-full rounded-full bg-white/20 group-hover/divider:bg-indigo-400 group-hover/divider:h-1.5 transition-all shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <div className="absolute h-5 w-9 rounded-full bg-black/90 border border-white/25 flex items-center justify-center gap-0.5 shadow-2xl group-hover/divider:border-indigo-400 group-hover/divider:scale-110 group-hover/divider:bg-indigo-950 transition-all">
                  <span className="h-2.5 w-0.5 bg-slate-300 rounded-full" />
                  <span className="h-2.5 w-0.5 bg-slate-300 rounded-full" />
                </div>
              </div>
            );
          }

          return null;
        })()}
      </div>
    );
  };

  const isVideoBg = Boolean(
    activeBackgroundUrl &&
    (activeBackgroundType === "video" ||
      activeBackgroundUrl.endsWith(".mp4") ||
      activeBackgroundUrl.endsWith(".webm") ||
      activeBackgroundUrl.includes("mixkit") ||
      activeBackgroundUrl.includes("video"))
  );

  return (
    <div ref={outerStageWrapperRef} className="w-full h-full flex items-center justify-center overflow-hidden p-1 sm:p-2">
      <div
        ref={stageContainerRef}
        id="livestudio-stage-container"
        onClick={() => setSelectedParticipantId(null)}
        onDragOver={(e) => {
          if (
            e.dataTransfer.types.includes("application/x-livestudio-media") ||
            e.dataTransfer.types.includes("text/plain")
          ) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            if (!isMediaDragOverStage) setIsMediaDragOverStage(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsMediaDragOverStage(false);
          }
        }}
        onDrop={(e) => {
          setIsMediaDragOverStage(false);
          const rawMedia =
            e.dataTransfer.getData("application/x-livestudio-media") ||
            e.dataTransfer.getData("text/plain");
          if (!rawMedia) return;
          try {
            const parsed = JSON.parse(rawMedia);
            const mediaItem =
              parsed?.type === "livestudio-media"
                ? parsed.media
                : parsed?.id && parsed?.url
                  ? parsed
                  : null;
            if (mediaItem && mediaItem.id && mediaItem.url) {
              e.preventDefault();
              e.stopPropagation();
              if (
                stageContainerRef.current &&
                totalPlannedSlots >= 1 &&
                !isSoloOrCinema &&
                mediaItem.type !== "audio"
              ) {
                const rect = stageContainerRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  const pctX = ((e.clientX - rect.left) / rect.width) * 100;
                  const pctY = ((e.clientY - rect.top) / rect.height) * 100;
                  if (
                    activeLayout === "cropped" ||
                    activeLayout === "podcast" ||
                    activeLayout === "side-by-side" ||
                    activeLayout === "fit" ||
                    activeLayout === "interview"
                  ) {
                    setMediaSlotIndex(pctX >= (layoutSplitRatio || 50) ? 1 : 0);
                  } else if (activeLayout === "stacked" || activeLayout === "presentation") {
                    setMediaSlotIndex(pctY >= (layoutSplitRatio || 50) ? 1 : 0);
                  } else {
                    const totalSlots = totalPlannedSlots + 1;
                    for (let s = 0; s < totalSlots; s++) {
                      const sb = getDefaultSlotBounds(
                        activeLayout,
                        s,
                        totalSlots,
                        layoutSplitRatio,
                        customLayoutConfig,
                        isStageCropped
                      );
                      if (pctX >= sb.x && pctX <= sb.x + sb.width && pctY >= sb.y && pctY <= sb.y + sb.height) {
                        setMediaSlotIndex(s);
                        break;
                      }
                    }
                  }
                }
              }
              setActiveMedia({
                ...mediaItem,
                loop: mediaItem.loop ?? true,
                isMuted: false,
                volume: mediaItem.volume && mediaItem.volume > 0 ? mediaItem.volume : 100,
              });
              if (isStageCropped) {
                setTileTransform("active-media", { fitMode: "cover", panX: 0, panY: 0 });
              }
            }
          } catch { }
        }}
        className={cn(
          "relative rounded-2xl overflow-hidden border bg-[#050508] shadow-2xl flex flex-col justify-center mx-auto my-auto select-none group/stage transition-all",
          isMediaDragOverStage ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-white/10"
        )}
        style={{
          width: stageBox ? `${stageBox.width}px` : "100%",
          height: stageBox ? `${stageBox.height}px` : undefined,
          aspectRatio: "16 / 9",
          maxWidth: "100%",
          maxHeight: "100%",
          backgroundImage:
            !isFullBleedLayout && activeBackgroundUrl && !isVideoBg
              ? `url(${activeBackgroundUrl})`
              : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Real-time Video Background Layer */}
        {!isFullBleedLayout && isVideoBg && activeBackgroundUrl && (
          <video
            key={activeBackgroundUrl}
            src={activeBackgroundUrl}
            autoPlay
            loop
            muted
            playsInline
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          />
        )}

        {/* Active Video Stage Content */}
        <div className="absolute inset-0 z-10">{renderLayoutContent()}</div>

        {/* Global Transparent Drag Overlay */}
        {(activeDragState || isDraggingSplit) && (
          <div
            className={cn(
              "fixed inset-0 z-50 select-none bg-transparent pointer-events-auto",
              isDraggingSplit && "cursor-col-resize",
              activeDragState?.type === "move" && "cursor-move",
              activeDragState?.type === "resize" &&
              (activeDragState.handle === "nw" || activeDragState.handle === "se"
                ? "cursor-nwse-resize"
                : activeDragState.handle === "ne" || activeDragState.handle === "sw"
                  ? "cursor-nesw-resize"
                  : activeDragState.handle === "n" || activeDragState.handle === "s"
                    ? "cursor-ns-resize"
                    : "cursor-ew-resize")
            )}
          />
        )}

        {/* Stage Top Bar: Custom Layout Active / Reset All to Grid */}
        {hasAnyCustomBounds && (
          <div className="absolute top-3 right-4 z-30 flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-500/40 shadow-xl pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-200">Custom Stage Layout</span>
            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
              Saved ✓
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetAllParticipantBounds();
              }}
              className="ml-1 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors border border-white/10"
              title="Restore all windows to default grid"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset All to Grid</span>
            </button>
          </div>
        )}

        {/* StreamYard Stage Window Quick-Split Controller */}
        {(onStageParticipants.length >= 2 || expectedSlots >= 2) && (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-30 transition-opacity duration-200 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 flex items-center gap-1.5 shadow-2xl pointer-events-auto",
              showTicker ? "bottom-14" : "bottom-3",
              selectedParticipantId !== null
                ? "opacity-0 pointer-events-none"
                : "opacity-0 group-hover/stage:opacity-100 hover:opacity-100"
            )}
          >
            <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider">Split:</span>
            {(activeLayout === "three-equal" ||
              (activeLayout === "custom" && customLayoutConfig?.mode === "three-equal")
              ? [
                { label: "1:1:1", ratio: 33 },
                { label: "50:25", ratio: 50 },
                { label: "60:20", ratio: 60 },
                { label: "25:37", ratio: 25 },
              ]
              : [
                { label: "50:50", ratio: 50 },
                { label: "65:35", ratio: 65 },
                { label: "35:65", ratio: 35 },
                { label: "75:25", ratio: 75 },
              ]
            ).map((preset) => (
              <button
                key={preset.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setLayoutSplitRatio(preset.ratio);
                }}
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
            {hasVisualMedia && !isSoloOrCinema && (
              <>
                <span className="w-px h-3 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={handleSwapMediaAndHostPosition}
                  className="px-2 py-0.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[10px] flex items-center gap-1 shadow"
                  title="Swap Host and Media Left/Right"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Swap L/R</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* StreamYard Full-Frame Overlay */}
        {activeOverlayUrl && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            <img
              src={activeOverlayUrl}
              alt="Full Frame Overlay"
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        )}

        {/* Real-time Interactive Stage Overlay Layer */}
        {activeStageOverlay && activeStageOverlay.isShowing && (
          <div
            data-stage-overlay="true"
            style={getOverlayStyle()}
            className="group/overlay cursor-move select-none"
            onMouseDown={handleOverlayMouseDown}
            onTouchStart={handleOverlayTouchStart}
            onClick={(e) => e.stopPropagation()}
          >
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
              <span className="text-slate-400 p-0.5 mr-0.5 cursor-move" title="Drag to reposition">
                <Move className="w-3 h-3" />
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextScale =
                    activeStageOverlay.scale === 20
                      ? 35
                      : activeStageOverlay.scale === 35
                        ? 60
                        : activeStageOverlay.scale === 60
                          ? 100
                          : 20;
                  updateStageOverlay({ scale: nextScale });
                }}
                className="px-1.5 py-0.5 hover:bg-white/20 rounded text-slate-300 hover:text-white text-[10px] font-mono"
              >
                {activeStageOverlay.scale}%
              </button>

              <span className="w-px h-3 bg-white/20" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const modes: ("fit" | "cover" | "square" | "circle")[] = ["fit", "cover", "square", "circle"];
                  const nextIdx = (modes.indexOf(activeStageOverlay.cropMode) + 1) % modes.length;
                  updateStageOverlay({ cropMode: modes[nextIdx] });
                }}
                className="px-1.5 py-0.5 hover:bg-white/20 rounded text-slate-300 hover:text-white text-[10px] uppercase font-semibold"
              >
                {activeStageOverlay.cropMode}
              </button>

              {activeStageOverlay.type === "video" && (
                <>
                  <span className="w-px h-3 bg-white/20" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStageOverlay({ isMuted: !activeStageOverlay.isMuted });
                    }}
                    className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                  >
                    {activeStageOverlay.isMuted ? (
                      <VolumeX className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </button>
                </>
              )}

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
              >
                {activeStageOverlay.showBackdrop ? "Card" : "PNG"}
              </button>

              <span className="w-px h-3 bg-white/20" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStageOverlayVisibility();
                }}
                className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
              >
                <EyeOff className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStageOverlay(null);
                }}
                className="p-1 hover:bg-rose-600 rounded text-slate-300 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div
              className={cn(
                "relative overflow-hidden transition-shadow select-none",
                activeStageOverlay.showBackdrop
                  ? "bg-black/75 backdrop-blur-md border border-white/10 shadow-2xl"
                  : "bg-transparent",
                activeStageOverlay.cropMode === "circle" ? "rounded-full" : "rounded-2xl"
              )}
              style={{
                borderRadius:
                  activeStageOverlay.cropMode === "circle"
                    ? "9999px"
                    : `${activeStageOverlay.borderRadius || 16}px`,
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
                  className={cn(getCropClasses(), !activeStageOverlay.showBackdrop && "drop-shadow-md")}
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
              className={cn(
                "px-3 py-1.5 flex items-center gap-2 transition-all select-none",
                logoConfig?.isTransparentBg
                  ? "bg-transparent border-0 shadow-none"
                  : "rounded-xl backdrop-blur-md border shadow-xl"
              )}
              style={
                logoConfig?.isTransparentBg
                  ? undefined
                  : {
                    backgroundColor: `${logoConfig?.bgColor || "#000000"}${Math.round(
                      ((logoConfig?.bgOpacity ?? 75) / 100) * 255
                    )
                      .toString(16)
                      .padStart(2, "0")}`,
                    borderColor: `${activeThemeColor}50`,
                  }
              }
            >
              {(logoConfig?.mode === "image" || logoConfig?.mode === "both") && logoConfig?.imageUrl ? (
                <img
                  src={logoConfig.imageUrl}
                  alt="Brand Logo"
                  style={{ height: `${logoConfig?.scale || 40}px` }}
                  className="w-auto object-contain drop-shadow-md"
                />
              ) : (
                <span
                  className="w-2 h-2 rounded-full animate-pulse shadow-sm shrink-0"
                  style={{ backgroundColor: activeThemeColor }}
                />
              )}
              {(logoConfig?.mode !== "image" || !logoConfig?.imageUrl) && (
                <span
                  className={cn(
                    "font-bold tracking-wider uppercase font-mono drop-shadow-md",
                    logoConfig?.fontSize === "small" && "text-[10px]",
                    logoConfig?.fontSize === "large" && "text-sm font-black",
                    (!logoConfig?.fontSize || logoConfig?.fontSize === "medium") && "text-xs"
                  )}
                  style={{ color: logoConfig?.textColor || "#ffffff" }}
                >
                  {logoConfig?.text || logoUrl}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Lower-Third Banner */}
        {activeBanner && activeBanner.isShowing && (() => {
          const bStyle = activeBanner.style || "default";
          const accent = activeBanner.themeColor || activeThemeColor;
          return (
            <div
              className={cn(
                "absolute left-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300",
                showTicker ? "bottom-16" : "bottom-10"
              )}
            >
              {bStyle === "minimal" ? (
                <div
                  className="pl-4 py-1.5 pr-6 bg-black/70 backdrop-blur-md border-l-4 shadow-xl"
                  style={{ borderColor: accent }}
                >
                  <h4 className="text-sm font-bold text-white tracking-tight drop-shadow">{activeBanner.title}</h4>
                  {activeBanner.subtitle && (
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
                      {activeBanner.subtitle}
                    </p>
                  )}
                </div>
              ) : bStyle === "block" ? (
                <div className="shadow-2xl overflow-hidden rounded-lg flex flex-col">
                  <div className="px-5 py-2 text-white font-black text-sm uppercase tracking-wide" style={{ backgroundColor: accent }}>
                    {activeBanner.title}
                  </div>
                  {activeBanner.subtitle && (
                    <div className="px-5 py-1.5 bg-slate-950/95 text-slate-200 text-xs font-semibold border-x border-b border-white/15">
                      {activeBanner.subtitle}
                    </div>
                  )}
                </div>
              ) : bStyle === "bubble" ? (
                <div
                  className="px-6 py-2.5 rounded-full shadow-2xl border-2 backdrop-blur-xl bg-slate-950/90 flex items-center gap-3"
                  style={{ borderColor: accent }}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{activeBanner.title}</h4>
                    {activeBanner.subtitle && (
                      <p className="text-[11px] font-medium" style={{ color: accent }}>
                        {activeBanner.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden shadow-2xl flex border border-white/15 backdrop-blur-md bg-black/85">
                  <div className="w-2.5" style={{ backgroundColor: accent }} />
                  <div className="px-5 py-2.5">
                    <h4 className="text-sm font-bold text-white tracking-tight">{activeBanner.title}</h4>
                    {activeBanner.subtitle && (
                      <p className="text-xs font-medium" style={{ color: accent }}>
                        {activeBanner.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Interactive Broadcast-Grade Telestrator */}
        <StageTelestrator />

        {/* Pinned Stream Message Overlay */}
        {pinnedMessage && (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-30 max-w-xl w-[92%] px-3 transition-all duration-300 select-none group/comment pointer-events-auto",
              commentConfig?.position === "top"
                ? "top-5 animate-in fade-in slide-in-from-top-4"
                : showTicker
                  ? "bottom-16 animate-in fade-in slide-in-from-bottom-4"
                  : "bottom-6 animate-in fade-in slide-in-from-bottom-4"
            )}
          >
            <div
              className={cn(
                "relative backdrop-blur-xl border shadow-2xl flex items-start gap-3 transition-all duration-200",
                commentConfig?.theme === "minimal"
                  ? "p-3 rounded-xl bg-black/85 border-l-4"
                  : commentConfig?.theme === "classic"
                    ? "p-3.5 rounded-none bg-[#0d0d16] border-t-2 border-b-2"
                    : "p-3.5 rounded-2xl bg-[#090912]/95 border-white/15 ring-1 ring-white/5"
              )}
              style={{
                borderColor:
                  commentConfig?.theme === "minimal" || commentConfig?.theme === "classic"
                    ? `${activeThemeColor}`
                    : `${activeThemeColor}60`,
                boxShadow: `0 16px 40px rgba(0, 0, 0, 0.85), 0 0 30px ${activeThemeColor}20`,
              }}
            >
              {commentConfig?.showAvatar !== false && (
                <div className="relative shrink-0">
                  {pinnedMessage.avatar ? (
                    <img
                      src={pinnedMessage.avatar}
                      alt={pinnedMessage.author}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-md"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md border-2 border-white/20"
                      style={{ backgroundColor: activeThemeColor }}
                    >
                      {(pinnedMessage.author[0] || "U").toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black/90 border border-white/30 flex items-center justify-center">
                    {pinnedMessage.platform === "youtube" ? (
                      <Youtube className="w-2.5 h-2.5 text-rose-500" />
                    ) : pinnedMessage.platform === "twitch" ? (
                      <Twitch className="w-2.5 h-2.5 text-purple-400" />
                    ) : (
                      <Globe className="w-2.5 h-2.5 text-cyan-400" />
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {pinnedMessage.author}
                    </span>
                    {pinnedMessage.platform === "youtube" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30 uppercase tracking-wider">
                        <Youtube className="w-2.5 h-2.5" /> YouTube
                      </span>
                    ) : pinnedMessage.platform === "twitch" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider">
                        <Twitch className="w-2.5 h-2.5" /> Twitch
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-300 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase tracking-wider">
                        <Globe className="w-2.5 h-2.5" /> {pinnedMessage.platform}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => pinMessage(null)}
                    className="opacity-60 hover:opacity-100 p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p
                  className={cn(
                    "text-slate-100 font-medium leading-relaxed break-words line-clamp-3",
                    commentConfig?.fontSize === "large"
                      ? "text-sm sm:text-base"
                      : commentConfig?.fontSize === "small"
                        ? "text-xs"
                        : "text-xs sm:text-sm"
                  )}
                >
                  {pinnedMessage.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Animated News Ticker Crawl */}
        {showTicker && (
          <div
            className="absolute bottom-0 inset-x-0 h-12 border-t backdrop-blur-md z-30 flex items-center overflow-hidden shadow-2xl"
            style={{
              backgroundColor: tickerConfig?.bgColor || "#050508",
              borderColor: `${activeThemeColor}40`,
              borderBottom: `3px solid ${activeThemeColor}`,
            }}
          >
            <div
              className="px-4 text-xs font-black tracking-widest text-white uppercase shrink-0 h-full flex items-center z-10 shadow-lg"
              style={{ backgroundColor: tickerConfig?.badgeBgColor || activeThemeColor }}
            >
              {tickerConfig?.badgeText || "LIVE UPDATES"}
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div
                className={cn(
                  "animate-marquee font-medium px-4",
                  tickerConfig?.fontSize === "small" && "text-sm font-medium",
                  tickerConfig?.fontSize === "medium" && "text-base font-semibold",
                  tickerConfig?.fontSize === "large" && "text-lg font-bold",
                  tickerConfig?.fontSize === "xlarge" && "text-xl font-black",
                  !tickerConfig?.fontSize && "text-base font-semibold"
                )}
                style={{
                  color: tickerConfig?.textColor || "#ffffff",
                  animationDuration:
                    tickerConfig?.speed === "slow" ? "75s" : tickerConfig?.speed === "fast" ? "30s" : "50s",
                }}
              >
                {tickerConfig?.text || tickerText}
              </div>
            </div>
          </div>
        )}

        {/* Active Stage Background Audio Stream */}
        {activeMedia && activeMedia.type === "audio" && (
          <>
            <audio
              id="livestudio-active-media-audio"
              src={activeMedia.url}
              autoPlay
              loop={activeMedia.loop ?? true}
              muted={activeMedia.isMuted ?? false}
              onLoadedMetadata={(e) => {
                const a = e.currentTarget;
                if (Number.isFinite(a.duration) && a.duration > 0) setMediaDuration(a.duration);
                setIsMediaPaused(a.paused);
              }}
              onTimeUpdate={(e) => {
                const a = e.currentTarget;
                setMediaCurrentTime(a.currentTime || 0);
                if (Number.isFinite(a.duration) && a.duration > 0 && mediaDuration !== a.duration) {
                  setMediaDuration(a.duration);
                }
              }}
              onPlay={() => setIsMediaPaused(false)}
              onPause={() => setIsMediaPaused(true)}
            />
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-3 left-3 z-40 animate-in fade-in pointer-events-auto max-w-[calc(100%-24px)]"
            >
              <div className="px-3 py-2 rounded-2xl bg-[#090a14]/95 backdrop-blur-md border border-cyan-500/50 flex flex-wrap items-center gap-2 shadow-2xl">
                <button
                  type="button"
                  onClick={handleToggleMediaPlayPause}
                  className="w-6 h-6 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow"
                >
                  {isMediaPaused ? <Play className="w-3 h-3 fill-current ml-0.5" /> : <Pause className="w-3 h-3 fill-current" />}
                </button>

                <span className="text-[11px] font-semibold text-cyan-200 truncate max-w-[130px]" title={activeMedia.name}>
                  🎵 {activeMedia.name}
                </span>

                <button
                  type="button"
                  onClick={(e) => handleSkipMediaSeconds(-10, e)}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-mono text-slate-300 hover:text-white"
                >
                  -10s
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSkipMediaSeconds(10, e)}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-mono text-slate-300 hover:text-white"
                >
                  +10s
                </button>

                <span className="text-[9.5px] font-mono text-cyan-300">{formatMediaTime(mediaCurrentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 100)}
                  step={0.1}
                  value={Math.min(mediaCurrentTime, Math.max(1, Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 100))}
                  onChange={(e) => handleSeekMedia(Number(e.target.value))}
                  className="w-24 h-1.5 accent-cyan-400 bg-white/20 rounded-lg cursor-pointer"
                />
                <span className="text-[9.5px] font-mono text-slate-400">{formattedTotalDuration}</span>

                <div className="flex items-center gap-1 bg-white/5 rounded-lg px-1.5 py-0.5 border border-white/10">
                  <button
                    type="button"
                    onClick={toggleMediaMute}
                    className={cn(
                      "p-0.5 rounded text-[10px]",
                      activeMedia.isMuted || normalizedMediaVolumePct === 0 ? "text-rose-400" : "text-emerald-400"
                    )}
                  >
                    {activeMedia.isMuted || normalizedMediaVolumePct === 0 ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={activeMedia.isMuted ? 0 : normalizedMediaVolumePct}
                    onChange={(e) => setMediaVolume(Number(e.target.value))}
                    className="w-14 h-1 accent-emerald-400 bg-white/20 rounded cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-emerald-300 min-w-[28px]">
                    {activeMedia.isMuted ? "0%" : `${normalizedMediaVolumePct}%`}
                  </span>
                </div>

                <button
                  onClick={() => setActiveMedia(null)}
                  className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 text-[10px] text-rose-300 font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </>
        )}

        {/* Scene Custom Title / Text Card */}
        {activeTextCard && activeTextCard.enabled && activeTextCard.heading && (
          <div
            className={cn(
              "absolute z-35 max-w-2xl w-[86%] pointer-events-none transition-all duration-300 animate-in fade-in select-none",
              activeTextCard.position === "top"
                ? "top-8 left-1/2 -translate-x-1/2"
                : activeTextCard.position === "top-left"
                  ? "top-8 left-8"
                  : activeTextCard.position === "bottom-right"
                    ? "bottom-20 right-8"
                    : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            )}
          >
            <div
              className="p-5 rounded-2xl shadow-2xl backdrop-blur-md text-center border border-white/15"
              style={{
                backgroundColor: activeTextCard.bgColor || "rgba(15, 23, 42, 0.88)",
                opacity: (activeTextCard.bgOpacity ?? 85) / 100,
              }}
            >
              <h3
                className="text-2xl md:text-3xl font-black tracking-tight"
                style={{ color: activeTextCard.textColor || "#ffffff" }}
              >
                {activeTextCard.heading}
              </h3>
              {activeTextCard.subheading && (
                <p className="mt-1 text-sm md:text-base text-slate-300 font-medium">
                  {activeTextCard.subheading}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Drag-and-Drop Media Target Overlay on Stage */}
        {isMediaDragOverStage && (
          <div className="absolute inset-0 z-50 bg-indigo-950/60 backdrop-blur-xs border-4 border-dashed border-cyan-400 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-xl">
              <MonitorUp className="w-6 h-6 animate-bounce" />
            </div>
            <span className="text-sm font-bold text-white tracking-wide drop-shadow">
              Drop Media to Present on Stage & Save to Current Scene
            </span>
            <span className="text-[11px] text-cyan-200 font-medium">
              Release mouse on Left, Right, or any Grid Slot to place media there
            </span>
          </div>
        )}

        {/* Scene Transition Fade Overlay */}
        {isSceneTransitioning && (
          <div className="absolute inset-0 bg-[#07070d]/40 backdrop-blur-[2px] z-40 pointer-events-none transition-opacity duration-300 animate-in fade-in" />
        )}
      </div>

      {/* Direct YouTube Scene Player & Clip Library Modal */}
      <YouTubeLibraryModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        targetSceneId={activeSceneId}
      />

      {/* Clipboard Screenshot Paste Confirmation Toast */}
      {(pastedToastMsg || clipSavedToast) && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-600/95 text-white px-4 py-2 rounded-xl shadow-2xl border border-emerald-300/50 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-150">
          <Clipboard className="w-4 h-4 text-white" />
          <span>{pastedToastMsg || clipSavedToast}</span>
        </div>
      )}

      {/* Broadcast News Tactical Map & Missile / Airplane Animator Modal */}
      <TacticalMapModal
        isOpen={isTacticalMapModalOpen}
        onClose={() => setIsTacticalMapModalOpen(false)}
        targetSceneId={activeSceneId}
        initialItem={activeMedia?.type === "map" ? activeMedia : null}
      />

      {/* Interactive Website URL Scene & Library Modal */}
      <WebsiteLibraryModal
        isOpen={isWebsiteModalOpen}
        onClose={() => setIsWebsiteModalOpen(false)}
        targetSceneId={activeSceneId}
      />
    </div>
  );
};
