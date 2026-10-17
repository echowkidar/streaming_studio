"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  PlaySquare,
  Video,
  FileText,
  Music,
  Play,
  Plus,
  Upload,
  Square,
  Sparkles,
  Trash2,
  Layers,
  Repeat,
  GripVertical,
  Youtube,
  Globe,
  Edit2,
  Clipboard,
  Search,
  Image as ImageIcon,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useStudioStore,
  MediaFileItem,
  persistStudioLayout,
  isDummyOrBrokenMediaItem,
  sanitizeAndDeduplicateMediaList,
} from "@/stores/studio.store";
import { StageOverlayAsset } from "@/types";
import { cn } from "@/lib/utils";
import { SlideDeckCreatorModal } from "./SlideDeckCreatorModal";
import { YouTubeLibraryModal } from "./YouTubeLibraryModal";
import { TacticalMapModal } from "./TacticalMapModal";
import { WebsiteLibraryModal } from "./WebsiteLibraryModal";

interface MediaPanelProps {
  studioId?: string;
}

export type MediaCategoryTab =
  | "all"
  | "video"
  | "youtube"
  | "map"
  | "pdf"
  | "website"
  | "audio"
  | "image";

export const MediaPanel: React.FC<MediaPanelProps> = ({ studioId }) => {
  const effectiveStudioId =
    studioId ||
    (typeof window !== "undefined"
      ? window.location.pathname.split("/studio/")[1] || "default"
      : "default");

  const {
    activeMedia,
    setActiveMedia,
    activeStageOverlay,
    setStageOverlay,
    saveToOverlayHistory,
    mediaLibrary,
    addMediaLibraryItem,
    removeMediaLibraryItem,
    cleanupMediaLibrary,
  } = useStudioStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [autoRepeat, setAutoRepeat] = useState(true);
  const [activeCategory, setActiveCategory] = useState<MediaCategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingMediaId, setDraggingMediaId] = useState<string | null>(null);
  const [cleanupNotice, setCleanupNotice] = useState<string | null>(null);

  // Modals State
  const [isSlideCreatorOpen, setIsSlideCreatorOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [editingMapItem, setEditingMapItem] = useState<MediaFileItem | null>(null);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);

  const [mediaList, setMediaList] = useState<MediaFileItem[]>(() => {
    return sanitizeAndDeduplicateMediaList(mediaLibrary || [], true);
  });

  // Sync with Zustand mediaLibrary store (ensuring zero dummy or duplicate items)
  React.useEffect(() => {
    setMediaList((prev) => {
      const validBlobItems = prev.filter(
        (p) => p.url?.startsWith("blob:") && !isDummyOrBrokenMediaItem(p)
      );
      return sanitizeAndDeduplicateMediaList(
        [...(mediaLibrary || []), ...validBlobItems],
        true
      );
    });
  }, [mediaLibrary]);

  // Load existing valid media assets from backend library on mount
  React.useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
    fetch(`/api/media?studioId=${encodeURIComponent(effectiveStudioId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          const serverItems: MediaFileItem[] = json.data
            .map((item: any) => {
              const metaSec = Number(item.metadata?.duration || 0);
              return {
                id: item.id,
                name: item.name,
                type: item.assetType.toLowerCase() as any,
                durationSeconds: metaSec,
                duration:
                  metaSec > 0
                    ? `${Math.floor(metaSec / 60)}:${(metaSec % 60)
                        .toString()
                        .padStart(2, "0")}`
                    : item.fileSize
                    ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : "Ready",
                url: item.url,
                isUploaded: true,
              };
            })
            .filter((item: MediaFileItem) => !isDummyOrBrokenMediaItem(item));

          if (serverItems.length > 0) {
            setMediaList((prev) => {
              const combined = sanitizeAndDeduplicateMediaList(
                [...prev, ...serverItems],
                true
              );
              return combined;
            });
          }
        }
      })
      .catch(() => {});
  }, [effectiveStudioId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: "video" | "audio" | "image" | "pdf" = "video";
    if (file.type.startsWith("audio/")) type = "audio";
    else if (file.type.startsWith("image/")) type = "image";
    else if (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf"))
      type = "pdf";

    const uploadedVideos = mediaList.filter((m) => m.type === "video" && m.isUploaded);
    const uploadedAudios = mediaList.filter((m) => m.type === "audio" && m.isUploaded);
    const uploadedDocs = mediaList.filter(
      (m) => (m.type === "image" || m.type === "pdf") && !m.slides && m.isUploaded
    );

    const currentTotalVideoSec = uploadedVideos.reduce((acc, item) => {
      if (item.durationSeconds && item.durationSeconds > 0)
        return acc + item.durationSeconds;
      const parts = (item.duration || "").split(":");
      if (parts.length === 2) {
        const m = parseInt(parts[0], 10);
        const s = parseInt(parts[1], 10);
        if (!isNaN(m) && !isNaN(s)) return acc + m * 60 + s;
      }
      return acc;
    }, 0);

    const MAX_VIDEO_TOTAL_SEC = 3600; // 60 minutes total
    const remainingVideoSec = Math.max(0, MAX_VIDEO_TOTAL_SEC - currentTotalVideoSec);
    const remainingMinutes = Math.floor(remainingVideoSec / 60);
    const remainingSeconds = remainingVideoSec % 60;

    let videoDuration = 0;
    let videoWidth = 0;
    let videoHeight = 0;
    let audioDuration = 0;

    // 1. Video validation
    if (type === "video") {
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

        if (videoHeight > 1080 || videoWidth > 1920) {
          alert(
            `Video resolution (${videoWidth}x${videoHeight}) exceeds limit! Maximum 1080p (1920x1080) allowed to preserve VPS resources.`
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        if (videoDuration > remainingVideoSec) {
          const vidMin = Math.floor(videoDuration / 60);
          const vidSec = videoDuration % 60;
          alert(
            `Total video limit (60 minutes) exceeded!\n\nAapke pass sirf ${remainingMinutes}m ${remainingSeconds}s bache hain, jabki yeh video ${vidMin}m ${vidSec}s ki hai.\n\nPehle purani video delete karein ya chhoti video upload karein.`
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } catch {
        URL.revokeObjectURL(tempUrl);
      }
    }

    // 2. Audio validation
    if (type === "audio") {
      const isMp3 =
        file.type === "audio/mpeg" ||
        file.type === "audio/mp3" ||
        file.name.toLowerCase().endsWith(".mp3");
      if (!isMp3) {
        alert("Format not allowed! Sirf MP3 audio files permitted hain.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (uploadedAudios.length >= 2) {
        alert(
          "Audio quota full! Maximum 2 audio files allowed in VPS media library. Pehle purani audio delete karein."
        );
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
          alert(
            `Audio duration (${Math.floor(audioDuration / 60)}m) exceeds limit! Maximum 15 minutes allowed.`
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } catch {
        URL.revokeObjectURL(tempUrl);
      }
    }

    // 3. Image / PDF validation
    if (type === "image" || type === "pdf") {
      if (uploadedDocs.length >= 2) {
        alert(
          "Image/PDF quota full! Maximum 2 files (PDF/Image) allowed in VPS media library. Pehle purani file delete karein."
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert(
          `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds limit! Maximum 2MB allowed for images and PDFs.`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    const fileUrl = URL.createObjectURL(file);
    const durationLabel =
      type === "video" && videoDuration > 0
        ? `${Math.floor(videoDuration / 60)}:${(videoDuration % 60)
            .toString()
            .padStart(2, "0")}`
        : type === "audio" && audioDuration > 0
        ? `${Math.floor(audioDuration / 60)}:${(audioDuration % 60)
            .toString()
            .padStart(2, "0")}`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const newItem: MediaFileItem = {
      id: `media-${Date.now()}`,
      name: file.name,
      type,
      duration: durationLabel,
      durationSeconds: type === "video" ? videoDuration : audioDuration,
      url: fileUrl,
      isUploaded: true,
    };

    setMediaList((prev) => sanitizeAndDeduplicateMediaList([newItem, ...prev], true));
    addMediaLibraryItem(newItem);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("assetType", type.toUpperCase());
      formData.append("studioId", effectiveStudioId);
      formData.append("isPersistent", "true");
      if (videoDuration > 0) formData.append("duration", videoDuration.toString());
      if (videoWidth > 0) formData.append("width", videoWidth.toString());
      if (videoHeight > 10) formData.append("height", videoHeight.toString());
      if (audioDuration > 0) formData.append("duration", audioDuration.toString());

      const token =
        typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.url) {
          const serverUrl = json.data.url;
          const serverId = json.data.id || newItem.id;
          const permanentItem: MediaFileItem = {
            ...newItem,
            id: serverId,
            url: serverUrl,
          };

          setMediaList((prev) =>
            sanitizeAndDeduplicateMediaList(
              prev.map((m) => (m.id === newItem.id ? permanentItem : m)),
              true
            )
          );

          addMediaLibraryItem(permanentItem);

          const currentStore = useStudioStore.getState();
          const nextScenes = currentStore.scenes.map((s) =>
            s.activeMedia?.id === newItem.id || s.activeMedia?.name === newItem.name
              ? { ...s, activeMedia: permanentItem }
              : s
          );

          const currentActive = currentStore.activeMedia;
          const shouldUpdateActive =
            currentActive?.id === newItem.id || currentActive?.name === newItem.name;

          persistStudioLayout({
            scenes: nextScenes,
            ...(shouldUpdateActive ? { activeMedia: permanentItem } : {}),
          });

          useStudioStore.setState({
            scenes: nextScenes,
            ...(shouldUpdateActive ? { activeMedia: permanentItem } : {}),
          });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || "Upload failed due to quota restrictions.");
        setMediaList((prev) => prev.filter((m) => m.id !== newItem.id));
        removeMediaLibraryItem(newItem.id);
      }
    } catch (err) {
      console.warn("Backend upload warning, local preview active:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasteScreenshot = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipItems = await navigator.clipboard.read();
        for (const clipItem of clipItems) {
          const imgType = clipItem.types.find((t) => t.startsWith("image/"));
          if (imgType) {
            const blob = await clipItem.getType(imgType);
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              if (!dataUrl) return;
              const timeStr = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const pastedItem: MediaFileItem = {
                id: `screenshot-${Date.now()}`,
                name: `Screenshot ${timeStr}`,
                type: "image",
                url: dataUrl,
                thumbnail: dataUrl,
                duration: "Pasted Image",
                isUploaded: true,
              };
              addMediaLibraryItem(pastedItem);
              setMediaList((prev) => [pastedItem, ...prev]);
              setActiveMedia(pastedItem);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      alert(
        "Press Ctrl+V (or Cmd+V) anywhere in the studio after taking a screenshot to paste it directly!"
      );
    } catch {
      alert(
        "Press Ctrl+V (or Cmd+V) anywhere in the studio after taking a screenshot to paste it directly!"
      );
    }
  };

  const handleCleanupLibrary = () => {
    const removedCount = cleanupMediaLibrary();
    setMediaList((prev) => sanitizeAndDeduplicateMediaList(prev, true));
    setCleanupNotice(
      removedCount > 0
        ? `Cleaned ${removedCount} dummy/duplicate item(s)!`
        : "Media Library is clean!"
    );
    setTimeout(() => setCleanupNotice(null), 2800);
  };

  const handleTogglePlay = (item: MediaFileItem) => {
    if (activeMedia?.id === item.id) {
      setActiveMedia(null);
    } else {
      setActiveMedia({
        ...item,
        loop: item.loop ?? autoRepeat,
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

  const handleEditItem = (item: MediaFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === "map" || item.mapConfig) {
      setEditingMapItem(item);
      setIsMapModalOpen(true);
    } else if (item.type === "youtube" || item.youtubeId) {
      setIsYouTubeModalOpen(true);
    } else if (item.type === "website" || item.websiteConfig) {
      setIsWebsiteModalOpen(true);
    } else if (item.type === "pdf" && item.slides) {
      setIsSlideCreatorOpen(true);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaList((prev) => prev.filter((m) => m.id !== id));
    removeMediaLibraryItem(id);
  };

  // Category Counts & Filtered List
  const counts = useMemo(() => {
    return {
      all: mediaList.length,
      video: mediaList.filter((m) => m.type === "video").length,
      youtube: mediaList.filter((m) => m.type === "youtube" || Boolean(m.youtubeId)).length,
      map: mediaList.filter((m) => m.type === "map" || Boolean(m.mapConfig)).length,
      pdf: mediaList.filter((m) => m.type === "pdf").length,
      website: mediaList.filter((m) => m.type === "website" || Boolean(m.websiteConfig)).length,
      audio: mediaList.filter((m) => m.type === "audio").length,
      image: mediaList.filter((m) => m.type === "image").length,
    };
  }, [mediaList]);

  const filteredMediaList = useMemo(() => {
    return mediaList.filter((item) => {
      if (activeCategory !== "all") {
        if (activeCategory === "youtube" && !(item.type === "youtube" || item.youtubeId))
          return false;
        else if (activeCategory === "map" && !(item.type === "map" || item.mapConfig))
          return false;
        else if (
          activeCategory === "website" &&
          !(item.type === "website" || item.websiteConfig)
        )
          return false;
        else if (
          ["video", "pdf", "audio", "image"].includes(activeCategory) &&
          item.type !== activeCategory
        )
          return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.duration || "").toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mediaList, activeCategory, searchQuery]);

  const uploadedVideos = mediaList.filter((m) => m.type === "video" && m.isUploaded);
  const uploadedAudios = mediaList.filter((m) => m.type === "audio" && m.isUploaded);
  const uploadedDocs = mediaList.filter(
    (m) => (m.type === "image" || m.type === "pdf") && !m.slides && m.isUploaded
  );

  const totalVideoDurationSec = uploadedVideos.reduce((acc, item) => {
    if (item.durationSeconds && item.durationSeconds > 0)
      return acc + item.durationSeconds;
    const parts = (item.duration || "").split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (!isNaN(m) && !isNaN(s)) return acc + m * 60 + s;
    }
    return acc;
  }, 0);

  const MAX_VIDEO_LIMIT_SEC = 3600;
  const remainingVideoSec = Math.max(0, MAX_VIDEO_LIMIT_SEC - totalVideoDurationSec);
  const remainingMinutes = Math.floor(remainingVideoSec / 60);
  const remainingSeconds = remainingVideoSec % 60;
  const usedMinutes = Math.floor(totalVideoDurationSec / 60);
  const usedSeconds = totalVideoDurationSec % 60;

  const CATEGORY_TABS: Array<{ id: MediaCategoryTab; label: string; count: number }> = [
    { id: "all", label: "All", count: counts.all },
    { id: "youtube", label: "▶️ YouTube", count: counts.youtube },
    { id: "map", label: "🗺️ 3D Map", count: counts.map },
    { id: "pdf", label: "📊 Slides", count: counts.pdf },
    { id: "website", label: "🌐 Website", count: counts.website },
    { id: "video", label: "🎬 Video", count: counts.video },
    { id: "audio", label: "🎵 Audio", count: counts.audio },
    { id: "image", label: "🖼️ Image", count: counts.image },
  ];

  return (
    <div className="h-full flex flex-col justify-between bg-[#0b0b12] select-none">
      {/* 1. Clean Top Header (Never Overflows!) */}
      <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <PlaySquare className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">Media & Stage Studio</span>
            </h3>
            <p className="text-[10.5px] text-slate-400 truncate">
              Navigate any media tab & drag directly to Scene or Stage
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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
                "h-7 px-2 text-[10.5px] font-bold rounded-lg border flex items-center gap-1 transition-all",
                autoRepeat
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
              )}
              title="Toggle Auto-Repeat for Stage Media"
            >
              <Repeat className="w-3 h-3" />
              <span>Repeat</span>
            </button>

            <button
              type="button"
              onClick={handleCleanupLibrary}
              className="h-7 px-2 text-[10.5px] font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 flex items-center gap-1 transition-all"
              title="Clean dummy or duplicate media items"
            >
              <Sparkles className="w-3 h-3" />
              <span>Clean</span>
            </button>
          </div>
        </div>

        {/* 2. 6-Button Studio Creation Grid (No Horizontal Overflow!) */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setIsYouTubeModalOpen(true)}
            className="h-8 px-2 text-[11px] font-bold rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Youtube className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMapItem(null);
              setIsMapModalOpen(true);
            }}
            className="h-8 px-2 text-[11px] font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">3D Map</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSlideCreatorOpen(true)}
            className="h-8 px-2 text-[11px] font-bold rounded-lg border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Slides</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWebsiteModalOpen(true)}
            className="h-8 px-2 text-[11px] font-bold rounded-lg border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Website</span>
          </button>

          <button
            type="button"
            onClick={handlePasteScreenshot}
            className="h-8 px-2 text-[11px] font-bold rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Clipboard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Paste</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-8 px-2 text-[11px] font-bold rounded-lg border border-indigo-400 bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isUploading ? "Wait..." : "Upload"}</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*,.pdf"
          className="hidden"
          onChange={handleFileUpload}
        />

        {cleanupNotice && (
          <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 text-center animate-in fade-in">
            ✨ {cleanupNotice}
          </div>
        )}
      </div>

      {/* 3. Dedicated 8-Category Navigation Tabs */}
      <div className="px-2.5 py-2 border-b border-white/10 bg-[#0e101d] space-y-2 shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "py-1.5 px-1.5 rounded-lg text-[10.5px] font-bold flex items-center justify-between gap-1 border transition-all truncate",
                activeCategory === tab.id
                  ? "bg-indigo-600 text-white border-indigo-400 shadow"
                  : "bg-white/[0.04] text-slate-300 border-white/5 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="truncate">{tab.label}</span>
              <span
                className={cn(
                  "text-[9.5px] font-mono px-1 rounded",
                  activeCategory === tab.id
                    ? "bg-black/30 text-cyan-200"
                    : "bg-white/5 text-slate-400"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search in ${activeCategory === "all" ? "all media" : activeCategory}...`}
            className="w-full pl-8 pr-6 py-1 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. VPS Storage Quota Status Bar */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-slate-950/60 flex items-center justify-between gap-1.5 text-[10px] shrink-0">
        <div className="flex-1 p-1 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
          <span className="text-slate-400 font-medium">Videos (≤60m)</span>
          <span
            className={cn(
              "font-mono font-bold text-[10.5px]",
              remainingVideoSec <= 0
                ? "text-rose-400"
                : remainingVideoSec < 300
                ? "text-amber-400"
                : "text-emerald-400"
            )}
          >
            {usedMinutes}m {usedSeconds}s / 60m
          </span>
        </div>

        <div className="flex-1 p-1 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
          <span className="text-slate-400 font-medium">Audio (MP3)</span>
          <span
            className={cn(
              "font-mono font-bold text-[10.5px]",
              uploadedAudios.length >= 2 ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {uploadedAudios.length} / 2
          </span>
        </div>

        <div className="flex-1 p-1 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
          <span className="text-slate-400 font-medium">Image/PDF</span>
          <span
            className={cn(
              "font-mono font-bold text-[10.5px]",
              uploadedDocs.length >= 2 ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {uploadedDocs.length} / 2
          </span>
        </div>
      </div>

      {/* 5. Active Stage Media Banner */}
      {activeMedia && (
        <div className="px-3 py-2 bg-indigo-950/75 border-b border-indigo-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Live On Stage</span>
                {activeMedia.loop !== false && (
                  <span className="text-[9.5px] text-emerald-400 font-mono font-normal">
                    (Loop)
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-white truncate max-w-[155px]">
                {activeMedia.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setActiveMedia(null)}
              className="h-7 px-2.5 text-[11px] font-bold"
            >
              <Square className="w-3 h-3 mr-1 fill-current" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* 6. Drag-to-Scene Helper Banner */}
      <div className="px-3 py-1.5 bg-indigo-950/30 border-b border-white/5 flex items-center justify-between text-[10.5px] text-indigo-200 shrink-0">
        <span className="flex items-center gap-1.5 truncate">
          <GripVertical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Drag any item onto a <strong>Scene</strong> or <strong>Stage</strong>
          </span>
        </span>
        <span className="text-[9.5px] font-mono text-cyan-400 shrink-0 ml-1">
          Drag & Drop
        </span>
      </div>

      {/* 7. Media Items List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
        {/* Category-Specific Quick Add CTA when viewing a filtered tab */}
        {activeCategory !== "all" && (
          <button
            type="button"
            onClick={() => {
              if (activeCategory === "youtube") setIsYouTubeModalOpen(true);
              else if (activeCategory === "map") {
                setEditingMapItem(null);
                setIsMapModalOpen(true);
              } else if (activeCategory === "pdf") setIsSlideCreatorOpen(true);
              else if (activeCategory === "website") setIsWebsiteModalOpen(true);
              else fileInputRef.current?.click();
            }}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-indigo-400/50 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>
              {activeCategory === "youtube" && "Add New YouTube Video / Clip"}
              {activeCategory === "map" && "Create New 3D/2D Tactical Map"}
              {activeCategory === "pdf" && "Create Slide Deck or Upload PDF"}
              {activeCategory === "website" && "Add New Interactive Website URL"}
              {activeCategory === "video" && "Upload Video File from PC"}
              {activeCategory === "audio" && "Upload MP3 Audio File"}
              {activeCategory === "image" && "Upload Image or Paste Screenshot"}
            </span>
          </button>
        )}

        {filteredMediaList.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center space-y-2 text-slate-400 my-2">
            <FolderOpen className="w-8 h-8 text-indigo-400/50 mx-auto" />
            <p className="text-xs font-bold text-slate-200">
              No {activeCategory === "all" ? "media" : activeCategory} items found
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use the buttons above to add YouTube clips, 3D Tactical Maps, Slide Decks, Website URLs, or upload files from your PC.
            </p>
          </div>
        ) : (
          filteredMediaList.map((item) => {
            const isPlaying = activeMedia?.id === item.id;
            const isOverlaying = activeStageOverlay?.id === item.id;
            const isCompatibleWithOverlay =
              item.type === "video" || item.type === "image";
            const isEditableModalItem =
              item.type === "youtube" ||
              item.type === "map" ||
              item.type === "website" ||
              Boolean(item.youtubeId || item.mapConfig || item.websiteConfig || item.slides);
            const isDragging = draggingMediaId === item.id;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  setDraggingMediaId(item.id);
                  const payloadItem: MediaFileItem = {
                    ...item,
                    loop: item.loop ?? autoRepeat,
                  };
                  const jsonStr = JSON.stringify({
                    type: "livestudio-media",
                    media: payloadItem,
                  });
                  e.dataTransfer.setData("application/x-livestudio-media", jsonStr);
                  e.dataTransfer.setData("text/plain", jsonStr);
                  e.dataTransfer.effectAllowed = "copyMove";
                }}
                onDragEnd={() => setDraggingMediaId(null)}
                title="Drag onto any Scene card on the left or onto the Live Stage"
                className={cn(
                  "p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-2 group cursor-grab active:cursor-grabbing",
                  isDragging &&
                    "opacity-60 border-cyan-400 ring-1 ring-cyan-400/50 scale-[0.98]",
                  isPlaying
                    ? "bg-indigo-500/20 border-indigo-400 shadow-md shadow-indigo-500/10"
                    : isOverlaying
                    ? "bg-purple-500/20 border-purple-400 shadow-md shadow-purple-500/10"
                    : "bg-[#121422] border-white/10 hover:border-indigo-400/50"
                )}
              >
                {/* Top Row: Grip + Icon + Name + Duration */}
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 shrink-0 transition-colors" />
                  <div
                    className={cn(
                      "p-2 rounded-lg border shrink-0",
                      isPlaying
                        ? "bg-indigo-600 text-white border-indigo-400"
                        : isOverlaying
                        ? "bg-purple-600 text-white border-purple-400"
                        : "bg-black/40 border-white/10 text-indigo-400"
                    )}
                  >
                    {item.type === "video" && <Video className="w-4 h-4" />}
                    {item.type === "youtube" && (
                      <Youtube className="w-4 h-4 text-rose-400" />
                    )}
                    {item.type === "map" && (
                      <Globe className="w-4 h-4 text-emerald-400" />
                    )}
                    {item.type === "website" && (
                      <Globe className="w-4 h-4 text-cyan-400" />
                    )}
                    {item.type === "pdf" && (
                      <FileText className="w-4 h-4 text-amber-400" />
                    )}
                    {item.type === "audio" && (
                      <Music className="w-4 h-4 text-emerald-400" />
                    )}
                    {item.type === "image" && (
                      <ImageIcon className="w-4 h-4 text-cyan-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className="text-xs font-bold text-white truncate"
                      title={item.name}
                    >
                      {item.name}
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="uppercase text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10">
                        {item.type}
                      </span>
                      <span className="truncate">{item.duration || "Ready"}</span>
                      {isPlaying && (
                        <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9.5px]">
                          • ON STAGE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Always-Visible Stage, Overlay, Edit & Delete Buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-white/5">
                  <Button
                    variant={isPlaying ? "danger" : "secondary"}
                    size="sm"
                    onClick={() => handleTogglePlay(item)}
                    className="h-7 px-2.5 text-[10.5px] font-bold flex-1"
                    title={
                      isPlaying
                        ? "Stop Stage Presentation"
                        : "Show / Play on Live Stage"
                    }
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3 h-3 mr-1 fill-current" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1 fill-current" />
                        Stage
                      </>
                    )}
                  </Button>

                  {isCompatibleWithOverlay && (
                    <Button
                      variant={isOverlaying ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleOverlay(item)}
                      className={cn(
                        "h-7 px-2.5 text-[10.5px] font-bold transition-colors",
                        isOverlaying
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-200 hover:text-white"
                      )}
                      title="Toggle Floating Stage Overlay"
                    >
                      <Layers className="w-3 h-3 mr-1" />
                      {isOverlaying ? "Active" : "Overlay"}
                    </Button>
                  )}

                  {isEditableModalItem && (
                    <button
                      type="button"
                      onClick={(e) => handleEditItem(item, e)}
                      className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 flex items-center gap-1 text-[10.5px] font-semibold transition-colors"
                      title="Edit item settings"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="h-7 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 flex items-center gap-1 text-[10.5px] font-semibold transition-colors"
                    title="Delete item from Media Library & Scenes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-white/5 bg-[#09090f] text-[10.5px] text-slate-400 flex items-center justify-between shrink-0">
        <span>VPS Disk Protection Active</span>
        <span className="text-emerald-400 font-mono font-semibold">Quota Enforced</span>
      </div>

      {/* In-App Multi-Slide Deck Creator Modal */}
      <SlideDeckCreatorModal
        isOpen={isSlideCreatorOpen}
        onClose={() => setIsSlideCreatorOpen(false)}
        onDeckCreated={(newDeck) => {
          setMediaList((prev) =>
            sanitizeAndDeduplicateMediaList([newDeck, ...prev], true)
          );
        }}
      />

      {/* Direct YouTube Scene Player & Library Modal */}
      <YouTubeLibraryModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        onSelectYouTubeItem={(ytItem) => {
          setMediaList((prev) =>
            sanitizeAndDeduplicateMediaList([ytItem, ...prev], true)
          );
        }}
      />

      {/* Broadcast News Tactical Map — 3D/2D Air, Land & Naval Simulator Modal */}
      <TacticalMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialItem={editingMapItem}
        onSaveMapItem={(mapItem) => {
          setMediaList((prev) =>
            sanitizeAndDeduplicateMediaList([mapItem, ...prev], true)
          );
        }}
      />

      {/* Interactive Website URL Scene & Library Modal */}
      <WebsiteLibraryModal
        isOpen={isWebsiteModalOpen}
        onClose={() => setIsWebsiteModalOpen(false)}
        onSelectWebsiteItem={(webItem) => {
          setMediaList((prev) =>
            sanitizeAndDeduplicateMediaList([webItem, ...prev], true)
          );
        }}
      />
    </div>
  );
};