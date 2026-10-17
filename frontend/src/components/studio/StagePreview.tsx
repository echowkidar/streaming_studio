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
  Play,
  Pause,
  RotateCw,
  Clipboard,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useStudioStore, ParticipantBounds, CustomLayoutConfig, MediaFileItem, TacticalMapConfig } from "@/stores/studio.store";
import { VideoTrackView } from "./VideoTrackView";
import { Participant } from "@/types";
import { cn } from "@/lib/utils";
import { getDefaultSlotBounds, getLayoutExpectedSlots, calculateStageLayout } from "@/lib/layoutBounds";
import { stageBroadcaster } from "@/lib/stageBroadcaster";
import { StageTelestrator } from "./StageTelestrator";
import { TacticalMapStageCanvas, TacticalMapModal } from "./TacticalMapModal";
import { YouTubeLibraryModal, extractYouTubeVideoId } from "./YouTubeLibraryModal";
import { InteractiveWebsiteStageView, WebsiteLibraryModal } from "./WebsiteLibraryModal";

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
    setMediaVolume,
    toggleParticipantMic,
    mediaSlotIndex,
    setMediaSlotIndex,
    moveParticipantOrder,
    soloTargetId,
    toggleSoloParticipant,
    scenes,
    activeSceneId,
    switchScene,
    isStageCropped,
    setIsStageCropped,
    fairUseConfig,
    setFairUseConfig,
    activeTextCard,
    nextSlide,
    prevSlide,
    isSceneTransitioning,
    isMediaTransitioning,
    addMediaLibraryItem,
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
  const mediaFitMode = (mediaTransform.fitMode as "contain" | "cover") || defaultMediaFit;
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
  const effectiveTransformOriginX = effectiveObjectPosX;
  const isPipMode = activeLayout === "pip" || customLayoutConfig.mode === "pip";
  const normalizedMediaVolumePct = Math.max(0, Math.min(100, activeMedia?.volume ?? 100));
  const [isMediaHovered, setIsMediaHovered] = useState(false);

  const [isDraggingMediaPan, setIsDraggingMediaPan] = useState(false);
  const [ytStreamAttempt, setYtStreamAttempt] = useState<0 | 1>(0);
  const [useYtIframeFallback, setUseYtIframeFallback] = useState(false);
  const [mediaBoundsHistory, setMediaBoundsHistory] = useState<Array<ParticipantBounds | null>>([]);
  const mediaPanStartRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0, rectWidth: 1, rectHeight: 1 });
  const [mediaLoadError, setMediaLoadError] = useState(false);
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

  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [isTacticalMapModalOpen, setIsTacticalMapModalOpen] = useState(false);
  const [isYouTubeLibraryModalOpen, setIsYouTubeLibraryModalOpen] = useState(false);
  const [isWebsiteLibraryModalOpen, setIsWebsiteLibraryModalOpen] = useState(false);

  React.useEffect(() => {
    setMediaLoadError(false);
    setYtStreamAttempt(0);
    setUseYtIframeFallback(false);
  }, [activeMedia?.id, activeMedia?.url]);

  // Media Transport state for active stage video
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoSpeed, setVideoSpeed] = useState(1.0);
  const mediaCurrentTimeRef = useRef<number>(0);
  const mediaDurationRef = useRef<number>(0);
  const isMediaPausedRef = useRef<boolean>(false);
  const ytTelemetryActiveRef = useRef<boolean>(false);
  const [isYtJerking, setIsYtJerking] = useState<boolean>(false);

  // Media Transport state for active background audio
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const [audioSpeed, setAudioSpeed] = useState(1.0);

  const formatMediaTime = (sec: number): string => {
    if (isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sendYouTubeCommand = (func: string, args: any[] = []) => {
    const iframe = document.getElementById("livestudio-youtube-iframe") as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    }
  };
  const sendYouTubeIframeCommand = sendYouTubeCommand;

  const getActiveHtmlMediaElement = (): HTMLVideoElement | HTMLAudioElement | null => {
    return (
      (document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null) ||
      (document.getElementById("livestudio-background-audio") as HTMLAudioElement | null)
    );
  };

  useEffect(() => {
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (!videoEl) return;

    if (activeMedia?.startTimeSec && activeMedia.startTimeSec > 0) {
      videoEl.currentTime = activeMedia.startTimeSec;
    }

    const updateTime = () => {
      mediaCurrentTimeRef.current = videoEl.currentTime;
      setVideoCurrentTime(videoEl.currentTime);
      if (activeMedia?.endTimeSec && activeMedia.endTimeSec > 0 && videoEl.currentTime >= activeMedia.endTimeSec) {
        if (activeMedia.loop ?? true) {
          videoEl.currentTime = activeMedia.startTimeSec || 0;
          mediaCurrentTimeRef.current = videoEl.currentTime;
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
          isMediaPausedRef.current = true;
          setIsVideoPlaying(false);
          const currentIdx = scenes.findIndex((s) => s.id === activeSceneId);
          if (currentIdx !== -1 && currentIdx < scenes.length - 1) {
            switchScene(scenes[currentIdx + 1].id);
          }
        }
      }
    };
    const updateDuration = () => setVideoDuration(videoEl.duration || 0);
    const onPlay = () => {
      isMediaPausedRef.current = false;
      setIsVideoPlaying(true);
    };
    const onPause = () => {
      isMediaPausedRef.current = true;
      setIsVideoPlaying(false);
    };
    const onRate = () => setVideoSpeed(videoEl.playbackRate);

    videoEl.addEventListener("timeupdate", updateTime);
    videoEl.addEventListener("durationchange", updateDuration);
    videoEl.addEventListener("loadedmetadata", updateDuration);
    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("pause", onPause);
    videoEl.addEventListener("ratechange", onRate);

    isMediaPausedRef.current = videoEl.paused;
    mediaCurrentTimeRef.current = videoEl.currentTime || 0;
    setIsVideoPlaying(!videoEl.paused);
    setVideoCurrentTime(videoEl.currentTime || 0);
    setVideoDuration(videoEl.duration || 0);
    setVideoSpeed(videoEl.playbackRate || 1.0);

    return () => {
      videoEl.removeEventListener("timeupdate", updateTime);
      videoEl.removeEventListener("durationchange", updateDuration);
      videoEl.removeEventListener("loadedmetadata", updateDuration);
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("ratechange", onRate);
    };
  }, [activeMedia?.id, activeMedia?.url, activeMedia?.startTimeSec, activeMedia?.endTimeSec, activeMedia?.loop, scenes, activeSceneId, switchScene]);

  // YouTube IFrame PostMessage Telemetry & Loop / Advance
  useEffect(() => {
    if (activeMedia?.type !== "youtube") return;

    mediaCurrentTimeRef.current = activeMedia.startTimeSec || 0;
    isMediaPausedRef.current = false;
    ytTelemetryActiveRef.current = false;

    const onWindowMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data) return;

        if (data.event === "infoDelivery" && data.info) {
          if (typeof data.info.currentTime === "number") {
            mediaCurrentTimeRef.current = data.info.currentTime;
            ytTelemetryActiveRef.current = true;
            setVideoCurrentTime(data.info.currentTime);
            if (activeMedia.endTimeSec && data.info.currentTime >= activeMedia.endTimeSec) {
              if (activeMedia.loop ?? true) {
                mediaCurrentTimeRef.current = activeMedia.startTimeSec || 0;
                sendYouTubeCommand("seekTo", [activeMedia.startTimeSec || 0, true]);
                sendYouTubeCommand("playVideo");
              } else {
                sendYouTubeCommand("pauseVideo");
                isMediaPausedRef.current = true;
                setIsVideoPlaying(false);
                const currentIdx = scenes.findIndex((s) => s.id === activeSceneId);
                if (currentIdx !== -1 && currentIdx < scenes.length - 1) {
                  switchScene(scenes[currentIdx + 1].id);
                }
              }
            }
          }
          if (typeof data.info.duration === "number" && data.info.duration > 0) {
            setVideoDuration(data.info.duration);
          }
          if (typeof data.info.playerState === "number") {
            const isPlaying = data.info.playerState === 1;
            isMediaPausedRef.current = !isPlaying;
            setIsVideoPlaying(isPlaying);
            if (data.info.playerState === 0) { // ENDED
              if (activeMedia.loop ?? true) {
                mediaCurrentTimeRef.current = activeMedia.startTimeSec || 0;
                sendYouTubeCommand("seekTo", [activeMedia.startTimeSec || 0, true]);
                sendYouTubeCommand("playVideo");
              } else {
                const currentIdx = scenes.findIndex((s) => s.id === activeSceneId);
                if (currentIdx !== -1 && currentIdx < scenes.length - 1) {
                  switchScene(scenes[currentIdx + 1].id);
                }
              }
            }
          }
        }
      } catch {}
    };

    window.addEventListener("message", onWindowMessage);

    const interval = setInterval(() => {
      const iframe = document.getElementById("livestudio-youtube-iframe") as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
        // Unload closed captions and subtitles
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unloadModule", args: ["captions"] }), "*");
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unloadModule", args: ["cc"] }), "*");
      }
    }, 500);

    return () => {
      window.removeEventListener("message", onWindowMessage);
      clearInterval(interval);
    };
  }, [activeMedia?.id, activeMedia?.youtubeId, activeMedia?.startTimeSec, activeMedia?.endTimeSec, activeMedia?.loop, scenes, activeSceneId, switchScene]);

  // YouTube Volume Sync
  useEffect(() => {
    if (activeMedia?.type !== "youtube") return;
    const vol = activeMedia.isMuted ? 0 : Math.min(100, Math.round((activeMedia.volume ?? 100)));
    sendYouTubeCommand("setVolume", [vol]);
    if (activeMedia.isMuted) {
      sendYouTubeCommand("mute");
    } else {
      sendYouTubeCommand("unMute");
    }
  }, [activeMedia?.type, activeMedia?.isMuted, activeMedia?.volume]);

  useEffect(() => {
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (!audioEl) return;
    const updateTime = () => setAudioCurrentTime(audioEl.currentTime);
    const updateDuration = () => setAudioDuration(audioEl.duration || 0);
    const onPlay = () => setIsAudioPlaying(true);
    const onPause = () => setIsAudioPlaying(false);
    const onRate = () => setAudioSpeed(audioEl.playbackRate);

    audioEl.addEventListener("timeupdate", updateTime);
    audioEl.addEventListener("durationchange", updateDuration);
    audioEl.addEventListener("loadedmetadata", updateDuration);
    audioEl.addEventListener("play", onPlay);
    audioEl.addEventListener("pause", onPause);
    audioEl.addEventListener("ratechange", onRate);

    setIsAudioPlaying(!audioEl.paused);
    setAudioCurrentTime(audioEl.currentTime || 0);
    setAudioDuration(audioEl.duration || 0);
    setAudioSpeed(audioEl.playbackRate || 1.0);

    return () => {
      audioEl.removeEventListener("timeupdate", updateTime);
      audioEl.removeEventListener("durationchange", updateDuration);
      audioEl.removeEventListener("loadedmetadata", updateDuration);
      audioEl.removeEventListener("play", onPlay);
      audioEl.removeEventListener("pause", onPause);
      audioEl.removeEventListener("ratechange", onRate);
    };
  }, [activeMedia?.id, activeMedia?.url]);

  const handleTogglePlayVideo = () => {
    if (activeMedia?.type === "youtube") {
      if (isVideoPlaying) {
        sendYouTubeCommand("pauseVideo");
        isMediaPausedRef.current = true;
        setIsVideoPlaying(false);
      } else {
        sendYouTubeCommand("playVideo");
        isMediaPausedRef.current = false;
        setIsVideoPlaying(true);
      }
      return;
    }
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play().catch(() => {});
      isMediaPausedRef.current = false;
      setIsVideoPlaying(true);
    } else {
      videoEl.pause();
      isMediaPausedRef.current = true;
      setIsVideoPlaying(false);
    }
  };

  const handleSeekVideo = (time: number) => {
    if (activeMedia?.type === "youtube") {
      mediaCurrentTimeRef.current = time;
      sendYouTubeCommand("seekTo", [time, true]);
      setVideoCurrentTime(time);
      return;
    }
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, Math.min(videoEl.duration || 0, time));
    mediaCurrentTimeRef.current = videoEl.currentTime;
    setVideoCurrentTime(videoEl.currentTime);
  };

  const handleSkipVideo = (deltaSec: number) => {
    if (activeMedia?.type === "youtube") {
      const cur = mediaCurrentTimeRef.current || videoCurrentTime;
      const nextTime = Math.max(0, Math.min(videoDuration || 0, cur + deltaSec));
      mediaCurrentTimeRef.current = nextTime;
      sendYouTubeCommand("seekTo", [nextTime, true]);
      setVideoCurrentTime(nextTime);
      return;
    }
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, Math.min(videoEl.duration || 0, videoEl.currentTime + deltaSec));
    mediaCurrentTimeRef.current = videoEl.currentTime;
    setVideoCurrentTime(videoEl.currentTime);
  };

  const handleChangeVideoSpeed = (rate: number) => {
    if (activeMedia?.type === "youtube") {
      sendYouTubeCommand("setPlaybackRate", [rate]);
      setVideoSpeed(rate);
      return;
    }
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (!videoEl) return;
    videoEl.playbackRate = rate;
    setVideoSpeed(rate);
  };

  const handleTogglePlayAudio = () => {
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (!audioEl) return;
    if (audioEl.paused) {
      audioEl.play().catch(() => {});
      setIsAudioPlaying(true);
    } else {
      audioEl.pause();
      setIsAudioPlaying(false);
    }
  };

  const handleSeekAudio = (time: number) => {
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (!audioEl) return;
    audioEl.currentTime = Math.max(0, Math.min(audioEl.duration || 0, time));
    setAudioCurrentTime(audioEl.currentTime);
  };

  const handleSkipAudio = (deltaSec: number) => {
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (!audioEl) return;
    audioEl.currentTime = Math.max(0, Math.min(audioEl.duration || 0, audioEl.currentTime + deltaSec));
    setAudioCurrentTime(audioEl.currentTime);
  };

  const handleChangeAudioSpeed = (rate: number) => {
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (!audioEl) return;
    audioEl.playbackRate = rate;
    setAudioSpeed(rate);
  };

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

  // Sync active media video & audio elements with store isMuted and volume (clamped to 0.0-1.0 for HTML elements)
  React.useEffect(() => {
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (videoEl && activeMedia) {
      videoEl.muted = Boolean(activeMedia.isMuted);
      if (typeof activeMedia.volume === "number") {
        videoEl.volume = Math.min(1, Math.max(0, activeMedia.volume > 1 ? activeMedia.volume / 100 : activeMedia.volume));
      }
    }
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (audioEl && activeMedia) {
      audioEl.muted = Boolean(activeMedia.isMuted);
      if (typeof activeMedia.volume === "number") {
        audioEl.volume = Math.min(1, Math.max(0, activeMedia.volume > 1 ? activeMedia.volume / 100 : activeMedia.volume));
      }
    }
  }, [activeMedia?.isMuted, activeMedia?.volume]);

  // Enforce Fair-Use Speed, Unlinked Pitch & 8-12s Random Jerk/Pause even during local Studio Preview
  useEffect(() => {
    if (!activeMedia || !fairUseConfig?.enabled) return;
    const videoEl = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.playbackRate = fairUseConfig.playbackRate || 1.04;
      (videoEl as any).preservesPitch = false;
      (videoEl as any).mozPreservesPitch = false;
      (videoEl as any).webkitPreservesPitch = false;
    }
    const audioEl = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    if (audioEl) {
      audioEl.playbackRate = fairUseConfig.playbackRate || 1.04;
      (audioEl as any).preservesPitch = false;
      (audioEl as any).mozPreservesPitch = false;
      (audioEl as any).webkitPreservesPitch = false;
    }
    if (activeMedia.type !== "video" && activeMedia.type !== "youtube") return;
    if (!fairUseConfig.autoPauseIntervalSec || fairUseConfig.autoPauseIntervalSec <= 0) return;

    let timer: NodeJS.Timeout;
    const runCycle = () => {
      const delayMs =
        fairUseConfig.autoPauseIntervalSec === 8
          ? Math.floor(8000 + Math.random() * 4000) // Random 8s to 12s
          : fairUseConfig.autoPauseIntervalSec * 1000;

      timer = setTimeout(() => {
        if (activeMedia.type === "youtube") {
          const mode = fairUseConfig.antiMatchMode || "jerk-skip";
          if (isMediaPausedRef.current) {
            runCycle();
            return;
          }

          setIsYtJerking(true);
          sendYouTubeCommand("pauseVideo");

          setTimeout(() => {
            const currentSec = mediaCurrentTimeRef.current;
            // Advance +0.3s ONLY when live telemetry confirms currentTime > 2s to NEVER seek to 0:00!
            if (mode === "jerk-skip" && currentSec > 2) {
              const nextSec = currentSec + 0.3;
              mediaCurrentTimeRef.current = nextSec;
              sendYouTubeCommand("seekTo", [nextSec, true]);
            }
            sendYouTubeCommand("playVideo");
            setTimeout(() => {
              setIsYtJerking(false);
            }, 100);
          }, 160);
        } else {
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

  // YouTube IFrame LFO Dynamic Tempo & Volume Envelope Modulation (Anti-Audio Fingerprinting)
  useEffect(() => {
    if (activeMedia?.type !== "youtube" || !fairUseConfig?.enabled || !fairUseConfig?.enableAudioFairUse) return;

    let lfoStep = 0;
    const lfoInterval = setInterval(() => {
      if (isMediaPausedRef.current) return;
      lfoStep++;
      // 1.02x to 1.06x dynamic tempo LFO wave (~1.1s period)
      const baseRate = fairUseConfig.playbackRate || 1.04;
      const rateMod = Number((baseRate + Math.sin(lfoStep * 0.35) * 0.02).toFixed(3));
      sendYouTubeCommand("setPlaybackRate", [rateMod]);

      // Subtle +/- 3% acoustic volume envelope wave
      if (!activeMedia.isMuted) {
        const baseVol = Math.min(100, Math.max(0, activeMedia.volume ?? 100));
        const volMod = Math.round(Math.max(1, Math.min(100, baseVol + Math.sin(lfoStep * 0.28) * 3)));
        sendYouTubeCommand("setVolume", [volMod]);
      }
    }, 1100);

    return () => {
      clearInterval(lfoInterval);
      if (activeMedia?.type === "youtube") {
        sendYouTubeCommand("setPlaybackRate", [fairUseConfig.playbackRate || 1.04]);
        const vol = activeMedia.isMuted ? 0 : Math.min(100, Math.round(activeMedia.volume ?? 100));
        sendYouTubeCommand("setVolume", [vol]);
      }
    };
  }, [
    activeMedia?.id,
    activeMedia?.type,
    fairUseConfig?.enabled,
    fairUseConfig?.enableAudioFairUse,
    fairUseConfig?.playbackRate,
    activeMedia?.volume,
    activeMedia?.isMuted,
  ]);

  // Real-time 60FPS breathScale oscillation loop (mediaZoom * breathScale)
  const [breathScale, setBreathScale] = useState<number>(1.0);
  const isBreathingActive = Boolean(fairUseConfig?.enabled && fairUseConfig?.isBreathingEnabled);
  const breathIntensity = fairUseConfig?.breathingIntensity || "subtle";

  useEffect(() => {
    if (!isBreathingActive) {
      setBreathScale(1.0);
      return;
    }
    let animId: number;
    const amp = breathIntensity === "strong" ? 0.09 : breathIntensity === "medium" ? 0.055 : 0.03;
    const animate = (time: number) => {
      const factor = 1 + amp * (1 + Math.sin(time / 1200));
      setBreathScale(factor);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isBreathingActive, breathIntensity]);

  // Global Clipboard Screenshot Paste (Ctrl+V / Cmd+V) & 📋 Paste Button
  const handlePasteBlob = React.useCallback(
    (blob: Blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newItem: MediaFileItem = {
          id: `media-screenshot-${Date.now()}`,
          name: `Screenshot_${new Date().toLocaleTimeString().replace(/:/g, "-")}.png`,
          type: "image",
          url: dataUrl,
          thumbnail: dataUrl,
          duration: "Image",
          isUploaded: true,
        };
        addMediaLibraryItem(newItem);
        if (activeSceneId) {
          updateScene(activeSceneId, { activeMedia: newItem });
        }
        setActiveMedia(newItem);
      };
      reader.readAsDataURL(blob);
    },
    [addMediaLibraryItem, activeSceneId, updateScene, setActiveMedia]
  );

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (e.clipboardData) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              handlePasteBlob(file);
              return;
            }
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handlePasteBlob]);

  const handleClipboardButtonClick = async () => {
    try {
      if (!navigator.clipboard?.read) {
        alert("Clipboard read not supported or permission denied. Please press Ctrl+V directly to paste screenshot.");
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          handlePasteBlob(blob);
          return;
        }
      }
      alert("No image found in clipboard! Press Win+Shift+S (or Cmd+Shift+4) to copy a screenshot, then click Paste.");
    } catch (err) {
      console.warn("Clipboard read error:", err);
      alert("Clipboard access error. Please use Ctrl+V / Cmd+V directly to paste screenshot.");
    }
  };

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
      (activeMedia.type === "video" ||
        activeMedia.type === "image" ||
        activeMedia.type === "pdf" ||
        activeMedia.type === "youtube" ||
        activeMedia.type === "map")
  );

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

  // Ghost slots should be allowed in all multi-person layouts (cropped, side-by-side, 3-equal, 4-grid, presentation, etc.)
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

  // Participant Tile Move Handlers (60fps, no jitter, boundary clamped)
  const handleTileMouseDown = (e: React.MouseEvent, p: Participant, currentBounds: ParticipantBounds) => {
    if (e.button !== 0 || isDrawingMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".no-drag")) return;

    e.preventDefault();
    e.stopPropagation();

    setSelectedParticipantId(p.id);

    // StreamYard standard: in grid/column layouts, clicking selects the tile without displacing it.
    // Floating PiP windows and Stage Media can be freely dragged/repositioned.
    const isPipMode = activeLayout === "pip" || customLayoutConfig.mode === "pip";
    const isMedia = String(p.id) === "active-media";
    if ((!isPipMode && !isMedia) || !stageContainerRef.current) return;

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

  // 8-Way Interactive Mouse Resize Handler for Active Media Window
  const handleMediaResizeMouseDown = (
    e: React.MouseEvent,
    handle: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w",
    currentBounds: ParticipantBounds
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stageContainerRef.current) return;

    setSelectedParticipantId("active-media");
    pushMediaBoundsUndoState();

    const startClientX = e.clientX;
    const startClientY = e.clientY;

    dragSessionRef.current = {
      type: "resize",
      handle,
      participantId: "active-media",
      startClientX,
      startClientY,
      startBounds: { ...currentBounds },
      isLockedRatio: false,
      hasMoved: false,
    };

    setActiveDragState({ type: "resize", handle, participantId: "active-media" });

    let rafId: number | null = null;

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!dragSessionRef.current || !stageContainerRef.current) return;
      const deltaPixelX = moveEvt.clientX - startClientX;
      const deltaPixelY = moveEvt.clientY - startClientY;

      if (!dragSessionRef.current.hasMoved) {
        if (Math.hypot(deltaPixelX, deltaPixelY) < 3) return;
        dragSessionRef.current.hasMoved = true;
      }

      if (rafId !== null) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!dragSessionRef.current || !stageContainerRef.current) return;
        const rect = stageContainerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const deltaXPercent = (deltaPixelX / rect.width) * 100;
        const deltaYPercent = (deltaPixelY / rect.height) * 100;
        const { startBounds } = dragSessionRef.current;

        let newX = startBounds.x;
        let newY = startBounds.y;
        let newW = startBounds.width;
        let newH = startBounds.height;

        if (handle.includes("e")) {
          newW = Math.max(18, Math.min(100 - startBounds.x, startBounds.width + deltaXPercent));
        }
        if (handle.includes("s")) {
          newH = Math.max(18, Math.min(100 - startBounds.y, startBounds.height + deltaYPercent));
        }
        if (handle.includes("w")) {
          const clampedDelta = Math.max(-startBounds.x, Math.min(startBounds.width - 18, deltaXPercent));
          newX = startBounds.x + clampedDelta;
          newW = startBounds.width - clampedDelta;
        }
        if (handle.includes("n")) {
          const clampedDelta = Math.max(-startBounds.y, Math.min(startBounds.height - 18, deltaYPercent));
          newY = startBounds.y + clampedDelta;
          newH = startBounds.height - clampedDelta;
        }

        setParticipantBounds("active-media", {
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1)),
          width: Number(newW.toFixed(1)),
          height: Number(newH.toFixed(1)),
          isLockedRatio: false,
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
  const renderMediaTile = (currentMediaBounds?: ParticipantBounds) => {
    if (!activeMedia) return null;
    const isTransparentCard = Boolean(mediaTransform.isTransparentBg);
    const isMediaFullBleed = isFullBleedLayout || mediaFitMode === "cover";
    const effBounds = currentMediaBounds || { x: 0, y: 0, width: 100, height: 100 };
    const touchesBottomTicker = Boolean(showTicker && effBounds.y + effBounds.height > 88);
    const isBreathingActive = Boolean(fairUseConfig?.enabled && (fairUseConfig?.zoomBreathing ?? true));

    return (
      <div
        data-stage-tile="true"
        data-stage-media="true"
        data-participant-id="active-media"
        data-media-name={activeMedia.name}
        data-participant-fit={mediaFitMode}
        data-transparent-card={isTransparentCard ? "true" : "false"}
        className={cn(
          "relative w-full h-full overflow-hidden flex items-center justify-center group select-none transition-all duration-300",
          isMediaTransitioning && "opacity-30 scale-[0.98] blur-[1px]",
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
          ) : activeMedia.type === "map" && activeMedia.mapConfig ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                transform: [
                  mediaZoom * (isBreathingActive ? breathScale : 1) > 1.001
                    ? `scale(${Number((mediaZoom * (isBreathingActive ? breathScale : 1)).toFixed(4))})`
                    : "",
                  mediaTransform.rotation ? `rotate(${mediaTransform.rotation}deg)` : "",
                  isMediaMirrored ? "scaleX(-1)" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
                transformOrigin: `${effectiveTransformOriginX}% ${effectiveObjectPosY}%`,
              }}
              className="w-full h-full relative pointer-events-auto"
            >
              <TacticalMapStageCanvas
                config={activeMedia.mapConfig}
                fitMode={mediaFitMode}
                isInteractive={true}
                onOpenEditorModal={() => setIsTacticalMapModalOpen(true)}
                onConfigChange={(nextMapCfg) => {
                  const updatedMedia = { ...activeMedia, mapConfig: { ...activeMedia.mapConfig, ...nextMapCfg } as TacticalMapConfig };
                  setActiveMedia(updatedMedia);
                  useStudioStore.getState().updateMediaLibraryItem(activeMedia.id, { mapConfig: { ...activeMedia.mapConfig, ...nextMapCfg } as TacticalMapConfig });
                }}
              />
            </div>
          ) : activeMedia.type === "website" ? (
            <InteractiveWebsiteStageView
              item={activeMedia}
              zoom={Number((mediaZoom * (isBreathingActive ? breathScale : 1)).toFixed(3))}
              panX={mediaPanX}
              panY={mediaPanY}
              rotation={mediaTransform.rotation || 0}
              isMirrored={isMediaMirrored}
              onOpenLibraryModal={() => setIsWebsiteLibraryModalOpen(true)}
            />
          ) : activeMedia.type === "youtube" && useYtIframeFallback && (activeMedia.youtubeId || extractYouTubeVideoId(activeMedia.url)) ? (
            (() => {
              // Mathematical Aspect-Ratio Cover Scaling for 16:9 YouTube iframe
              const tileRelAspect = Math.max(
                0.2,
                Math.min(4.0, (effBounds.width || 100) / Math.max(1, effBounds.height || 100))
              );
              const isCoverFill = mediaFitMode === "cover";
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

              const ytTotalScale = Number(
                (mediaZoom * (isBreathingActive ? breathScale : 1) * (isYtJerking ? 1.045 : 1)).toFixed(4)
              );
              const canPanYt = isCoverFill || mediaZoom > 1;
              const ytShiftX = canPanYt
                ? Number((-mediaPanX * 0.65 + (isYtJerking ? 1.4 : 0)).toFixed(2))
                : isYtJerking
                ? 1.4
                : 0;
              const ytShiftY = canPanYt
                ? Number((-mediaPanY * 0.65 + (isYtJerking ? -0.9 : 0)).toFixed(2))
                : isYtJerking
                ? -0.9
                : 0;

              const effectiveYtId = activeMedia.youtubeId || extractYouTubeVideoId(activeMedia.url);

              return (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform:
                      [
                        ytShiftX !== 0 || ytShiftY !== 0
                          ? `translate3d(${ytShiftX}%, ${ytShiftY}%, 0)`
                          : "",
                        ytTotalScale > 1.001 ? `scale(${ytTotalScale})` : "",
                        mediaTransform.rotation ? `rotate(${mediaTransform.rotation}deg)` : "",
                        isMediaMirrored ? "scaleX(-1)" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined,
                    transformOrigin: "center center",
                    cursor: canPanYt ? (isDraggingMediaPan ? "grabbing" : "grab") : "default",
                    filter:
                      fairUseConfig?.enabled && fairUseConfig?.visualTransformFilter
                        ? "contrast(1.04) saturate(1.04)"
                        : undefined,
                  }}
                  className="w-full h-full relative overflow-hidden pointer-events-auto bg-black"
                >
                  <iframe
                    id="livestudio-active-youtube-iframe"
                    key={effectiveYtId}
                    src={`https://www.youtube-nocookie.com/embed/${effectiveYtId}?autoplay=1&enablejsapi=1&controls=0&cc_load_policy=0&hl=en&iv_load_policy=3&rel=0&fs=0&disablekb=1&modestbranding=1&playsinline=1&loop=${activeMedia.loop !== false ? 1 : 0}&playlist=${effectiveYtId}${activeMedia.startTimeSec ? `&start=${Math.floor(activeMedia.startTimeSec)}` : ""}${activeMedia.endTimeSec ? `&end=${Math.floor(activeMedia.endTimeSec)}` : ""}`}
                    title={activeMedia.name}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    onLoad={(e) => {
                      const win = e.currentTarget.contentWindow;
                      const initPlayer = () => {
                        if (!win) return;
                        win.postMessage(
                          JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
                          "*"
                        );
                        sendYouTubeIframeCommand("unloadModule", ["captions"]);
                        sendYouTubeIframeCommand("unloadModule", ["cc"]);
                        sendYouTubeIframeCommand("setOption", ["captions", "track", {}]);
                        sendYouTubeIframeCommand("setOption", ["cc", "track", {}]);
                        if (activeMedia.isMuted || normalizedMediaVolumePct === 0) {
                          sendYouTubeIframeCommand("mute", []);
                        } else {
                          sendYouTubeIframeCommand("unMute", []);
                          sendYouTubeIframeCommand("setVolume", [Math.min(100, normalizedMediaVolumePct)]);
                        }
                        const rate =
                          fairUseConfig?.enabled ? fairUseConfig.playbackRate || 1.04 : 1.0;
                        sendYouTubeIframeCommand("setPlaybackRate", [rate]);
                      };
                      initPlayer();
                      setTimeout(initPlayer, 350);
                      setTimeout(initPlayer, 900);
                    }}
                    style={{
                      width: `${iframeWidthPct}%`,
                      height: `${iframeHeightPct}%`,
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                    className="border-0 pointer-events-auto"
                  />
                </div>
              );
            })()
          ) : (activeMedia.type === "video" || (activeMedia.type === "youtube" && !useYtIframeFallback)) ? (
            <video
              id="livestudio-active-media-video"
              src={
                activeMedia.type === "youtube"
                  ? ytStreamAttempt === 0
                    ? `/api/media/youtube/stream?videoId=${activeMedia.youtubeId || (activeMedia.url ? extractYouTubeVideoId(activeMedia.url) : "")}`
                    : `/youtube-stream?videoId=${activeMedia.youtubeId || (activeMedia.url ? extractYouTubeVideoId(activeMedia.url) : "")}`
                  : activeMedia.url
              }
              autoPlay
              controls={false}
              playsInline
              loop={activeMedia.loop ?? true}
              muted={Boolean(activeMedia.isMuted)}
              crossOrigin="anonymous"
              onError={() => {
                if (activeMedia.type === "youtube") {
                  if (ytStreamAttempt === 0) {
                    setYtStreamAttempt(1);
                  } else {
                    setUseYtIframeFallback(true);
                  }
                } else {
                  setMediaLoadError(true);
                }
              }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (activeMedia.startTimeSec && activeMedia.startTimeSec > 0) {
                  v.currentTime = activeMedia.startTimeSec;
                }
                const dur = activeMedia.endTimeSec || v.duration || 0;
                setVideoDuration(dur);
                mediaDurationRef.current = dur;
              }}
              onTimeUpdate={(e) => {
                const ct = e.currentTarget.currentTime;
                setVideoCurrentTime(ct);
                mediaCurrentTimeRef.current = ct;
                if (activeMedia.endTimeSec && activeMedia.endTimeSec > 0 && ct >= activeMedia.endTimeSec) {
                  if (activeMedia.loop !== false) {
                    e.currentTarget.currentTime = activeMedia.startTimeSec || 0;
                    e.currentTarget.play().catch(() => {});
                  } else {
                    e.currentTarget.pause();
                    setIsVideoPlaying(false);
                    useStudioStore.getState().triggerMediaEnded();
                  }
                }
              }}
              onEnded={() => {
                if (activeMedia.loop !== false) {
                  const el = getActiveHtmlMediaElement();
                  if (el) {
                    el.currentTime = activeMedia.startTimeSec || 0;
                    el.play().catch(() => {});
                  }
                } else {
                  setIsVideoPlaying(false);
                  useStudioStore.getState().triggerMediaEnded();
                }
              }}
              style={{
                objectFit: mediaFitMode,
                objectPosition: `${effectiveObjectPosX}% ${effectiveObjectPosY}%`,
                transform: [
                  mediaZoom * (isBreathingActive ? breathScale : 1) > 1.001
                    ? `scale(${Number((mediaZoom * (isBreathingActive ? breathScale : 1)).toFixed(4))})`
                    : "",
                  mediaTransform.rotation ? `rotate(${mediaTransform.rotation}deg)` : "",
                  isMediaMirrored ? "scaleX(-1)" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
                transformOrigin: `${effectiveTransformOriginX}% ${effectiveObjectPosY}%`,
                cursor: mediaFitMode === "cover" || mediaZoom > 1 ? (isDraggingMediaPan ? "grabbing" : "grab") : "default",
                userSelect: "none",
                transition: isDraggingMediaPan ? "none" : "object-position 0.15s ease-out, transform 0.15s ease-out",
                filter:
                  fairUseConfig?.enabled && fairUseConfig?.visualTransformFilter
                    ? "contrast(1.04) saturate(1.04)"
                    : undefined,
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
                  mediaZoom * (isBreathingActive ? breathScale : 1) > 1.001
                    ? `scale(${Number((mediaZoom * (isBreathingActive ? breathScale : 1)).toFixed(4))})`
                    : "",
                  mediaTransform.rotation ? `rotate(${mediaTransform.rotation}deg)` : "",
                  isMediaMirrored ? "scaleX(-1)" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
                transformOrigin: `${effectiveTransformOriginX}% ${effectiveObjectPosY}%`,
                cursor: mediaFitMode === "cover" || mediaZoom > 1 ? (isDraggingMediaPan ? "grabbing" : "grab") : "default",
                userSelect: "none",
                transition: isDraggingMediaPan ? "none" : "object-position 0.15s ease-out, transform 0.15s ease-out",
                filter:
                  fairUseConfig?.enabled && fairUseConfig?.visualTransformFilter
                    ? "contrast(1.04) saturate(1.04)"
                    : undefined,
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

        {/* Dynamic Film Grain Adjustment Layer */}
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

        {/* YouTube Fair Use / Reaction Badge */}
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

        {/* Multi-Slide Presentation Deck Controls */}
        {activeMedia.slides && activeMedia.slides.length > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-500/50 shadow-2xl pointer-events-auto">
            <button
              type="button"
              onClick={prevSlide}
              className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-indigo-300 font-bold px-2 select-none">
              {(activeMedia.currentSlideIndex ?? 0) + 1} / {activeMedia.slides.length}
            </span>
            <button
              type="button"
              onClick={nextSlide}
              className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Custom Broadcast Media Transport Bar for Video & YouTube (Ticker-Aware) */}
        {(activeMedia.type === "video" || activeMedia.type === "youtube") && (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-40 bg-[#0d0e1c]/90 hover:bg-[#0d0e1c]/98 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-2xl flex items-center gap-2 max-w-[95%] pointer-events-auto transition-all",
              touchesBottomTicker ? "bottom-12" : "bottom-2.5"
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {activeMedia.type === "youtube" && (
              <button
                type="button"
                onClick={() => setIsYouTubeLibraryModalOpen(true)}
                className="px-2 py-0.5 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Edit Start/End Time or Replace YouTube Clip"
              >
                <Youtube className="w-3 h-3 text-red-400" />
                <span>Clip</span>
              </button>
            )}

            {/* Play/Pause */}
            <button
              type="button"
              onClick={handleTogglePlayVideo}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isVideoPlaying ? "Pause Video" : "Play Video"}
            >
              {isVideoPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Skip -10s */}
            <button
              type="button"
              onClick={() => handleSkipVideo(-10)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Skip back 10 seconds"
            >
              -10s
            </button>

            {/* Current Time / Total Duration */}
            <span className="text-[10px] font-mono text-slate-300 min-w-[65px] text-center select-none">
              {formatMediaTime(videoCurrentTime)} / {formatMediaTime(videoDuration)}
            </span>

            {/* Interactive Timeline Seekbar */}
            <input
              type="range"
              min={activeMedia.startTimeSec || 0}
              max={activeMedia.endTimeSec && activeMedia.endTimeSec > 0 ? activeMedia.endTimeSec : (videoDuration || 100)}
              step="0.5"
              value={videoCurrentTime}
              onChange={(e) => handleSeekVideo(Number(e.target.value))}
              className="w-24 sm:w-36 md:w-48 h-1 accent-indigo-400 bg-white/20 rounded cursor-pointer"
              title="Seek timeline"
            />

            {/* Skip +10s */}
            <button
              type="button"
              onClick={() => handleSkipVideo(10)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Skip forward 10 seconds"
            >
              +10s
            </button>

            {/* Speed Selector */}
            <select
              value={videoSpeed}
              onChange={(e) => handleChangeVideoSpeed(Number(e.target.value))}
              className="bg-black/60 border border-white/15 rounded px-1 py-0.5 text-[10px] text-indigo-300 font-mono focus:outline-none cursor-pointer"
              title="Playback Speed"
            >
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.04">1.04x FairUse</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>

            {/* Volume Mute Toggle */}
            <button
              type="button"
              onClick={() => toggleMediaMute()}
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={activeMedia.isMuted ? "Unmute" : "Mute"}
            >
              {activeMedia.isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
            </button>

            {/* Volume Slider */}
            <input
              type="range"
              min="0"
              max="200"
              value={normalizedMediaVolumePct}
              onChange={(e) => setMediaVolume(Number(e.target.value))}
              className="w-14 h-1 accent-indigo-400 bg-white/20 rounded cursor-pointer"
              title={`Volume: ${normalizedMediaVolumePct}%`}
            />

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() =>
                setActiveMedia({
                  ...activeMedia,
                  loop: !(activeMedia.loop ?? true),
                })
              }
              className={cn(
                "p-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer",
                activeMedia.loop !== false
                  ? "bg-indigo-600/50 text-indigo-200 border border-indigo-400/40"
                  : "bg-white/5 text-slate-400 hover:text-white"
              )}
              title="Toggle Loop"
            >
              <Repeat className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Audio Track Visualizer & Controls */}
        {activeMedia.type === "audio" && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl border border-indigo-500/30 w-full h-full">
            <audio
              id="livestudio-active-media-audio"
              src={activeMedia.url}
              autoPlay
              loop={activeMedia.loop ?? true}
              crossOrigin="anonymous"
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-xl">
              <Volume2 className="w-8 h-8 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white max-w-[280px] truncate">{activeMedia.name}</p>
              <p className="text-xs text-indigo-300/70">Audio Track Active</p>
            </div>
          </div>
        )}

        {/* Floating Undo / Fit Slot Pill on top-right of Resized Media Tile */}
        {participantBounds["active-media"] && (
          <div className="absolute top-2 right-2 z-40 flex items-center gap-1 bg-black/85 backdrop-blur-md px-2 py-1 rounded-lg border border-amber-500/40 shadow-xl pointer-events-auto">
            <button
              type="button"
              onClick={handleUndoMediaBounds}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-amber-600 text-amber-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              title="Undo Window Resize"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleResetMediaBoundsToSlot}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-indigo-600 text-cyan-300 hover:text-white transition-colors cursor-pointer"
              title="Restore to Layout Slot"
            >
              Fit Slot
            </button>
          </div>
        )}

        {/* 8-Way Interactive Resize Handles around Active Media */}
        {!isFullBleedLayout && mediaFitMode !== "cover" && (
          <>
            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "nw", effBounds)}
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-500 hover:bg-cyan-400 border-2 border-white rounded-full cursor-nwse-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Corner"
            />
            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "ne", effBounds)}
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 hover:bg-cyan-400 border-2 border-white rounded-full cursor-nesw-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Corner"
            />
            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "sw", effBounds)}
              className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-500 hover:bg-cyan-400 border-2 border-white rounded-full cursor-nesw-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Corner"
            />
            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "se", effBounds)}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 hover:bg-cyan-400 border-2 border-white rounded-full cursor-nwse-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Corner"
            />

            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "n", effBounds)}
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-indigo-500 hover:bg-cyan-400 border border-white rounded-full cursor-ns-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Top Edge"
            />
            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "s", effBounds)}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-indigo-500 hover:bg-cyan-400 border border-white rounded-full cursor-ns-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Bottom Edge"
            />
            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "w", effBounds)}
              className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-indigo-500 hover:bg-cyan-400 border border-white rounded-full cursor-ew-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Left Edge"
            />
            <div
              onMouseDown={(e) => handleMediaResizeMouseDown(e, "e", effBounds)}
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-indigo-500 hover:bg-cyan-400 border border-white rounded-full cursor-ew-resize z-50 shadow-md transition-colors pointer-events-auto"
              title="Resize Right Edge"
            />
          </>
        )}
      </div>
    );
  };

  const renderLayoutContent = () => {
    // Empty Stage State
    if (orderedParticipants.length === 0 && !hasVisualMedia && totalGhostSlots === 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Video className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-sm font-medium">Stage is empty</p>
          <p className="text-xs text-slate-600">Add participants or play media to bring them on stage</p>
        </div>
      );
    }

    // Auto-Expand Participant Slots When Media is in 25% PiP Mode (width <= 42% && height <= 45%)
    const customMediaBounds = participantBounds["active-media"];
    const isMediaInFloatingPip = Boolean(
      customMediaBounds &&
      customMediaBounds.width <= 42 &&
      customMediaBounds.height <= 45
    );
    const effectiveHasVisualMedia = hasVisualMedia && !isMediaInFloatingPip;
    const effectiveMediaCropped = Boolean(isStageCropped || mediaFitMode === "cover");

    const stageLayoutResult = calculateStageLayout(
      activeLayout,
      totalPlannedSlots,
      effectiveHasVisualMedia,
      layoutSplitRatio,
      customLayoutConfig,
      Boolean(fairUseConfig?.enabled && fairUseConfig?.enforceReactionPiP),
      mediaSlotIndex,
      effectiveMediaCropped
    );

    const defaultMediaBounds: ParticipantBounds =
      stageLayoutResult.mediaBounds || (
        onStageParticipants.length === 0
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 4, width: 68, height: 92, zIndex: 10, isLockedRatio: true }
      );
    const mediaBounds: ParticipantBounds = participantBounds["active-media"] || defaultMediaBounds;
    const isMediaSelected = String(selectedParticipantId) === "active-media";
    const isMediaDragging = activeDragState?.participantId === "active-media";

    // Split Divider Calculation
    const canShowSplitDivider =
      !hasAnyCustomBounds &&
      (activeLayout === "side-by-side" ||
        activeLayout === "fit" ||
        activeLayout === "cropped" ||
        activeLayout === "podcast" ||
        activeLayout === "interview" ||
        activeLayout === "stacked") &&
      ((hasVisualMedia && orderedParticipants.length === 1) || (!hasVisualMedia && orderedParticipants.length === 2));

    const isStackedSplit = activeLayout === "stacked";

    return (
      <div className={cn("w-full h-full relative select-none", (isFullBleedLayout || mediaFitMode === "cover") ? "p-0" : "p-2")}>
        {/* Stage-Level Top-Center Floating Media Action Toolbar */}
        {hasVisualMedia && activeMedia && (
          <div
            className={cn(
              "absolute z-50 flex flex-wrap items-center justify-center gap-1 bg-[#0c0c16]/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-indigo-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.85)] pointer-events-auto transition-all duration-150 max-w-[calc(100%-24px)] top-3 left-1/2 -translate-x-1/2"
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Media Name Tag */}
            <span className="text-[10px] font-semibold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 max-w-[140px] truncate select-none">
              🎬 {activeMedia.name}
            </span>

            <span className="w-px h-3 bg-white/20" />

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

            {/* Reset to Layout Slot */}
            {participantBounds["active-media"] && (
              <button
                type="button"
                onClick={handleResetMediaBoundsToSlot}
                className="px-2 py-0.5 hover:bg-white/15 rounded text-cyan-300 hover:text-cyan-200 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer border border-cyan-500/30"
                title="Reset media back to layout slot"
              >
                <span>Fit Slot</span>
              </button>
            )}

            {/* Crop vs Fit Toggle Button */}
            <button
              type="button"
              onClick={handleToggleMediaCrop}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors cursor-pointer",
                mediaFitMode === "cover"
                  ? "bg-indigo-600 text-white border-indigo-400"
                  : "bg-white/10 text-slate-300 border-white/20 hover:text-white"
              )}
              title="Toggle between edge-to-edge Cropped (Fill) and letterboxed Fit"
            >
              <Crop className="w-3 h-3" />
              <span>{mediaFitMode === "cover" ? "Cropped (Fill)" : "Fit"}</span>
            </button>

            {/* Zoom Out, 1x Reset, Zoom In */}
            <div className="flex items-center gap-0.5 bg-black/60 rounded px-1 py-0.5 border border-white/10">
              <button
                type="button"
                onClick={handleMediaZoomOut}
                disabled={mediaZoom <= 1}
                className="px-1 text-[11px] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                -
              </button>
              <button
                type="button"
                onClick={handleResetMediaTransform}
                className="px-1 text-[9px] font-mono text-cyan-300 hover:text-cyan-200 cursor-pointer"
                title="Reset Zoom & Pan"
              >
                {mediaZoom.toFixed(1)}x
              </button>
              <button
                type="button"
                onClick={handleMediaZoomIn}
                disabled={mediaZoom >= 3}
                className="px-1 text-[11px] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom In"
              >
                +
              </button>
            </div>

            {/* Pan / Align Presets when cropped or zoomed */}
            {(mediaFitMode === "cover" || mediaZoom > 1) && (
              <div className="flex items-center gap-0.5 bg-black/60 rounded px-1 py-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => handleMediaCropPreset("top")}
                  className={cn("px-1 text-[9px] font-medium rounded transition-colors", mediaPanY === -50 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                  title="Align to Top"
                >
                  Top
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaCropPreset("center")}
                  className={cn("px-1 text-[9px] font-medium rounded transition-colors", mediaPanY === 0 && mediaPanX === 0 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                  title="Center"
                >
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaCropPreset("bottom")}
                  className={cn("px-1 text-[9px] font-medium rounded transition-colors", mediaPanY === 50 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                  title="Align to Bottom"
                >
                  Btm
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaCropPreset("left")}
                  className={cn("px-1 text-[9px] font-medium rounded transition-colors", mediaPanX === -50 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                  title="Align to Left"
                >
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaCropPreset("right")}
                  className={cn("px-1 text-[9px] font-medium rounded transition-colors", mediaPanX === 50 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                  title="Align to Right"
                >
                  Right
                </button>
              </div>
            )}

            {/* Mirror Flip Toggle */}
            <button
              type="button"
              onClick={() => setTileTransform("active-media", { flipH: !isMediaMirrored })}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border transition-colors cursor-pointer",
                isMediaMirrored
                  ? "bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold"
                  : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
              )}
              title="Mirror Video Horizontally"
            >
              <span>Mirror</span>
            </button>

            {/* Fair-Use Controls */}
            {fairUseConfig?.enabled && (
              <>
                {/* Breathing Animation Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setFairUseConfig({
                      zoomBreathing: !(fairUseConfig?.zoomBreathing ?? true),
                    })
                  }
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer",
                    (fairUseConfig?.zoomBreathing ?? true)
                      ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/50 font-bold"
                      : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
                  )}
                  title="Toggle Smooth 60FPS Breathing Zoom Animation"
                >
                  <span>Breath {(fairUseConfig?.zoomBreathing ?? true) ? "ON" : "OFF"}</span>
                </button>

                {/* Breath Intensity Selector */}
                {(fairUseConfig?.zoomBreathing ?? true) && (
                  <select
                    value={fairUseConfig?.breathIntensity || "medium"}
                    onChange={(e) =>
                      setFairUseConfig({
                        breathIntensity: e.target.value as "subtle" | "medium" | "strong",
                      })
                    }
                    className="bg-black/60 border border-cyan-500/40 rounded px-1.5 py-0.5 text-[9.5px] font-bold text-cyan-300 focus:outline-none cursor-pointer"
                    title="Breath Zoom Intensity"
                  >
                    <option value="subtle">6% Subtle</option>
                    <option value="medium">11% Med</option>
                    <option value="strong">18% Strong</option>
                  </select>
                )}

                {/* Dynamic Audio Tempo LFO & Fair-Use EQ Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setFairUseConfig({
                      dynamicTempoVariance: !(fairUseConfig?.dynamicTempoVariance ?? true),
                    })
                  }
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer",
                    (fairUseConfig?.dynamicTempoVariance ?? true)
                      ? "bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold"
                      : "bg-white/10 text-slate-400 border-white/20 hover:text-white"
                  )}
                  title="Toggle Dynamic Audio Tempo LFO (1.02x–1.06x) & 3-Band Spectral EQ"
                >
                  <span>🎵 Tempo+EQ {(fairUseConfig?.dynamicTempoVariance ?? true) ? "ON" : "OFF"}</span>
                </button>
              </>
            )}

            {/* Quick Window Size Presets */}
            <div className="flex items-center gap-1 bg-black/60 rounded-lg p-0.5 border border-white/10">
              <span className="text-[9px] font-bold text-slate-400 px-1 uppercase">Size:</span>
              {[
                { label: "25% PiP", bounds: { x: 70, y: 66, width: 28, height: 30, zIndex: 35, isLockedRatio: true } },
                { label: "50% Half", bounds: { x: 0, y: 0, width: 50, height: 100, zIndex: 10, isLockedRatio: true } },
                { label: "75% Large", bounds: { x: 0, y: 0, width: 75, height: 100, zIndex: 10, isLockedRatio: true } },
                { label: "100% Full", bounds: { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true } },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyMediaSizePreset(preset.bounds)}
                  className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-white/5 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetMediaBoundsToSlot}
                className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-white/5 hover:bg-indigo-600 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title="Reset to Default Layout Slot"
              >
                Fit Slot
              </button>
            </div>

            {/* Media Stage Position / Slot Selector */}
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

            {/* Solo Button */}
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

            {/* Replace Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent("livestudio-open-tab", { detail: "media" }));
              }}
              className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Change / Select Media from Library"
            >
              <MonitorUp className="w-3 h-3 text-emerald-400" />
              <span>Replace</span>
            </button>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => {
                resetParticipantBounds("active-media");
                setActiveMedia(null);
              }}
              className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-medium transition-colors cursor-pointer"
              title="Stop and Remove Media from Stage"
            >
              Remove
            </button>
          </div>
        )}

        {/* Active Stage Media Window (Interactive, Draggable & Resizable) */}
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
            onMouseEnter={() => setIsMediaHovered(true)}
            onMouseLeave={() => setIsMediaHovered(false)}
            className={cn(
              "overflow-visible select-none transition-shadow group/mediatile pointer-events-auto",
              (isFullBleedLayout || mediaFitMode === "cover") ? "rounded-none" : "rounded-2xl",
              isMediaSelected
                ? cn(
                    "ring-2 ring-indigo-500 ring-inset shadow-[0_0_25px_rgba(99,102,241,0.5)] cursor-pointer",
                    !(isFullBleedLayout || mediaFitMode === "cover") && "border-indigo-400"
                  )
                : mediaTransform.isTransparentBg || (isFullBleedLayout || mediaFitMode === "cover")
                ? "border-0 cursor-pointer"
                : "border border-white/10 hover:border-indigo-400/50 cursor-pointer"
            )}
          >
            {/* Inner Media Content */}
            <div
              className={cn(
                "w-full h-full overflow-hidden relative pointer-events-auto",
                (isFullBleedLayout || mediaFitMode === "cover") ? "rounded-none" : "rounded-2xl"
              )}
            >
              {renderMediaTile(mediaBounds)}
            </div>
          </div>
        )}

        {orderedParticipants.map((p, idx) => {
          const calculatedBounds = stageLayoutResult.participantBounds[idx] || getDefaultSlotBounds(
            activeLayout,
            idx,
            totalPlannedSlots,
            layoutSplitRatio,
            customLayoutConfig,
            isStageCropped
          );
          const isPip = activeLayout === "pip" || customLayoutConfig.mode === "pip";
          const bounds: ParticipantBounds =
            isPip && participantBounds[p.id]
              ? participantBounds[p.id]
              : calculatedBounds;
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
                  borderRadius:
                    tileIsFullBleed
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
                      borderRadius:
                        isFullBleedLayout
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

          const isThreeCol = activeLayout === "three-equal" || (activeLayout === "custom" && customLayoutConfig?.mode === "three-equal");
          const isCustom3Split = layoutSplitRatio !== 50 && layoutSplitRatio !== 33 && layoutSplitRatio !== 65;
          const dividerLeftPct = isThreeCol
            ? (isCustom3Split ? Math.max(20, Math.min(58, layoutSplitRatio)) : 33.33)
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
            const mediaItem = parsed?.type === "livestudio-media" ? parsed.media : (parsed?.id && parsed?.url ? parsed : null);
            if (mediaItem && mediaItem.id && mediaItem.url) {
              e.preventDefault();
              e.stopPropagation();
              // Determine target slot if dropped on a multi-slot stage layout
              if (stageContainerRef.current && totalPlannedSlots >= 1 && !isSoloOrCinema && mediaItem.type !== "audio") {
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
                      const sb = getDefaultSlotBounds(activeLayout, s, totalSlots, layoutSplitRatio, customLayoutConfig, isStageCropped);
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
              });
              if (isStageCropped) {
                setTileTransform("active-media", { fitMode: "cover", panX: 0, panY: 0 });
              }
            }
          } catch {
            // ignore non-JSON text drops
          }
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
            "absolute left-1/2 -translate-x-1/2 z-30 transition-opacity duration-200 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 flex items-center gap-1.5 shadow-2xl pointer-events-auto",
            hasVisualMedia ? "top-14" : "top-3",
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
          {logoConfig?.mode === "image" && logoConfig?.imageUrl ? (
            <div className="p-1">
              <img
                src={logoConfig.imageUrl}
                alt="Logo"
                style={{ height: `${logoConfig.heightPx || 40}px` }}
                className="w-auto object-contain drop-shadow-lg"
              />
            </div>
          ) : logoConfig?.mode === "both" && logoConfig?.imageUrl ? (
            <div
              className={cn(
                "px-3 py-1 flex items-center gap-2.5 transition-all select-none",
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
              <img
                src={logoConfig.imageUrl}
                alt="Logo"
                style={{ height: `${Math.min(logoConfig.heightPx || 36, 44)}px` }}
                className="w-auto object-contain drop-shadow"
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
          ) : (
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
          )}
        </div>
      )}

      {/* Lower-Third Banner */}
      {activeBanner && activeBanner.isShowing && (
        <div className={cn(
          "absolute left-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none select-none",
          showTicker ? "bottom-16" : "bottom-10"
        )}>
          {activeBanner.style === "minimal" ? (
            <div className="backdrop-blur-md bg-black/60 px-5 py-2 rounded-lg border-b-2" style={{ borderBottomColor: activeBanner.themeColor || activeThemeColor }}>
              <h4 className="text-sm font-bold text-white tracking-tight">{activeBanner.title}</h4>
              {activeBanner.subtitle && (
                <p className="text-xs font-medium" style={{ color: activeBanner.themeColor || activeThemeColor }}>{activeBanner.subtitle}</p>
              )}
            </div>
          ) : activeBanner.style === "block" ? (
            <div className="shadow-2xl flex flex-col overflow-hidden rounded-md">
              <div className="px-5 py-1.5 font-bold text-sm text-white uppercase tracking-wider" style={{ backgroundColor: activeBanner.themeColor || activeThemeColor }}>
                {activeBanner.title}
              </div>
              {activeBanner.subtitle && (
                <div className="px-5 py-1 text-xs font-semibold text-slate-200 bg-black/85">
                  {activeBanner.subtitle}
                </div>
              )}
            </div>
          ) : activeBanner.style === "bubble" ? (
            <div className="rounded-full shadow-2xl flex items-center gap-3 px-5 py-2 border border-white/20 backdrop-blur-md bg-black/80">
              <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: activeBanner.themeColor || activeThemeColor }} />
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">{activeBanner.title}</h4>
                {activeBanner.subtitle && (
                  <p className="text-[11px] font-medium text-slate-300">{activeBanner.subtitle}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden shadow-2xl flex border border-white/15 backdrop-blur-md bg-black/85">
              <div className="w-2.5" style={{ backgroundColor: activeBanner.themeColor || activeThemeColor }} />
              <div className="px-5 py-2.5">
                <h4 className="text-sm font-bold text-white tracking-tight">{activeBanner.title}</h4>
                {activeBanner.subtitle && (
                  <p className="text-xs font-medium" style={{ color: activeBanner.themeColor || activeThemeColor }}>{activeBanner.subtitle}</p>
                )}
              </div>
            </div>
          )}
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
          <div className="absolute top-5 left-5 z-40 animate-in fade-in max-w-[92%] sm:max-w-md">
            <div className="px-3.5 py-2 rounded-2xl bg-[#0c0d1a]/95 backdrop-blur-md border border-cyan-500/50 shadow-2xl space-y-2 text-white">
              {/* Header: Title + Mute + Close */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", activeMedia.isMuted ? "bg-rose-400" : "bg-cyan-400 animate-pulse")} />
                  <span className="text-xs font-bold text-cyan-200 truncate">
                    🎵 {activeMedia.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={toggleMediaMute}
                    className={cn(
                      "p-1 rounded-lg text-xs flex items-center gap-1 transition-colors border",
                      activeMedia.isMuted
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    )}
                    title={activeMedia.isMuted ? "Unmute Background Audio" : "Mute Background Audio"}
                  >
                    {activeMedia.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setActiveMedia(null)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-rose-600 text-slate-400 hover:text-white text-xs transition-colors"
                    title="Stop Audio"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Transport Controls Row */}
              <div className="flex items-center gap-1.5 text-xs">
                {/* Play/Pause */}
                <button
                  type="button"
                  onClick={handleTogglePlayAudio}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title={isAudioPlaying ? "Pause Audio" : "Play Audio"}
                >
                  {isAudioPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                </button>

                {/* Skip -10s */}
                <button
                  type="button"
                  onClick={() => handleSkipAudio(-10)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                  title="Skip back 10 seconds"
                >
                  -10s
                </button>

                {/* Time Display */}
                <span className="text-[10px] font-mono text-slate-300 min-w-[62px] text-center select-none">
                  {formatMediaTime(audioCurrentTime)} / {formatMediaTime(audioDuration)}
                </span>

                {/* Seekbar */}
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 100}
                  step="0.5"
                  value={audioCurrentTime}
                  onChange={(e) => handleSeekAudio(Number(e.target.value))}
                  className="flex-1 h-1 accent-cyan-400 bg-white/20 rounded cursor-pointer"
                  title="Seek audio track"
                />

                {/* Skip +10s */}
                <button
                  type="button"
                  onClick={() => handleSkipAudio(10)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                  title="Skip forward 10 seconds"
                >
                  +10s
                </button>

                {/* Speed */}
                <select
                  value={audioSpeed}
                  onChange={(e) => handleChangeAudioSpeed(Number(e.target.value))}
                  className="bg-black/60 border border-white/15 rounded px-1 py-0.5 text-[9px] text-cyan-300 font-mono focus:outline-none cursor-pointer"
                  title="Playback Speed"
                >
                  <option value="0.75">0.75x</option>
                  <option value="1">1.0x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                </select>

                {/* Loop */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveMedia({
                      ...activeMedia,
                      loop: !(activeMedia.loop ?? true),
                    })
                  }
                  className={cn(
                    "p-1 rounded text-[10px] transition-colors border",
                    (activeMedia.loop ?? true)
                      ? "bg-cyan-600/30 text-cyan-300 border-cyan-400/50"
                      : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                  )}
                  title={(activeMedia.loop ?? true) ? "Loop ON" : "Loop OFF"}
                >
                  <Repeat className="w-3 h-3" />
                </button>
              </div>

              {/* Volume Slider Row */}
              <div className="flex items-center gap-2 pt-0.5 border-t border-white/10 text-xs">
                <span className="text-[10px] text-slate-400 font-medium">Vol:</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={activeMedia.isMuted ? 0 : (activeMedia.volume ?? 100)}
                  onChange={(e) => {
                    const vol = Number(e.target.value);
                    setActiveMedia({
                      ...activeMedia,
                      volume: vol,
                      isMuted: vol === 0,
                    });
                  }}
                  className="flex-1 h-1 accent-cyan-400 bg-white/20 rounded cursor-pointer"
                  title={`Audio Volume: ${activeMedia.volume ?? 100}%`}
                />
                <span className="text-[10px] font-mono text-cyan-300 font-bold min-w-[32px] text-right">
                  {activeMedia.volume ?? 100}%
                </span>
              </div>
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

      {/* Scene Transition Fade Overlay (StreamYard Paid Plan) */}
      {isSceneTransitioning && (
        <div className="absolute inset-0 bg-[#07070d]/40 backdrop-blur-[2px] z-40 pointer-events-none transition-opacity duration-300 animate-in fade-in" />
      )}
      </div>

      <YouTubeLibraryModal
        isOpen={isYouTubeLibraryModalOpen}
        onClose={() => setIsYouTubeLibraryModalOpen(false)}
      />

      <TacticalMapModal
        isOpen={isTacticalMapModalOpen}
        onClose={() => setIsTacticalMapModalOpen(false)}
        initialItem={activeMedia?.type === "map" ? activeMedia : undefined}
      />

      <WebsiteLibraryModal
        isOpen={isWebsiteLibraryModalOpen}
        onClose={() => setIsWebsiteLibraryModalOpen(false)}
        onSelectWebsiteItem={(item) => {
          if (activeSceneId) updateScene(activeSceneId, { activeMedia: item });
          setActiveMedia(item);
        }}
      />
    </div>
  );
};
