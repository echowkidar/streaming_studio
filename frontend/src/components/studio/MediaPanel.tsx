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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useStudioStore } from "@/stores/studio.store";
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
  const { activeMedia, setActiveMedia } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

    const fileUrl = URL.createObjectURL(file);
    let type: "video" | "audio" | "image" | "pdf" = "video";
    if (file.type.startsWith("audio/")) type = "audio";
    else if (file.type.startsWith("image/")) type = "image";
    else if (file.type.includes("pdf")) type = "pdf";

    const newItem: MediaFileItem = {
      id: `media-${Date.now()}`,
      name: file.name,
      type,
      duration: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
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

      await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.warn("Backend MinIO upload skipped or errored, local preview active:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTogglePlay = (item: MediaFileItem) => {
    if (activeMedia?.id === item.id) {
      setActiveMedia(null);
    } else {
      setActiveMedia({
        id: item.id,
        name: item.name,
        type: item.type,
        url: item.url,
      });
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMedia?.id === id) setActiveMedia(null);
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  };

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

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*,.pdf"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Active Stage Media Banner */}
      {activeMedia && (
        <div className="px-3 py-2 bg-indigo-950/70 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                Playing On Stage:
              </div>
              <p className="text-[11px] text-white truncate max-w-[170px]">{activeMedia.name}</p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setActiveMedia(null)}
            className="h-6 px-2 text-[10px] shrink-0"
          >
            <Square className="w-3 h-3 mr-1 fill-current" />
            Stop
          </Button>
        </div>
      )}

      {/* Media Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {mediaList.map((item) => {
          const isPlaying = activeMedia?.id === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between group",
                isPlaying
                  ? "bg-indigo-500/15 border-indigo-500 shadow-md shadow-indigo-500/10"
                  : "bg-surface border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "p-2 rounded-lg border",
                    isPlaying
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-surface-raised border-white/5 text-indigo-400"
                  )}
                >
                  {item.type === "video" && <Video className="w-4 h-4" />}
                  {item.type === "pdf" && <FileText className="w-4 h-4" />}
                  {item.type === "audio" && <Music className="w-4 h-4" />}
                  {item.type === "image" && <PlaySquare className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate max-w-[130px]" title={item.name}>
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                    <span>{item.duration}</span>
                    {isPlaying && (
                      <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">
                        • ON STAGE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant={isPlaying ? "danger" : "primary"}
                  size="sm"
                  onClick={() => handleTogglePlay(item)}
                  className="h-7 px-2.5 text-[10px] font-medium"
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-3 h-3 mr-1 fill-current" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1 fill-current" />
                      Play
                    </>
                  )}
                </Button>

                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-opacity"
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
      <div className="p-3 border-t border-white/5 bg-[#09090f] text-[10px] text-slate-500 flex items-center justify-between">
        <span>Supported: MP4, WebM, MP3, PNG, PDF</span>
        <span className="text-indigo-400 font-mono">1080p Ready</span>
      </div>
    </div>
  );
};
