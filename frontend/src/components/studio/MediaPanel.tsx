"use client";

import React, { useState, useRef } from "react";
import {
  PlaySquare,
  Video,
  FileText,
  Music,
  Play,
  Pause,
  Plus,
  Upload,
  Square,
  Sparkles,
  Trash2,
  ExternalLink,
  Layers,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useStudioStore } from "@/stores/studio.store";
import { StageOverlayAsset } from "@/types";
import { cn } from "@/lib/utils";

interface MediaFileItem {
  id: string;
  name: string;
  type: "video" | "audio" | "pdf" | "image";
  duration: string;
  url: string;
  isUploaded?: boolean;
}

export const MediaPanel: React.FC = () => {
  const {
    activeMedia,
    setActiveMedia,
    activeStageOverlay,
    setStageOverlay,
    saveToOverlayHistory,
  } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [autoRepeat, setAutoRepeat] = useState(true);

  const [mediaList, setMediaList] = useState<MediaFileItem[]>([
    {
      id: "media-countdown",
      name: "Intro_Countdown_30s.mp4",
      type: "video",
      duration: "00:30",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    },
    {
      id: "media-keynote-clip",
      name: "Product_Demo_Highlights.mp4",
      type: "video",
      duration: "01:15",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    },
    {
      id: "media-slides",
      name: "Product_Architecture_2026.pdf",
      type: "pdf",
      duration: "18 slides",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "media-lofi",
      name: "Background_Lofi_Stream.mp3",
      type: "audio",
      duration: "03:45",
      url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg",
    },
  ]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: "video" | "audio" | "image" | "pdf" = "video";
    if (file.type.startsWith("audio/")) type = "audio";
    else if (file.type.startsWith("image/")) type = "image";
    else if (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) type = "pdf";

    const uploadedVideos = mediaList.filter((m) => m.type === "video" && m.isUploaded);
    const uploadedAudios = mediaList.filter((m) => m.type === "audio" && m.isUploaded);
    const uploadedDocs = mediaList.filter((m) => (m.type === "image" || m.type === "pdf") && m.isUploaded);

    let videoDuration = 0;
    let videoWidth = 0;
    let videoHeight = 0;
    let audioDuration = 0;

    // 1. Video validation: Max 2 videos, max 5 minutes (300s), max 720p
    if (type === "video") {
      if (uploadedVideos.length >= 2) {
        alert("Video quota full! Maximum 2 videos allowed in VPS media library. Pehle purani video delete karein.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const tempUrl = URL.createObjectURL(file);
      try {
        const tempVideo = document.createElement("video");
        tempVideo.preload = "metadata";
        tempVideo.src = tempUrl;
        await new Promise<void>((resolve, reject) => {
          tempVideo.onloadedmetadata = () => resolve();
          tempVideo.onerror = () => reject(new Error("Unable to read video file"));
        });

        videoDuration = Math.round(tempVideo.duration || 0);
        videoWidth = tempVideo.videoWidth || 0;
        videoHeight = tempVideo.videoHeight || 0;
        URL.revokeObjectURL(tempUrl);

        if (videoDuration > 600) {
          alert(`Video duration (${Math.floor(videoDuration / 60)}m ${videoDuration % 60}s) exceeds limit! Maximum 10 minutes (600s) allowed.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        if (videoHeight > 1080 || videoWidth > 1920) {
          alert(`Video resolution (${videoWidth}x${videoHeight}) exceeds limit! Maximum 1080p (1920x1080) allowed to preserve VPS resources.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } catch {
        URL.revokeObjectURL(tempUrl);
      }
    }

    // 2. Audio validation: Max 2 audios, MP3 only, max 15 minutes
    if (type === "audio") {
      const isMp3 = file.type === "audio/mpeg" || file.type === "audio/mp3" || file.name.toLowerCase().endsWith(".mp3");
      if (!isMp3) {
        alert("Format not allowed! Sirf MP3 audio files permitted hain.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (uploadedAudios.length >= 2) {
        alert("Audio quota full! Maximum 2 audio files allowed in VPS media library. Pehle purani audio delete karein.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const tempUrl = URL.createObjectURL(file);
      try {
        const tempAudio = document.createElement("audio");
        tempAudio.preload = "metadata";
        tempAudio.src = tempUrl;
        await new Promise<void>((resolve, reject) => {
          tempAudio.onloadedmetadata = () => resolve();
          tempAudio.onerror = () => reject(new Error("Unable to read audio file"));
        });

        audioDuration = Math.round(tempAudio.duration || 0);
        URL.revokeObjectURL(tempUrl);

        if (audioDuration > 900) {
          alert(`Audio duration (${Math.floor(audioDuration / 60)}m) exceeds limit! Maximum 15 minutes allowed.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } catch {
        URL.revokeObjectURL(tempUrl);
      }
    }

    // 3. Image / PDF validation: Max 2 files, max 2MB each
    if (type === "image" || type === "pdf") {
      if (uploadedDocs.length >= 2) {
        alert("Image/PDF quota full! Maximum 2 files (PDF/Image) allowed in VPS media library. Pehle purani file delete karein.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds limit! Maximum 2MB allowed for images and PDFs.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    const fileUrl = URL.createObjectURL(file);
    const durationLabel =
      type === "video" && videoDuration > 0
        ? `${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toString().padStart(2, "0")}`
        : type === "audio" && audioDuration > 0
        ? `${Math.floor(audioDuration / 60)}:${(audioDuration % 60).toString().padStart(2, "0")}`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const newItem: MediaFileItem = {
      id: `media-${Date.now()}`,
      name: file.name,
      type,
      duration: durationLabel,
      url: fileUrl,
      isUploaded: true,
    };

    setMediaList((prev) => [newItem, ...prev]);

    // Background upload to backend MinIO API
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("assetType", type.toUpperCase());
      if (videoDuration > 0) formData.append("duration", videoDuration.toString());
      if (videoWidth > 0) formData.append("width", videoWidth.toString());
      if (videoHeight > 0) formData.append("height", videoHeight.toString());
      if (audioDuration > 0) formData.append("duration", audioDuration.toString());

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.url) {
          const serverUrl = json.data.url;
          const serverId = json.data.id || newItem.id;
          setMediaList((prev) =>
            prev.map((m) => (m.id === newItem.id ? { ...m, id: serverId, url: serverUrl } : m))
          );
          const currentActive = useStudioStore.getState().activeMedia;
          if (currentActive?.id === newItem.id) {
            setActiveMedia({
              ...currentActive,
              id: serverId,
              url: serverUrl,
            });
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || "Upload failed due to quota restrictions.");
        setMediaList((prev) => prev.filter((m) => m.id !== newItem.id));
      }
    } catch (err) {
      console.warn("Backend MinIO upload skipped or errored, local preview active:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Load existing media assets from backend library on mount
  React.useEffect(() => {
    fetch("/api/media")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          const serverItems: MediaFileItem[] = json.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.assetType.toLowerCase() as any,
            duration: item.fileSize ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB` : "Ready",
            url: item.url,
            isUploaded: true,
          }));
          setMediaList((prev) => {
            const existingUrls = new Set(prev.map((m) => m.url));
            const newOnes = serverItems.filter((s) => !existingUrls.has(s.url));
            return [...prev, ...newOnes];
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleTogglePlay = (item: MediaFileItem) => {
    if (activeMedia?.id === item.id) {
      setActiveMedia(null);
    } else {
      setActiveMedia({
        id: item.id,
        name: item.name,
        type: item.type,
        url: item.url,
        loop: autoRepeat,
      });
    }
  };

  const handleToggleOverlay = (item: MediaFileItem) => {
    if (activeStageOverlay?.id === item.id) {
      setStageOverlay(null);
    } else {
      const newOverlay: StageOverlayAsset = {
        id: item.id,
        name: item.name,
        type: item.type === "video" ? "video" : "image",
        url: item.url,
        position: "bottom-left",
        scale: 35,
        cropMode: item.type === "video" ? "cover" : "fit",
        borderRadius: 16,
        opacity: 100,
        isShowing: true,
        isMuted: true,
        isLooping: true,
        showBackdrop: false,
      };
      setStageOverlay(newOverlay);
      saveToOverlayHistory(newOverlay);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMedia?.id === id) setActiveMedia(null);
    if (activeStageOverlay?.id === id) setStageOverlay(null);
    setMediaList((prev) => prev.filter((m) => m.id !== id));

    try {
      await fetch(`/api/media/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Failed to delete media asset from backend:", err);
    }
  };

  const uploadedVideos = mediaList.filter((m) => m.type === "video" && m.isUploaded);
  const uploadedAudios = mediaList.filter((m) => m.type === "audio" && m.isUploaded);
  const uploadedDocs = mediaList.filter((m) => (m.type === "image" || m.type === "pdf") && m.isUploaded);

  return (
    <div className="h-full flex flex-col justify-between bg-[#0b0b12]">
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <PlaySquare className="w-4 h-4 text-indigo-400" />
            Production Media
          </h3>
          <p className="text-[10px] text-slate-400">Play videos, slides & music directly on stage</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !autoRepeat;
              setAutoRepeat(next);
              if (activeMedia) {
                setActiveMedia({ ...activeMedia, loop: next });
              }
            }}
            className={cn(
              "h-7 px-2 text-[10px] font-semibold rounded-lg border flex items-center gap-1 transition-all",
              autoRepeat
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            )}
            title={autoRepeat ? "Auto-Repeat: ON (Video/audio replays automatically)" : "Auto-Repeat: OFF (Plays once)"}
          >
            <Repeat className="w-3 h-3" />
            <span>Repeat</span>
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-7 text-xs px-2.5"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*,.pdf"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* VPS Storage Quota Status Bar */}
      <div className="px-3 py-2 border-b border-white/5 bg-slate-950/60 flex items-center justify-between gap-1.5 text-[10px]">
        <div className="flex-1 p-1.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
          <span className="text-slate-400 font-medium">Videos (1080p, ≤10m)</span>
          <span className={cn("font-mono font-bold mt-0.5", uploadedVideos.length >= 2 ? "text-amber-400" : "text-emerald-400")}>
            {uploadedVideos.length} / 2
          </span>
        </div>
        <div className="flex-1 p-1.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
          <span className="text-slate-400 font-medium">Audio (MP3, ≤15m)</span>
          <span className={cn("font-mono font-bold mt-0.5", uploadedAudios.length >= 2 ? "text-amber-400" : "text-emerald-400")}>
            {uploadedAudios.length} / 2
          </span>
        </div>
        <div className="flex-1 p-1.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
          <span className="text-slate-400 font-medium">Image/PDF (≤2MB)</span>
          <span className={cn("font-mono font-bold mt-0.5", uploadedDocs.length >= 2 ? "text-amber-400" : "text-emerald-400")}>
            {uploadedDocs.length} / 2
          </span>
        </div>
      </div>

      {/* Active Stage Media Banner */}
      {activeMedia && (
        <div className="px-3 py-2 bg-indigo-950/70 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Playing On Stage</span>
                {activeMedia.loop !== false && (
                  <span className="text-[9px] text-emerald-400 font-mono font-normal">
                    (Auto-Repeat)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white truncate max-w-[150px]">{activeMedia.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = !(activeMedia.loop ?? true);
                setAutoRepeat(next);
                setActiveMedia({ ...activeMedia, loop: next });
              }}
              className={cn(
                "h-6 px-1.5 text-[9px] font-medium rounded border flex items-center gap-1 transition-all",
                (activeMedia.loop ?? true)
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold"
                  : "bg-white/10 text-slate-400 border-white/10 hover:text-white"
              )}
              title={(activeMedia.loop ?? true) ? "Auto-Repeat ON (Click for 1-Shot)" : "Auto-Repeat OFF (Click to Loop)"}
            >
              <Repeat className="w-2.5 h-2.5" />
              <span>{(activeMedia.loop ?? true) ? "Loop" : "1-Shot"}</span>
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setActiveMedia(null)}
              className="h-6 px-2 text-[10px]"
            >
              <Square className="w-2.5 h-2.5 mr-1 fill-current" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Media Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {mediaList.map((item) => {
          const isPlaying = activeMedia?.id === item.id;
          const isOverlaying = activeStageOverlay?.id === item.id;
          const isCompatibleWithOverlay = item.type === "video" || item.type === "image";

          return (
            <div
              key={item.id}
              className={cn(
                "p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between group",
                isPlaying
                  ? "bg-indigo-500/15 border-indigo-500 shadow-md shadow-indigo-500/10"
                  : isOverlaying
                  ? "bg-purple-500/15 border-purple-500 shadow-md shadow-purple-500/10"
                  : "bg-surface border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "p-2 rounded-lg border",
                    isPlaying
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : isOverlaying
                      ? "bg-purple-600 text-white border-purple-400"
                      : "bg-surface-raised border-white/5 text-indigo-400"
                  )}
                >
                  {item.type === "video" && <Video className="w-4 h-4" />}
                  {item.type === "pdf" && <FileText className="w-4 h-4" />}
                  {item.type === "audio" && <Music className="w-4 h-4" />}
                  {item.type === "image" && <PlaySquare className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate max-w-[110px]" title={item.name}>
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                    <span>{item.duration}</span>
                    {isPlaying && (
                      <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">
                        • STAGE
                      </span>
                    )}
                    {isOverlaying && (
                      <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px]">
                        • OVERLAY
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Full Stage Presentation Button */}
                <Button
                  variant={isPlaying ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => handleTogglePlay(item)}
                  className="h-7 px-2 text-[10px] font-medium"
                  title={isPlaying ? "Stop full-stage presentation" : "Present full-stage"}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-2.5 h-2.5 mr-1 fill-current" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 mr-1 fill-current" />
                      Stage
                    </>
                  )}
                </Button>

                {/* Floating Overlay Button */}
                {isCompatibleWithOverlay && (
                  <Button
                    variant={isOverlaying ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleOverlay(item)}
                    className={cn(
                      "h-7 px-2 text-[10px] font-medium transition-colors",
                      isOverlaying
                        ? "bg-indigo-600 text-white font-bold shadow-sm"
                        : "text-slate-300 hover:text-white"
                    )}
                    title={isOverlaying ? "Remove overlay from stage" : "Overlay on live stage with custom resize/crop"}
                  >
                    <Layers className="w-3 h-3 mr-1" />
                    {isOverlaying ? "Active" : "Overlay"}
                  </Button>
                )}

                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-opacity"
                  title="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-white/5 bg-[#09090f] text-[10px] text-slate-500 flex items-center justify-between">
        <span>VPS Disk Protection Active</span>
        <span className="text-emerald-400 font-mono">Quota Enforced</span>
      </div>
    </div>
  );
};
