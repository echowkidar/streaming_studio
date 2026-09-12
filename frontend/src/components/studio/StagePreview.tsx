"use client";

import React, { useRef, useState } from "react";
import {
  Video,
  Volume2,
  VolumeX,
  EyeOff,
  X,
  Move,
  Maximize2,
  Crop,
  Lock,
  Unlock,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Crosshair,
} from "lucide-react";
import { useStudioStore, ParticipantBounds } from "@/stores/studio.store";
import { VideoTrackView } from "./VideoTrackView";
import { Participant } from "@/types";
import { cn } from "@/lib/utils";
import { getDefaultSlotBounds } from "@/lib/layoutBounds";

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
    // Freeform window bounds & Selection Tool
    participantBounds,
    setParticipantBounds,
    resetParticipantBounds,
    resetAllParticipantBounds,
    selectedParticipantId,
    setSelectedParticipantId,
    bringToFront,
    sendToBack,
  } = useStudioStore();

  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");
  const hasAnyCustomBounds = Object.keys(participantBounds).length > 0;

  const logoPositionClasses = {
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6",
    "bottom-left": "bottom-14 left-6",
    "bottom-right": "bottom-14 right-6",
  };

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

  // Split Divider Drag Handlers (60fps requestAnimationFrame)
  const handleSplitDividerMouseDown = (e: React.MouseEvent) => {
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
        const availableWidth = Math.max(10, rect.width - 24);
        const relativeX = moveEvt.clientX - (rect.left + 12);
        const percentage = Math.round((relativeX / availableWidth) * 100);
        const clamped = Math.max(20, Math.min(80, percentage));
        setLayoutSplitRatio(clamped);
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

  const handleSplitDividerTouchStart = (e: React.TouchEvent) => {
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
        const availableWidth = Math.max(10, rect.width - 24);
        const relativeX = touchEvt.touches[0].clientX - (rect.left + 12);
        const percentage = Math.round((relativeX / availableWidth) * 100);
        const clamped = Math.max(20, Math.min(80, percentage));
        setLayoutSplitRatio(clamped);
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
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".no-drag")) return;

    e.preventDefault();
    e.stopPropagation();

    setSelectedParticipantId(p.id);

    if (!stageContainerRef.current) return;

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
    if (!stageContainerRef.current) return;

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

  // 8-Handle Window Resizing (Corner & Edge Handles with 16:9 ratio lock or freeform)
  const handleStartResize = (
    e: React.MouseEvent | React.TouchEvent,
    handle: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w",
    participantId: string | number,
    currentBounds: ParticipantBounds
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!stageContainerRef.current) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const isLocked = currentBounds.isLockedRatio !== false;

    dragSessionRef.current = {
      type: "resize",
      handle,
      participantId,
      startClientX: clientX,
      startClientY: clientY,
      startBounds: { ...currentBounds },
      isLockedRatio: isLocked,
      hasMoved: true,
    };

    setActiveDragState({ type: "resize", handle, participantId });

    let rafId: number | null = null;

    const onMove = (moveX: number, moveY: number) => {
      if (!dragSessionRef.current || !stageContainerRef.current) return;
      if (rafId !== null) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!dragSessionRef.current || !stageContainerRef.current) return;
        const rect = stageContainerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const deltaXPercent = ((moveX - clientX) / rect.width) * 100;
        const deltaYPercent = ((moveY - clientY) / rect.height) * 100;

        const { startBounds, isLockedRatio, participantId, handle: activeHandle } = dragSessionRef.current;

        let newX = startBounds.x;
        let newY = startBounds.y;
        let newWidth = startBounds.width;
        let newHeight = startBounds.height;

        const MIN_SIZE = 12; // Minimum 12% width/height so tile is never lost

        switch (activeHandle) {
          case "se": {
            newWidth = Math.max(MIN_SIZE, Math.min(100 - startBounds.x, startBounds.width + deltaXPercent));
            newHeight = isLockedRatio
              ? Math.min(100 - startBounds.y, newWidth)
              : Math.max(MIN_SIZE, Math.min(100 - startBounds.y, startBounds.height + deltaYPercent));
            if (isLockedRatio) newWidth = newHeight;
            break;
          }
          case "sw": {
            newWidth = Math.max(MIN_SIZE, Math.min(startBounds.x + startBounds.width, startBounds.width - deltaXPercent));
            newX = startBounds.x + (startBounds.width - newWidth);
            newHeight = isLockedRatio
              ? Math.min(100 - startBounds.y, newWidth)
              : Math.max(MIN_SIZE, Math.min(100 - startBounds.y, startBounds.height + deltaYPercent));
            if (isLockedRatio) {
              newWidth = newHeight;
              newX = startBounds.x + (startBounds.width - newWidth);
            }
            break;
          }
          case "ne": {
            newWidth = Math.max(MIN_SIZE, Math.min(100 - startBounds.x, startBounds.width + deltaXPercent));
            newHeight = isLockedRatio
              ? Math.min(startBounds.y + startBounds.height, newWidth)
              : Math.max(MIN_SIZE, Math.min(startBounds.y + startBounds.height, startBounds.height - deltaYPercent));
            newY = startBounds.y + (startBounds.height - newHeight);
            if (isLockedRatio) {
              newWidth = newHeight;
            }
            break;
          }
          case "nw": {
            newWidth = Math.max(MIN_SIZE, Math.min(startBounds.x + startBounds.width, startBounds.width - deltaXPercent));
            newHeight = isLockedRatio
              ? Math.min(startBounds.y + startBounds.height, newWidth)
              : Math.max(MIN_SIZE, Math.min(startBounds.y + startBounds.height, startBounds.height - deltaYPercent));
            newX = startBounds.x + (startBounds.width - newWidth);
            newY = startBounds.y + (startBounds.height - newHeight);
            if (isLockedRatio) {
              newWidth = newHeight;
              newX = startBounds.x + (startBounds.width - newWidth);
              newY = startBounds.y + (startBounds.height - newHeight);
            }
            break;
          }
          case "e": {
            newWidth = Math.max(MIN_SIZE, Math.min(100 - startBounds.x, startBounds.width + deltaXPercent));
            if (isLockedRatio) {
              newHeight = Math.min(100 - startBounds.y, newWidth);
              newWidth = newHeight;
            }
            break;
          }
          case "w": {
            newWidth = Math.max(MIN_SIZE, Math.min(startBounds.x + startBounds.width, startBounds.width - deltaXPercent));
            newX = startBounds.x + (startBounds.width - newWidth);
            if (isLockedRatio) {
              newHeight = Math.min(100 - startBounds.y, newWidth);
              newWidth = newHeight;
              newX = startBounds.x + (startBounds.width - newWidth);
            }
            break;
          }
          case "s": {
            newHeight = Math.max(MIN_SIZE, Math.min(100 - startBounds.y, startBounds.height + deltaYPercent));
            if (isLockedRatio) {
              newWidth = Math.min(100 - startBounds.x, newHeight);
              newHeight = newWidth;
            }
            break;
          }
          case "n": {
            newHeight = Math.max(MIN_SIZE, Math.min(startBounds.y + startBounds.height, startBounds.height - deltaYPercent));
            newY = startBounds.y + (startBounds.height - newHeight);
            if (isLockedRatio) {
              newWidth = Math.min(100 - startBounds.x, newHeight);
              newHeight = newWidth;
              newY = startBounds.y + (startBounds.height - newHeight);
            }
            break;
          }
        }

        setParticipantBounds(participantId, {
          x: Number(Math.max(0, Math.min(100 - newWidth, newX)).toFixed(1)),
          y: Number(Math.max(0, Math.min(100 - newHeight, newY)).toFixed(1)),
          width: Number(newWidth.toFixed(1)),
          height: Number(newHeight.toFixed(1)),
          isLockedRatio,
        });
      });
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      onMove(moveEvt.clientX, moveEvt.clientY);
    };

    const handleTouchMove = (touchEvt: TouchEvent) => {
      if (touchEvt.touches.length > 0) {
        onMove(touchEvt.touches[0].clientX, touchEvt.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      dragSessionRef.current = null;
      setActiveDragState(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  };

  // Action Pill Controls
  const handleToggleRatioLock = (id: string | number, currentBounds: ParticipantBounds) => {
    const next = currentBounds.isLockedRatio === false ? true : false;
    setParticipantBounds(id, { isLockedRatio: next });
  };

  const handleCenterTile = (id: string | number, currentBounds: ParticipantBounds) => {
    const newX = Math.max(0, (100 - currentBounds.width) / 2);
    const newY = Math.max(0, (100 - currentBounds.height) / 2);
    setParticipantBounds(id, {
      x: Number(newX.toFixed(1)),
      y: Number(newY.toFixed(1)),
    });
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
      <div key={p.id || index} className={cn("relative w-full h-full", extraClasses)}>
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

  // Layout Engine: StreamYard-Parity Canvas with Selection Tool & Independent Window Resizing
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

    // Unified Stage Canvas with Independent Moving & Resizing for all Participants
    return (
      <div className="w-full h-full relative p-2 select-none">
        {onStageParticipants.map((p, idx) => {
          const defaultBounds = getDefaultSlotBounds(
            activeLayout,
            idx,
            onStageParticipants.length,
            layoutSplitRatio
          );
          const bounds: ParticipantBounds = participantBounds[p.id] || defaultBounds;
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
                transition: isThisDragging ? "none" : "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseDown={(e) => handleTileMouseDown(e, p, bounds)}
              onTouchStart={(e) => handleTileTouchStart(e, p, bounds)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedParticipantId(p.id);
              }}
              className={cn(
                "rounded-2xl overflow-visible select-none border transition-shadow",
                isSelected
                  ? "ring-2 ring-indigo-500 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.5)] cursor-move"
                  : "border-white/10 hover:border-indigo-400/50 cursor-pointer"
              )}
            >
              {/* Inner Video Container */}
              <div className="w-full h-full rounded-2xl overflow-hidden relative pointer-events-auto">
                {renderTile(p, idx, "w-full h-full")}
              </div>

              {/* Floating Action Pill Toolbar (Above or Below Selected Window) */}
              {isSelected && (
                <div
                  className={cn(
                    "absolute z-50 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#0c0c16]/95 backdrop-blur-md px-2 py-1 rounded-xl border border-indigo-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.85)] pointer-events-auto whitespace-nowrap animate-in fade-in duration-150",
                    bounds.y < 12 ? "-bottom-11" : "-top-11"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {/* Drag Move Handle */}
                  <span className="text-slate-400 p-0.5 cursor-move" title="Click and drag window to move">
                    <Move className="w-3.5 h-3.5" />
                  </span>

                  {/* Participant Name Tag */}
                  <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded bg-white/10 max-w-[100px] truncate">
                    {p.name || "Guest"}
                  </span>

                  <span className="w-px h-3 bg-white/20" />

                  {/* 16:9 Aspect Ratio Lock Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleRatioLock(p.id, bounds)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition-colors",
                      bounds.isLockedRatio !== false
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        : "bg-white/10 text-slate-300 border-white/20"
                    )}
                    title={
                      bounds.isLockedRatio !== false
                        ? "16:9 Ratio Locked (Click to allow freeform resize)"
                        : "Freeform Ratio Active (Click to lock 16:9)"
                    }
                  >
                    {bounds.isLockedRatio !== false ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{bounds.isLockedRatio !== false ? "16:9" : "Free"}</span>
                  </button>

                  {/* Center on Stage */}
                  <button
                    type="button"
                    onClick={() => handleCenterTile(p.id, bounds)}
                    className="p-1 hover:bg-white/15 rounded text-slate-300 hover:text-white transition-colors"
                    title="Center on Stage"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>

                  {/* Layer Up */}
                  <button
                    type="button"
                    onClick={() => bringToFront(p.id)}
                    className="p-1 hover:bg-white/15 rounded text-slate-300 hover:text-white transition-colors"
                    title="Bring Forward"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Layer Down */}
                  <button
                    type="button"
                    onClick={() => sendToBack(p.id)}
                    className="p-1 hover:bg-white/15 rounded text-slate-300 hover:text-white transition-colors"
                    title="Send Backward"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3 bg-white/20" />

                  {/* Reset to Grid */}
                  <button
                    type="button"
                    onClick={() => resetParticipantBounds(p.id)}
                    className="px-1.5 py-0.5 hover:bg-white/15 rounded text-amber-300 hover:text-amber-200 text-[10px] font-medium flex items-center gap-1 transition-colors"
                    title="Reset to Grid position"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>

                  {/* Deselect */}
                  <button
                    type="button"
                    onClick={() => setSelectedParticipantId(null)}
                    className="p-1 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 rounded transition-colors"
                    title="Deselect window"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 8 Resize Handles (Rendered when selected) */}
              {isSelected && (
                <>
                  {/* 4 Corner Handles */}
                  <div
                    onMouseDown={(e) => handleStartResize(e, "nw", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "nw", p.id, bounds)}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-40"
                    title="Resize Top-Left"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, "ne", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "ne", p.id, bounds)}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md cursor-nesw-resize hover:scale-125 transition-transform z-40"
                    title="Resize Top-Right"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, "se", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "se", p.id, bounds)}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-40"
                    title="Resize Bottom-Right"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, "sw", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "sw", p.id, bounds)}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md cursor-nesw-resize hover:scale-125 transition-transform z-40"
                    title="Resize Bottom-Left"
                  />

                  {/* 4 Edge Handles */}
                  <div
                    onMouseDown={(e) => handleStartResize(e, "n", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "n", p.id, bounds)}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ns-resize hover:scale-125 transition-transform z-40"
                    title="Resize Top Edge"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, "s", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "s", p.id, bounds)}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ns-resize hover:scale-125 transition-transform z-40"
                    title="Resize Bottom Edge"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, "w", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "w", p.id, bounds)}
                    className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ew-resize hover:scale-125 transition-transform z-40"
                    title="Resize Left Edge"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, "e", p.id, bounds)}
                    onTouchStart={(e) => handleStartResize(e, "e", p.id, bounds)}
                    className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-ew-resize hover:scale-125 transition-transform z-40"
                    title="Resize Right Edge"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Center Split Divider (Visible in 2-person side-by-side when neither tile has custom bounds) */}
        {onStageParticipants.length === 2 && !hasAnyCustomBounds && (activeLayout === "side-by-side" || activeLayout === "podcast" || activeLayout === "interview") && (
          <div
            style={{ left: `${layoutSplitRatio}%` }}
            className="absolute top-0 bottom-0 -ml-2 w-4 flex items-center justify-center cursor-col-resize select-none group/divider z-30 pointer-events-auto"
            onMouseDown={handleSplitDividerMouseDown}
            onTouchStart={handleSplitDividerTouchStart}
            title="Drag to resize windows (Left: Host, Right: Guest)"
          >
            <div className="w-1 h-full rounded-full bg-white/15 group-hover/divider:bg-indigo-500 transition-colors" />
            <div className="absolute w-5 h-8 rounded-full bg-black/90 border border-white/20 flex items-center justify-center shadow-2xl group-hover/divider:border-indigo-400 group-hover/divider:scale-110 transition-all">
              <span className="w-0.5 h-2 bg-slate-300 rounded-full" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={stageContainerRef}
      onClick={() => setSelectedParticipantId(null)}
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

      {/* StreamYard Stage Window Quick-Split Controller (appears when 2+ on stage and no custom bounds) */}
      {onStageParticipants.length >= 2 && !hasAnyCustomBounds && (
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
