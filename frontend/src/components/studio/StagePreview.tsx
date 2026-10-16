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
  Lock,
  Unlock,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Crosshair,
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
  Hand,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldAlert,
  MonitorUp,
  Trash2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useStudioStore, ParticipantBounds, CustomLayoutConfig } from "@/stores/studio.store";
import { VideoTrackView } from "./VideoTrackView";
import { Participant } from "@/types";
import { cn } from "@/lib/utils";
import { getDefaultSlotBounds, getLayoutExpectedSlots, calculateStageLayout } from "@/lib/layoutBounds";
import { stageBroadcaster } from "@/lib/stageBroadcaster";
import { StageTelestrator } from "./StageTelestrator";

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
    layoutSplitRatio,
    setLayoutSplitRatio,
    // Freeform window bounds & Selection Tool
    participantBounds,
    setParticipantBounds,
    resetParticipantBounds,
    resetAllParticipantBounds,
    selectedParticipantId,
    setSelectedParticipantId,
    bringToFront,
    sendToBack,
    tileTransforms,
    setTileTransform,
    isDrawingMode,
    toggleMediaMute,
    toggleParticipantMic,
    mediaSlotIndex,
    setMediaSlotIndex,
    moveParticipantOrder,
    soloTargetId,
    toggleSoloParticipant,
    scenes,
    activeSceneId,
    fairUseConfig,
    setFairUseConfig,
    activeTextCard,
    nextSlide,
    prevSlide,
    isSceneTransitioning,
  } = useStudioStore();

  const mediaTransform = tileTransforms["active-media"] || {
    fitMode: "contain",
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  };
  const mediaFitMode = (mediaTransform.fitMode as "contain" | "cover") || "contain";
  const mediaZoom = Math.max(1, mediaTransform.zoom || 1);
  const mediaPanX = mediaTransform.panX || 0;
  const mediaPanY = mediaTransform.panY || 0;

  // Convert pan coordinates (-50 to +50) to CSS object-position (0% to 100%)
  // panY = -50 => objectPosY = 0%   (TOP / Header / Letterhead)
  // panY = 0   => objectPosY = 50%  (CENTER / Body)
  // panY = +50 => objectPosY = 100% (BOTTOM / Footer / Signatures)
  const objectPosX = Math.max(0, Math.min(100, 50 + mediaPanX));
  const objectPosY = Math.max(0, Math.min(100, 50 + mediaPanY));
  const effectiveObjectPosX = mediaFitMode === "contain" && mediaZoom === 1 ? 50 : objectPosX;
  const effectiveObjectPosY = mediaFitMode === "contain" && mediaZoom === 1 ? 50 : objectPosY;

  const [isDraggingMediaPan, setIsDraggingMediaPan] = useState(false);
  const mediaPanStartRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0, rectWidth: 1, rectHeight: 1 });
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);

  React.useEffect(() => {
    setMediaLoadError(false);
  }, [activeMedia?.id, activeMedia?.url]);

  const handleToggleMediaCrop = () => {
    if (mediaFitMode === "contain") {
      // Switching to Crop (Fill) mode: default to center
      setTileTransform("active-media", { fitMode: "cover", panX: 0, panY: 0 });
    } else {
      // Switching to Fit mode:
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

  const isMediaMirrored = Boolean(fairUseConfig?.enabled && fairUseConfig?.mirrorMediaVideo);

  const handleMediaCropPreset = (preset: "top" | "center" | "bottom" | "left" | "right") => {
    if (preset === "top") {
      setTileTransform("active-media", { fitMode: "cover", panY: -50 });
    } else if (preset === "bottom") {
      setTileTransform("active-media", { fitMode: "cover", panY: 50 });
    } else if (preset === "left") {
      setTileTransform("active-media", { fitMode: "cover", panX: -50 });
    } else if (preset === "right") {
      setTileTransform("active-media", { fitMode: "cover", panX: 50 });
    } else if (preset === "center") {
      setTileTransform("active-media", { fitMode: "cover", panY: 0, panX: 0 });
    }
  };

  const handleResetMediaTransform = () => {
    setTileTransform("active-media", {
      fitMode: "contain",
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  };

  const handleMediaPanMouseDown = (e: React.MouseEvent) => {
    if (mediaFitMode !== "cover" && mediaZoom <= 1) return;
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input") || (e.target as HTMLElement).closest("select")) return;
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

      // When dragging mouse RIGHT (deltaPixelX > 0), user pulls image right to reveal left portion -> panX should decrease
      // If mirrored (scaleX(-1)), horizontal visual motion is inverted, so direction flips
      const xDirection = isMediaMirrored ? 1 : -1;
      const deltaXPercent = (deltaPixelX / (rectWidth || 400)) * 100 * xDirection;
      const deltaYPercent = (deltaPixelY / (rectHeight || 300)) * 100 * -1;

      const maxPan = mediaZoom > 1 ? 50 * mediaZoom : 50;
      setTileTransform("active-media", {
        panX: Math.max(-maxPan, Math.min(maxPan, Number((initialPanX + deltaXPercent).toFixed(1)))),
        panY: Math.max(-maxPan, Math.min(maxPan, Number((initialPanY + deltaYPercent).toFixed(1)))),
      });
    },
    [isDraggingMediaPan, mediaZoom, isMediaMirrored, setTileTransform]
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
    if (mediaFitMode !== "cover" && mediaZoom <= 1) return;
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

    const xDirection = isMediaMirrored ? 1 : -1;
    const deltaXPercent = (deltaPixelX / (rectWidth || 400)) * 100 * xDirection;
    const deltaYPercent = (deltaPixelY / (rectHeight || 300)) * 100 * -1;

    const maxPan = mediaZoom > 1 ? 50 * mediaZoom : 50;
    setTileTransform("active-media", {
      panX: Math.max(-maxPan, Math.min(maxPan, Number((initialPanX + deltaXPercent).toFixed(1)))),
      panY: Math.max(-maxPan, Math.min(maxPan, Number((initialPanY + deltaYPercent).toFixed(1)))),
    });
  };

  const handleMediaPanTouchEnd = () => {
    setIsDraggingMediaPan(false);
  };

  const handleMediaWheel = (e: React.WheelEvent) => {
    if (mediaFitMode !== "cover" && mediaZoom <= 1) return;
    e.stopPropagation();
    const step = e.deltaY > 0 ? 5 : -5;
    const maxPan = mediaZoom > 1 ? 50 * mediaZoom : 50;
    const nextPanY = Math.max(-maxPan, Math.min(maxPan, Number((mediaPanY + step).toFixed(1))));
    setTileTransform("active-media", { panY: nextPanY });
  };

  // Sync active media video & audio elements with store isMuted and volume
  React.useEffect(() => {
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (videoEl && activeMedia) {
      videoEl.muted = Boolean(activeMedia.isMuted);
      if (typeof activeMedia.volume === "number") {
        videoEl.volume = activeMedia.volume;
      }
    }
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (audioEl && activeMedia) {
      audioEl.muted = Boolean(activeMedia.isMuted);
      if (typeof activeMedia.volume === "number") {
        audioEl.volume = activeMedia.volume;
      }
    }
  }, [activeMedia?.isMuted, activeMedia?.volume]);

  // Enforce Fair-Use Speed & 8-12s Random Jerk/Pause even during local Studio Preview
  useEffect(() => {
    if (!activeMedia || activeMedia.type !== "video" || !fairUseConfig?.enabled) return;
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.playbackRate = fairUseConfig.playbackRate || 1.04;
    }
    if (!fairUseConfig.autoPauseIntervalSec || fairUseConfig.autoPauseIntervalSec <= 0) return;

    let timer: NodeJS.Timeout;
    const runCycle = () => {
      const delayMs =
        fairUseConfig.autoPauseIntervalSec === 8
          ? Math.floor(8000 + Math.random() * 4000) // Random 8s to 12s
          : fairUseConfig.autoPauseIntervalSec * 1000;

      timer = setTimeout(() => {
        const v = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
        // Agar broadcaster chal raha hai to broadcaster khud handle karega, warna preview handle karega
        if (v && !v.paused && !stageBroadcaster.isStreaming()) {
          const mode = fairUseConfig.antiMatchMode || "jerk-skip";
          v.pause();
          setTimeout(() => {
            if (mode === "jerk-skip" && v.duration && v.currentTime + 0.35 < v.duration) {
              v.currentTime += 0.25;
            }
            v.play().catch(() => {});
          }, mode === "jerk-skip" ? 180 : mode === "micro-pause" ? 380 : 1800);
        }
        runCycle();
      }, delayMs);
    };
    runCycle();
    return () => clearTimeout(timer);
  }, [
    activeMedia?.id,
    activeMedia?.type,
    fairUseConfig?.enabled,
    fairUseConfig?.autoPauseIntervalSec,
    fairUseConfig?.antiMatchMode,
    fairUseConfig?.playbackRate,
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
    } catch {
      // fallback
    }
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
      (activeMedia.type === "video" || activeMedia.type === "image" || activeMedia.type === "pdf")
  );

  const isFullBleedLayout =
    activeLayout === "cropped" ||
    activeLayout === "podcast" ||
    activeLayout === "cinema" ||
    activeLayout === "solo" ||
    (activeLayout === "custom" &&
      (customLayoutConfig?.mode === "solo" ||
        customLayoutConfig?.mode === "cinema" ||
        customLayoutConfig?.mode === "podcast"));

  const isSoloOrCinema =
    activeLayout === "solo" ||
    activeLayout === "cinema" ||
    (activeLayout === "custom" &&
      (customLayoutConfig?.mode === "solo" || customLayoutConfig?.mode === "cinema"));

  // Ghost slots should be allowed in all multi-person layouts (cropped, side-by-side, 3-equal, 4-grid, presentation, etc.)
  const allowGhostSlots = !isSoloOrCinema;

  const totalGhostSlots = allowGhostSlots
    ? remainingExpectedGuestSlots > 0
      ? remainingExpectedGuestSlots
      : !hasVisualMedia && orderedParticipants.length >= 1 && orderedParticipants.length < expectedSlots
      ? expectedSlots - orderedParticipants.length
      : 0
    : 0;

  const totalPlannedSlots = totalGhostSlots > 0
    ? Math.max(expectedSlots, orderedParticipants.length + totalGhostSlots)
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

  // Stage Window Resizing Split Divider (when side-by-side and no custom bounds)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const isDraggingSplitRef = useRef(false);

  // Active Participant Window Drag & Resize Session State
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

  // Split Divider Drag Handlers (60fps requestAnimationFrame) - Supports both vertical & horizontal dividers
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
          const clamped = Math.max(20, Math.min(80, percentage));
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
          const clamped = Math.max(20, Math.min(80, percentage));
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

  // Participant Tile Move Handlers (60fps, no jitter, boundary clamped)
  const handleTileMouseDown = (e: React.MouseEvent, p: Participant, currentBounds: ParticipantBounds) => {
    if (e.button !== 0 || isDrawingMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".no-drag")) return;

    e.preventDefault();
    e.stopPropagation();

    setSelectedParticipantId(p.id);

    // StreamYard standard: in grid/column layouts, clicking selects the tile without displacing it.
    // Only in floating PiP mode can the small floating window be dragged.
    const isPipMode = activeLayout === "pip" || customLayoutConfig.mode === "pip";
    if (!isPipMode || !stageContainerRef.current) return;

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

  // Overlay Dragging Handlers
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

  // Helper to render active stage media (video/slides/image)
  const renderMediaTile = () => {
    if (!activeMedia) return null;
    const isTransparentCard = Boolean(mediaTransform.isTransparentBg);
    return (
      <div
        data-stage-tile="true"
        data-stage-media="true"
        data-participant-id="active-media"
        data-media-name={activeMedia.name}
        data-participant-fit={mediaFitMode}
        data-transparent-card={isTransparentCard ? "true" : "false"}
        className={cn(
          "relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center group select-none transition-all",
          isTransparentCard
            ? "bg-transparent border-0 shadow-none"
            : "bg-black/95 border border-indigo-500/30 shadow-2xl"
        )}
      >
        {/* Inner Media Viewport with Pan & Zoom Transform */}
        <div
          className="relative w-full h-full overflow-hidden flex items-center justify-center select-none"
          onMouseDown={handleMediaPanMouseDown}
          onTouchStart={handleMediaPanTouchStart}
          onTouchMove={handleMediaPanTouchMove}
          onTouchEnd={handleMediaPanTouchEnd}
          onWheel={handleMediaWheel}
        >
          {mediaLoadError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2.5 bg-black/90 w-full h-full">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Video className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-rose-300">Media source unavailable or expired</p>
              <p className="text-[10px] text-slate-500 max-w-[220px] truncate">{activeMedia.name}</p>
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
                  onClick={() => setActiveMedia(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Remove from Stage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : activeMedia.type === "video" ? (
            <video
              id="livestudio-active-media-video"
              src={activeMedia.url}
              autoPlay
              controls={mediaFitMode === "contain" && mediaZoom === 1}
              playsInline
              loop={activeMedia.loop ?? true}
              muted={activeMedia.isMuted ?? false}
              crossOrigin="anonymous"
              onError={() => setMediaLoadError(true)}
              style={{
                objectFit: mediaFitMode,
                objectPosition: `${effectiveObjectPosX}% ${effectiveObjectPosY}%`,
                transform: [
                  mediaZoom > 1 ? `scale(${mediaZoom})` : "",
                  fairUseConfig?.enabled && fairUseConfig?.mirrorMediaVideo ? "scaleX(-1)" : "",
                ].filter(Boolean).join(" ") || undefined,
                transformOrigin: "center center",
                cursor: mediaFitMode === "cover" || mediaZoom > 1 ? (isDraggingMediaPan ? "grabbing" : "grab") : "default",
                userSelect: "none",
                transition: isDraggingMediaPan ? "none" : "object-position 0.15s ease-out, transform 0.15s ease-out",
                filter: fairUseConfig?.enabled && fairUseConfig?.visualTransformFilter ? "contrast(1.03) saturate(1.03)" : undefined,
              }}
              className="w-full h-full max-w-none pointer-events-auto"
            />
          ) : (
            <img
              src={activeMedia.url}
              alt={activeMedia.name}
              crossOrigin="anonymous"
              draggable={false}
              onError={() => setMediaLoadError(true)}
              style={{
                objectFit: mediaFitMode,
                objectPosition: `${effectiveObjectPosX}% ${effectiveObjectPosY}%`,
                transform: [
                  mediaZoom > 1 ? `scale(${mediaZoom})` : "",
                  fairUseConfig?.enabled && fairUseConfig?.mirrorMediaVideo ? "scaleX(-1)" : "",
                ].filter(Boolean).join(" ") || undefined,
                transformOrigin: "center center",
                cursor: mediaFitMode === "cover" || mediaZoom > 1 ? (isDraggingMediaPan ? "grabbing" : "grab") : "default",
                userSelect: "none",
                transition: isDraggingMediaPan ? "none" : "object-position 0.15s ease-out, transform 0.15s ease-out",
                filter: fairUseConfig?.enabled && fairUseConfig?.visualTransformFilter ? "contrast(1.03) saturate(1.03)" : undefined,
              }}
              className="w-full h-full max-w-none pointer-events-auto"
            />
          )}

          {/* Active Pan coordinates indicator when dragging */}
          {isDraggingMediaPan && (
            <div className="absolute inset-0 pointer-events-none border-2 border-cyan-400/80 bg-cyan-950/20 flex items-center justify-center z-30">
              <span className="px-2.5 py-1 rounded-md bg-black/90 text-[11px] text-cyan-300 font-mono shadow-xl border border-cyan-500/40">
                ✋ Pos: X {Math.round(objectPosX)}% • Y {Math.round(objectPosY)}%
              </span>
            </div>
          )}

          {/* Help hint when hovering in crop mode */}
          {(mediaFitMode === "cover" || mediaZoom > 1) && !isDraggingMediaPan && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[9px] text-slate-200 flex items-center gap-1.5 shadow-xl z-20">
              <span>✋ Drag to move</span>
              <span className="text-white/40">•</span>
              <span>Use Left / Center / Right / Top buttons</span>
            </div>
          )}
        </div>

        {/* Dynamic Film Grain Adjustment Layer (Clean Cinema Texture without 3px Grid Mesh) */}
        {fairUseConfig?.enabled && (fairUseConfig?.filmGrainOverlay ?? true) && (
          <div
            className="absolute inset-0 pointer-events-none z-15 mix-blend-overlay opacity-15 select-none"
            style={{
              backgroundImage: `radial-gradient(rgba(255,255,255,0.12) 0.5px, transparent 0)`,
              backgroundSize: "17px 23px",
            }}
          />
        )}

        {/* Old-Movie Bareek Vertical Scratches & Traveling Lines Overlay */}
        {fairUseConfig?.enabled && (fairUseConfig?.vintageLinesOverlay ?? true) && (
          <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden select-none opacity-35">
            <div className="absolute top-0 bottom-0 left-[18%] w-[1px] bg-white/40 animate-pulse" />
            <div className="absolute top-[15%] bottom-[10%] left-[63%] w-[1px] bg-black/50 animate-ping" style={{ animationDuration: "1.4s" }} />
            <div className="absolute top-0 bottom-[25%] left-[82%] w-[0.5px] bg-amber-100/35 animate-pulse" style={{ animationDuration: "0.9s" }} />
            <div className="absolute top-[20%] bottom-[10%] left-[34%] w-[0.8px] bg-white/30 animate-pulse" style={{ animationDuration: "1.1s" }} />
            <div className="absolute top-[5%] bottom-[35%] left-[49%] w-[0.5px] bg-black/45 animate-pulse" style={{ animationDuration: "0.7s" }} />
          </div>
        )}

        {/* YouTube Fair Use / Reaction Badge (Broadcast watermark at bottom-left corner) */}
        {fairUseConfig?.enabled && (
          <div
            className={cn(
              "absolute left-3 z-20 flex items-center gap-1.5 bg-amber-500/95 text-slate-950 font-black text-[9px] tracking-wider uppercase px-2 py-0.5 rounded shadow-lg pointer-events-none transition-all",
              activeMedia.type === "video" && mediaFitMode === "contain" && mediaZoom === 1
                ? "bottom-11"
                : "bottom-3"
            )}
          >
            <ShieldAlert className="w-3 h-3 text-slate-950" />
            <span>Fair Use • Safe Mode</span>
          </div>
        )}


        {/* Multi-Slide Presentation Deck Controls (StreamYard Paid Plan) */}
        {activeMedia.slides && activeMedia.slides.length > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-500/50 shadow-2xl pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              disabled={(activeMedia.currentSlideIndex || 0) <= 0}
              className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-white px-1">
              Slide {(activeMedia.currentSlideIndex || 0) + 1} / {activeMedia.slides.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              disabled={(activeMedia.currentSlideIndex || 0) >= activeMedia.slides.length - 1}
              className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {activeMedia.speakerNotes && activeMedia.speakerNotes[activeMedia.currentSlideIndex || 0] && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeakerNotes(!showSpeakerNotes);
                }}
                className={cn(
                  "ml-1.5 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors",
                  showSpeakerNotes
                    ? "bg-amber-500 text-black border-amber-400 font-bold"
                    : "bg-white/10 hover:bg-white/20 text-amber-300 border-amber-500/30"
                )}
                title="Toggle Speaker Notes for this slide"
              >
                <FileText className="w-3 h-3" />
                <span>Notes</span>
              </button>
            )}
          </div>
        )}

        {/* Floating Speaker Notes Overlay for Presenter */}
        {showSpeakerNotes && activeMedia.slides && activeMedia.speakerNotes?.[activeMedia.currentSlideIndex || 0] && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 max-w-md w-[88%] bg-slate-950/95 backdrop-blur-md border border-amber-500/50 rounded-xl p-3 shadow-2xl z-35 pointer-events-auto text-left"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1.5">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Speaker Notes (Slide {(activeMedia.currentSlideIndex || 0) + 1})
              </span>
              <button
                type="button"
                onClick={() => setShowSpeakerNotes(false)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {activeMedia.speakerNotes[activeMedia.currentSlideIndex || 0]}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Layout Engine: StreamYard-Parity Canvas with Selection Tool & Independent Window Resizing
  const renderLayoutContent = () => {
    const isPipMode = activeLayout === "pip" || customLayoutConfig.mode === "pip";
    const hasVisualMedia = Boolean(
      activeMedia &&
        (activeMedia.type === "video" || activeMedia.type === "image" || activeMedia.type === "pdf")
    );

    if (onStageParticipants.length === 0 && !hasVisualMedia) {
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

    // Calculate layout using StreamYard-grade layout engine
    const stageLayoutResult = calculateStageLayout(
      activeLayout,
      totalPlannedSlots,
      hasVisualMedia,
      layoutSplitRatio,
      customLayoutConfig,
      Boolean(fairUseConfig?.enabled && fairUseConfig?.enforceReactionPiP),
      mediaSlotIndex
    );

    const defaultMediaBounds: ParticipantBounds =
      stageLayoutResult.mediaBounds || (
        onStageParticipants.length === 0
          ? { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 4, width: 68, height: 92, zIndex: 10, isLockedRatio: true }
      );
    const mediaBounds: ParticipantBounds = participantBounds["active-media"] || defaultMediaBounds;
    const isMediaSelected = String(selectedParticipantId) === "active-media";
    const isMediaDragging = activeDragState?.participantId === "active-media";

    // Unified Stage Canvas with Independent Moving & Resizing for all Participants & Media
    return (
      <div className={cn("w-full h-full relative select-none", isFullBleedLayout ? "p-0" : "p-2")}>
        {/* Active Stage Media Window (Interactive & Resizable) */}
        {hasVisualMedia && activeMedia && (
          <div
            key="stage-active-media"
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
              "rounded-2xl overflow-visible select-none transition-shadow group/mediatile",
              isMediaSelected
                ? "ring-2 ring-indigo-500 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.5)] cursor-pointer"
                : mediaTransform.isTransparentBg
                ? "border-0 hover:ring-1 hover:ring-white/20 cursor-pointer"
                : "border border-white/10 hover:border-indigo-400/50 cursor-pointer"
            )}
          >
            {/* Inner Media Content */}
            <div className="w-full h-full rounded-2xl overflow-hidden relative pointer-events-auto">
              {renderMediaTile()}
            </div>

            {/* Unified Floating Action Pill Toolbar for Media */}
            <div
              className={cn(
                "absolute z-50 flex flex-wrap items-center justify-center gap-1 bg-[#0c0c16]/95 backdrop-blur-md px-2 py-1.5 rounded-xl border border-indigo-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.85)] pointer-events-auto transition-all duration-150 w-max max-w-[calc(100%-16px)] top-2.5 left-1/2 -translate-x-1/2",
                isMediaSelected
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 group-hover/mediatile:opacity-100 pointer-events-none group-hover/mediatile:pointer-events-auto"
              )}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Media Name Tag */}
                <span className="text-[10px] font-semibold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 max-w-[120px] truncate">
                  🎬 {activeMedia.name}
                </span>

                <span className="w-px h-3 bg-white/20" />

                {/* Crop vs Fit Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleMediaCrop}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors",
                    mediaFitMode === "cover"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                      : "bg-white/10 text-slate-300 border-white/20 hover:text-white"
                  )}
                  title={
                    mediaFitMode === "cover"
                      ? "Currently: Cropped to Fill Window (Click to Fit 100%)"
                      : "Currently: Fit 100% in Window (Click to Crop & Fill)"
                  }
                >
                  <Crop className="w-3 h-3 text-amber-400" />
                  <span>{mediaFitMode === "cover" ? "Cropped (Fill)" : "Fit"}</span>
                </button>

                {/* Transparent Card Background Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setTileTransform("active-media", {
                      isTransparentBg: !mediaTransform.isTransparentBg,
                    })
                  }
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors",
                    mediaTransform.isTransparentBg
                      ? "bg-indigo-500/30 text-indigo-300 border-indigo-400 font-bold"
                      : "bg-white/10 text-slate-300 border-white/20 hover:text-white"
                  )}
                  title={
                    mediaTransform.isTransparentBg
                      ? "Card Background: Transparent (Click to switch to Dark Card)"
                      : "Card Background: Dark Card (Click to make Card Transparent / Show Wallpaper)"
                  }
                >
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>{mediaTransform.isTransparentBg ? "Transparent" : "Card"}</span>
                </button>

                {/* Always-Visible Media Zoom Controls (Works in both Fit & Cropped modes) */}
                <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/15 px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={handleMediaZoomOut}
                    disabled={mediaZoom <= 1}
                    className="p-0.5 rounded text-slate-300 hover:text-white disabled:opacity-30"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3 text-cyan-400" />
                  </button>
                  <input
                    type="range"
                    min="100"
                    max="300"
                    step="10"
                    value={Math.round(mediaZoom * 100)}
                    onChange={(e) => {
                      const nextZ = Number((Number(e.target.value) / 100).toFixed(2));
                      setTileTransform("active-media", {
                        zoom: nextZ,
                        panX: nextZ <= 1 && mediaFitMode === "contain" ? 0 : mediaPanX,
                        panY: nextZ <= 1 && mediaFitMode === "contain" ? 0 : mediaPanY,
                      });
                    }}
                    className="w-14 h-1 accent-cyan-400 bg-white/20 rounded cursor-pointer"
                    title={`Zoom Level: ${Math.round(mediaZoom * 100)}%`}
                  />
                  <span className="text-[10px] font-mono font-bold text-cyan-300 min-w-[30px] text-center">
                    {Math.round(mediaZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleMediaZoomIn}
                    disabled={mediaZoom >= 3}
                    className="p-0.5 rounded text-slate-300 hover:text-white disabled:opacity-30"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3 text-cyan-400" />
                  </button>
                </div>

                {/* Pan Alignment Controls (Shown when Cropped or Zoomed > 100%) */}
                {(mediaFitMode === "cover" || mediaZoom > 1) && (
                  <>
                    <div className="flex items-center gap-0.5 bg-white/5 rounded border border-white/10 px-0.5">
                      <button
                        type="button"
                        onClick={() => handleMediaCropPreset("left")}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                          mediaPanX <= -20 ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-300 hover:text-white"
                        )}
                        title="Show Left Side"
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMediaCropPreset("center")}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                          Math.abs(mediaPanX) < 20 && Math.abs(mediaPanY) < 20 ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-300 hover:text-white"
                        )}
                        title="Center Alignment"
                      >
                        Mid
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMediaCropPreset("right")}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                          mediaPanX >= 20 ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-300 hover:text-white"
                        )}
                        title="Show Right Side"
                      >
                        Right
                      </button>
                      <span className="w-px h-2.5 bg-white/20 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => handleMediaCropPreset("top")}
                        className={cn(
                          "px-1 py-0.5 rounded text-[9px] font-semibold transition-colors",
                          mediaPanY <= -20 ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-300 hover:text-white"
                        )}
                        title="Show Top / Letterhead"
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMediaCropPreset("bottom")}
                        className={cn(
                          "px-1 py-0.5 rounded text-[9px] font-semibold transition-colors",
                          mediaPanY >= 20 ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-300 hover:text-white"
                        )}
                        title="Show Bottom / Signatures"
                      >
                        Btm
                      </button>
                    </div>

                    {/* Vertical Pan Slider */}
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={Math.round(mediaPanY)}
                      onChange={(e) => {
                        setTileTransform("active-media", {
                          panY: Number(e.target.value),
                        });
                      }}
                      className="w-14 h-1 accent-amber-400 bg-white/20 rounded cursor-pointer"
                      title={`Pan Y: ${Math.round(objectPosY)}% (${objectPosY <= 20 ? "Header / Top" : objectPosY >= 80 ? "Footer / Bottom" : "Center"})`}
                    />

                    <button
                      type="button"
                      onClick={handleResetMediaTransform}
                      className="p-1 rounded text-slate-400 hover:text-amber-300"
                      title="Reset Crop to Fit"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </>
                )}

                {/* Auto-Repeat Toggle Button for Video */}
                {activeMedia.type === "video" && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMedia({
                        ...activeMedia,
                        loop: !(activeMedia.loop ?? true),
                      })
                    }
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors",
                      (activeMedia.loop ?? true)
                        ? "bg-indigo-500/30 text-indigo-300 border-indigo-400 font-bold"
                        : "bg-white/10 text-slate-300 border-white/20"
                    )}
                    title={
                      (activeMedia.loop ?? true)
                        ? "Auto-Repeat ON (Click to play once)"
                        : "Auto-Repeat OFF (Click to loop)"
                    }
                  >
                    <Repeat className="w-3 h-3 text-indigo-400" />
                    <span>{(activeMedia.loop ?? true) ? "Loop" : "1-Shot"}</span>
                  </button>
                )}

                {/* Audio Mute / Unmute Button for Video / Audio */}
                {(activeMedia.type === "video" || activeMedia.type === "audio") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMediaMute();
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors",
                      activeMedia.isMuted
                        ? "bg-rose-500/25 border-rose-500/50 text-rose-300 font-bold"
                        : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    )}
                    title={
                      activeMedia.isMuted
                        ? "Media Audio is Muted (Click to Unmute)"
                        : "Media Audio is Playing (Click to Mute)"
                    }
                  >
                    {activeMedia.isMuted ? (
                      <>
                        <VolumeX className="w-3 h-3 text-rose-400" />
                        <span>Muted</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-emerald-400" />
                        <span>Audio</span>
                      </>
                    )}
                  </button>
                )}

                {/* YouTube Fair-Use & Anti-Reused Content Protection Controls */}
                <button
                  type="button"
                  onClick={() => setFairUseConfig({ enabled: !fairUseConfig.enabled })}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors",
                    fairUseConfig?.enabled
                      ? "bg-amber-500/25 text-amber-300 border-amber-500/50"
                      : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
                  )}
                  title="Toggle YouTube Fair-Use & Anti-Reused Content Safe Mode"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>Fair-Use {fairUseConfig?.enabled ? "ON" : "OFF"}</span>
                </button>

                {fairUseConfig?.enabled && (
                  <>
                    {/* 8-12s Random Jerk / Frame-Skip / Pause Selector */}
                    <select
                      value={`${fairUseConfig?.autoPauseIntervalSec ?? 8}:${fairUseConfig?.antiMatchMode || "jerk-skip"}`}
                      onChange={(e) => {
                        const [sec, mode] = e.target.value.split(":");
                        setFairUseConfig({
                          autoPauseIntervalSec: Number(sec),
                          antiMatchMode: (mode as any) || "jerk-skip",
                        });
                      }}
                      className="bg-slate-900 border border-amber-500/40 rounded px-1.5 py-0.5 text-[10px] text-amber-300 font-mono focus:outline-none"
                      title="Anti-Content ID Jerk / Frame-Skip / Pause Mode"
                    >
                      <option value="0:jerk-skip">Jerk/Pause: Off</option>
                      <option value="8:jerk-skip">8-12s Frame-Skip Jerk (Best)</option>
                      <option value="8:micro-pause">8-12s Micro-Pause (0.4s)</option>
                      <option value="10:pause">10s Full Pause (1.8s)</option>
                      <option value="15:pause">15s Full Pause (1.8s)</option>
                    </select>

                    {/* Purani Movies Wali Bareek Lines (Vintage Scratches) Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setFairUseConfig({
                          vintageLinesOverlay: !(fairUseConfig?.vintageLinesOverlay ?? true),
                        })
                      }
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors",
                        (fairUseConfig?.vintageLinesOverlay ?? true)
                          ? "bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold"
                          : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
                      )}
                      title="Toggle Old-Movie Fine Vertical Lines & Scratches Overlay"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Lines {(fairUseConfig?.vintageLinesOverlay ?? true) ? "ON" : "OFF"}</span>
                    </button>

                    {/* Dynamic Film Grain / Micro-Noise Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setFairUseConfig({
                          filmGrainOverlay: !(fairUseConfig?.filmGrainOverlay ?? true),
                        })
                      }
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors",
                        (fairUseConfig?.filmGrainOverlay ?? true)
                          ? "bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold"
                          : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
                      )}
                      title="Toggle Dynamic Film-Grain Adjustment Layer"
                    >
                      <span>Grain {(fairUseConfig?.filmGrainOverlay ?? true) ? "ON" : "OFF"}</span>
                    </button>

                    {/* Mirror Video Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setFairUseConfig({
                          mirrorMediaVideo: !fairUseConfig?.mirrorMediaVideo,
                        })
                      }
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors",
                        fairUseConfig?.mirrorMediaVideo
                          ? "bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold"
                          : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
                      )}
                      title="Mirror / Flip Media Horizontally for Copyright Protection"
                    >
                      <span>Flip {fairUseConfig?.mirrorMediaVideo ? "ON" : "OFF"}</span>
                    </button>
                  </>
                )}

                {/* Reset to Default */}
                {participantBounds["active-media"] && (
                  <button
                    type="button"
                    onClick={() => resetParticipantBounds("active-media")}
                    className="px-2 py-0.5 hover:bg-white/15 rounded text-amber-300 hover:text-amber-200 text-[10px] font-medium flex items-center gap-1 transition-colors"
                    title="Reset Media Position"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                {/* Media Stage Position / Slot Selector (Left, Right, Middle, Corners) */}
                {totalPlannedSlots >= 1 && !isSoloOrCinema && (
                  <div className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-400/50 rounded-lg px-1.5 py-0.5">
                    <span className="text-[9px] font-bold text-indigo-300 uppercase">Pos:</span>
                    <select
                      value={mediaSlotIndex}
                      onChange={(e) => setMediaSlotIndex(Number(e.target.value))}
                      className="bg-transparent text-[10px] font-bold text-white focus:outline-none cursor-pointer"
                      title="Choose where Media appears on stage (Left, Right, Middle, or Grid Slot)"
                    >
                      {activeLayout === "cropped" || activeLayout === "podcast" || activeLayout === "side-by-side" || activeLayout === "fit" || activeLayout === "interview" ? (
                        <>
                          <option value={0} className="bg-slate-900">◧ Left Side</option>
                          <option value={1} className="bg-slate-900">◨ Right Side (Host Left)</option>
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
                          <option value={0} className="bg-slate-900">★ Hero Left (Large)</option>
                          <option value={1} className="bg-slate-900">▤ Side Top-Right (Small)</option>
                          {totalPlannedSlots >= 2 && (
                            <option value={2} className="bg-slate-900">▤ Side Btm-Right (Small)</option>
                          )}
                        </>
                      ) : activeLayout === "stacked" || activeLayout === "presentation" ? (
                        <>
                          <option value={0} className="bg-slate-900">⬆ Top Window</option>
                          <option value={1} className="bg-slate-900">⬇ Bottom Window</option>
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
                  title="Solo Media Fullscreen (click again to restore previous layout)"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>{soloTargetId === "active-media" ? "Un-Solo" : "Solo"}</span>
                </button>

                {/* Change / Replace Media from library */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent("livestudio-open-tab", { detail: "media" }));
                  }}
                  className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
                  title="Change / Select Media from Library"
                >
                  <MonitorUp className="w-3 h-3 text-emerald-400" />
                  <span>Replace</span>
                </button>

                {/* Stop / Remove Media */}
                <button
                  type="button"
                  onClick={() => {
                    resetParticipantBounds("active-media");
                    setActiveMedia(null);
                  }}
                  className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-medium transition-colors"
                  title="Stop and Remove Media from Stage"
                >
                  Remove
                </button>

                {/* Deselect / Close Toolbar (shown when selected) */}
                {isMediaSelected && (
                  <button
                    type="button"
                    onClick={() => setSelectedParticipantId(null)}
                    className="p-1 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 rounded transition-colors"
                    title="Deselect window"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
          </div>
        )}
        {orderedParticipants.map((p, idx) => {
          const calculatedBounds = stageLayoutResult.participantBounds[idx] || getDefaultSlotBounds(
            activeLayout,
            idx,
            orderedParticipants.length,
            layoutSplitRatio,
            customLayoutConfig
          );
          const isPip = activeLayout === "pip" || customLayoutConfig.mode === "pip";
          const bounds: ParticipantBounds =
            isPip && participantBounds[p.id]
              ? participantBounds[p.id]
              : calculatedBounds;
          const isSelected = String(selectedParticipantId) === String(p.id);
          const isThisDragging = activeDragState?.participantId === p.id;

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
                  activeLayout === "custom" && customLayoutConfig?.gap !== undefined
                    ? `${customLayoutConfig.gap / 2}px`
                    : undefined,
                transition: isThisDragging ? "none" : "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseDown={(e) => handleTileMouseDown(e, p, bounds)}
              onTouchStart={(e) => handleTileTouchStart(e, p, bounds)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedParticipantId(p.id);
              }}
              className={cn(
                "overflow-visible select-none transition-shadow",
                isSelected
                  ? cn(
                      "ring-2 ring-indigo-500",
                      isFullBleedLayout ? "rounded-none" : "rounded-2xl",
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
                  isFullBleedLayout
                    ? isSelected
                      ? "border border-indigo-400 rounded-none bg-[#0c0c14]"
                      : "border-0 rounded-none bg-[#0c0c14]"
                    : cn(
                        "border rounded-2xl bg-[#0c0c14]",
                        isSelected
                          ? "border-indigo-400"
                          : "border-white/10 hover:border-indigo-400/50"
                      )
                )}
                style={{
                  borderRadius:
                    activeLayout === "custom" && customLayoutConfig?.borderRadius !== undefined
                      ? `${customLayoutConfig.borderRadius}px`
                      : isFullBleedLayout
                      ? "0px"
                      : undefined,
                  boxShadow:
                    activeLayout === "custom" && customLayoutConfig?.showSpeakerBorder && p.isSpeaking
                      ? `0 0 20px ${customLayoutConfig.highlightColor || "#6366f1"}`
                      : undefined,
                  borderColor:
                    activeLayout === "custom" && customLayoutConfig?.showSpeakerBorder && p.isSpeaking
                      ? (customLayoutConfig.highlightColor || "#6366f1")
                      : undefined,
                }}
              >
                {renderTile(p, idx, "w-full h-full")}
              </div>

              {/* StreamYard Floating Action Pill Toolbar for Selected Participant */}
              {isSelected && (
                <div
                  className={cn(
                    "absolute z-50 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0c0c16]/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-indigo-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.85)] pointer-events-auto whitespace-nowrap animate-in fade-in duration-150 max-w-[calc(100%-16px)] overflow-x-auto scrollbar-none",
                    bounds.height >= 85 || bounds.y < 12 ? "top-3" : "-top-11"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {/* Participant Name Tag */}
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded bg-white/10 max-w-[110px] truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {p.name || "Guest"}
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
                    title={p.micOn ? "Mute participant microphone" : "Unmute participant microphone"}
                  >
                    {p.micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                    <span>{p.micOn ? "Mic ON" : "Muted"}</span>
                  </button>

                  <span className="w-px h-3 bg-white/20" />

                  {/* Swap Participant Slot Order (Left / Right / Up / Down) */}
                  {orderedParticipants.length >= 2 && (
                    <div className="flex items-center gap-0.5 bg-white/10 rounded-lg border border-white/15 px-1 py-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveParticipantOrder(p.id, "left")}
                        className="px-1 text-[10px] font-bold text-cyan-300 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Swap with previous slot (Move Left / Up)"
                      >
                        ◄
                      </button>
                      <span className="text-[9px] text-slate-300 font-mono px-0.5">Slot {idx + 1}</span>
                      <button
                        type="button"
                        disabled={idx === orderedParticipants.length - 1}
                        onClick={() => moveParticipantOrder(p.id, "right")}
                        className="px-1 text-[10px] font-bold text-cyan-300 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Swap with next slot (Move Right / Down)"
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
                    title="Instantly Solo this speaker full-screen (click again to restore previous layout)"
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
                    title={
                      customLayoutConfig.heroParticipantId === p.id
                        ? "Currently Spotlighted (Click to un-spotlight)"
                        : "Spotlight this participant as primary speaker"
                    }
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
                    title={
                      (tileTransforms[p.id]?.fitMode || "cover") === "contain"
                        ? "Currently: Fit to Frame (letterboxed). Click to Fill frame."
                        : "Currently: Fill Frame (cropped). Click to Fit frame (16:9 full view)."
                    }
                  >
                    <Crop className="w-3 h-3 text-indigo-400" />
                    <span>{(tileTransforms[p.id]?.fitMode || "cover") === "contain" ? "Fit (16:9)" : "Fill"}</span>
                  </button>

                  {/* PiP repositioning if in PiP mode */}
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
                      title="Move PiP to next corner"
                    >
                      <Move className="w-3 h-3 text-slate-300" />
                      <span>Corner</span>
                    </button>
                  )}

                  {/* Reset to Grid (only shown if custom bounds are attached to this participant) */}
                  {participantBounds[p.id] && (
                    <button
                      type="button"
                      onClick={() => resetParticipantBounds(p.id)}
                      className="px-2 py-0.5 hover:bg-white/15 rounded text-amber-300 hover:text-amber-200 text-[10px] font-medium flex items-center gap-1 transition-colors"
                      title="Reset window to default layout position"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Reset</span>
                    </button>
                  )}

                  {/* Deselect / Close */}
                  <button
                    type="button"
                    onClick={() => setSelectedParticipantId(null)}
                    className="p-1 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 rounded transition-colors"
                    title="Close selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* StreamYard Ghost / Placeholder Slots: Waiting for Guest to join */}
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
                  customLayoutConfig
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
                      activeLayout === "custom" && customLayoutConfig?.gap !== undefined
                        ? `${customLayoutConfig.gap / 2}px`
                        : undefined,
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  className="select-none pointer-events-auto"
                >
                  <div
                    style={{
                      borderRadius:
                        activeLayout === "custom" && customLayoutConfig?.borderRadius !== undefined
                          ? `${customLayoutConfig.borderRadius}px`
                          : isFullBleedLayout
                          ? "0px"
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
                      title="Copy invite link to share with guest"
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

        {/* StreamYard Responsive Stage Split Dividers (Multi-Layout Parity) */}
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

          if (isVerticalSplit) {
            return (
              <div
                style={{ left: `${layoutSplitRatio}%` }}
                className="absolute top-1 bottom-1 -ml-3 w-6 flex items-center justify-center cursor-col-resize select-none group/divider z-30 pointer-events-auto"
                onMouseDown={(e) => handleSplitDividerMouseDown(e, "vertical")}
                onTouchStart={(e) => handleSplitDividerTouchStart(e, "vertical")}
                title={`Drag to resize stage split (${layoutSplitRatio}% / ${100 - layoutSplitRatio}%)`}
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
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#050508] shadow-2xl flex flex-col justify-center mx-auto my-auto select-none group/stage"
        style={{
          width: stageBox ? `${stageBox.width}px` : "100%",
          height: stageBox ? `${stageBox.height}px` : undefined,
          aspectRatio: "16 / 9",
          maxWidth: "100%",
          maxHeight: "100%",
          backgroundImage: !isFullBleedLayout && activeBackgroundUrl && !isVideoBg ? `url(${activeBackgroundUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
      {/* Real-time Video Background Layer (Seamless continuous loop) */}
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

      {/* Global Transparent Drag Overlay (captures all pointer events anywhere on screen while dragging/resizing) */}
      {(activeDragState || isDraggingSplit) && (
        <div
          className={cn(
            "fixed inset-0 z-50 select-none bg-transparent pointer-events-auto",
            isDraggingSplit && "cursor-col-resize",
            activeDragState?.type === "move" && "cursor-move",
            activeDragState?.type === "resize" && (
              activeDragState.handle === "nw" || activeDragState.handle === "se"
                ? "cursor-nwse-resize"
                : activeDragState.handle === "ne" || activeDragState.handle === "sw"
                ? "cursor-nesw-resize"
                : activeDragState.handle === "n" || activeDragState.handle === "s"
                ? "cursor-ns-resize"
                : "cursor-ew-resize"
            )
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

      {/* StreamYard Stage Window Quick-Split Controller (appears when 2+ slots or participants on stage and no tile is selected) */}
      {(onStageParticipants.length >= 2 || expectedSlots >= 2) && (
        <div
          className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-200 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 flex items-center gap-1.5 shadow-2xl pointer-events-auto",
            selectedParticipantId !== null
              ? "opacity-0 pointer-events-none"
              : "opacity-0 group-hover/stage:opacity-100 hover:opacity-100"
          )}
        >
          <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider">Split:</span>
          {(activeLayout === "three-equal" || (activeLayout === "custom" && customLayoutConfig?.mode === "three-equal")
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
          data-stage-overlay="true"
          style={getOverlayStyle()}
          className="group/overlay cursor-move select-none"
          onMouseDown={handleOverlayMouseDown}
          onTouchStart={handleOverlayTouchStart}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick-action Mini Dock: Placed outside cropped container so it NEVER gets clipped by circle or rounded corners */}
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
            className={cn(
              "px-3.5 py-1.5 flex items-center gap-2 transition-all select-none",
              logoConfig?.isTransparentBg
                ? "bg-transparent border-0 shadow-none"
                : "rounded-xl backdrop-blur-md border shadow-xl"
            )}
            style={
              logoConfig?.isTransparentBg
                ? undefined
                : {
                    backgroundColor: `${logoConfig?.bgColor || "#000000"}${Math.round(((logoConfig?.bgOpacity ?? 75) / 100) * 255).toString(16).padStart(2, "0")}`,
                    borderColor: `${activeThemeColor}50`,
                  }
            }
          >
            <span 
              className="w-2 h-2 rounded-full animate-pulse shadow-sm shrink-0" 
              style={{ backgroundColor: activeThemeColor }} 
            />
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
          </div>
        </div>
      )}

      {/* Lower-Third Banner */}
      {activeBanner && activeBanner.isShowing && (
        <div className={cn(
          "absolute left-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300",
          showTicker ? "bottom-16" : "bottom-10"
        )}>
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

      {/* Interactive Broadcast-Grade Telestrator & On-Screen Drawing Canvas */}
      <StageTelestrator />

      {/* Pinned Stream Message Overlay (StreamYard Lower-Third Broadcast Style) */}
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
                commentConfig?.theme === "minimal"
                  ? `${activeThemeColor}`
                  : commentConfig?.theme === "classic"
                  ? `${activeThemeColor}`
                  : `${activeThemeColor}60`,
              boxShadow: `0 16px 40px rgba(0, 0, 0, 0.85), 0 0 30px ${activeThemeColor}20`,
            }}
          >
            {/* Commenter Avatar */}
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
                {/* Mini Platform Icon Badge overlayed on Avatar */}
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

            {/* Comment Body */}
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

                {/* Quick Close Button */}
                <button
                  type="button"
                  onClick={() => pinMessage(null)}
                  className="opacity-60 hover:opacity-100 p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-opacity"
                  title="Hide comment from stream"
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
            borderBottom: `3px solid ${activeThemeColor}`
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
                animationDuration: tickerConfig?.speed === "slow" ? "75s" : tickerConfig?.speed === "fast" ? "30s" : "50s"
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
          />
          <div className="absolute top-6 left-6 z-30 animate-in fade-in">
            <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-cyan-500/40 flex items-center gap-2.5 shadow-xl">
              <span className={cn("w-2 h-2 rounded-full", activeMedia.isMuted ? "bg-rose-400" : "bg-cyan-400 animate-ping")} />
              <span className="text-[11px] font-medium text-cyan-200 truncate max-w-[160px]">
                🎵 {activeMedia.name}
              </span>
              <button
                type="button"
                onClick={toggleMediaMute}
                className={cn(
                  "p-1 rounded text-[10px] flex items-center gap-1 transition-colors",
                  activeMedia.isMuted ? "text-rose-400 hover:text-rose-300" : "text-cyan-300 hover:text-cyan-200"
                )}
                title={activeMedia.isMuted ? "Unmute Background Audio" : "Mute Background Audio"}
              >
                {activeMedia.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
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

      {/* Scene Custom Title / Text Card (StreamYard Paid Plan) */}
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

      {/* Scene Transition Fade Overlay (StreamYard Paid Plan) */}
      {isSceneTransitioning && (
        <div className="absolute inset-0 bg-[#07070d]/40 backdrop-blur-[2px] z-40 pointer-events-none transition-opacity duration-300 animate-in fade-in" />
      )}
      </div>
    </div>
  );
};
