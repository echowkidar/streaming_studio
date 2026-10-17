"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Youtube,
  X,
  Plus,
  Play,
  Clock,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  ExternalLink,
  Film,
} from "lucide-react";
import { MediaFileItem, useStudioStore } from "@/stores/studio.store";
import { cn } from "@/lib/utils";

export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function parseTimeInputToSeconds(val: string): number | undefined {
  if (!val || !val.trim()) return undefined;
  const clean = val.trim();
  if (/^\d+(\.\d+)?$/.test(clean)) {
    const sec = Math.max(0, Math.round(Number(clean)));
    return sec > 0 ? sec : undefined;
  }
  const parts = clean.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return undefined;
  if (parts.length === 2) {
    const total = parts[0] * 60 + parts[1];
    return total > 0 ? total : undefined;
  }
  if (parts.length === 3) {
    const total = parts[0] * 3600 + parts[1] * 60 + parts[2];
    return total > 0 ? total : undefined;
  }
  return undefined;
}

export function formatSecondsToMmSs(sec?: number): string {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return "";
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface YouTubeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSceneId?: string | null;
  onSelectYouTubeItem?: (item: MediaFileItem) => void;
}

export const YouTubeLibraryModal: React.FC<YouTubeLibraryModalProps> = ({
  isOpen,
  onClose,
  targetSceneId,
  onSelectYouTubeItem,
}) => {
  const {
    mediaLibrary,
    addMediaLibraryItem,
    updateMediaLibraryItem,
    removeMediaLibraryItem,
    setActiveMedia,
    activeMedia,
    scenes,
    activeSceneId,
    updateScene,
    switchScene,
  } = useStudioStore();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [loopClip, setLoopClip] = useState(true);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveSceneId = targetSceneId || activeSceneId;
  const targetScene = scenes.find((s) => s.id === effectiveSceneId);

  const youtubeItems = React.useMemo(
    () => mediaLibrary.filter((m) => m.type === "youtube" || Boolean(m.youtubeId)),
    [mediaLibrary]
  );

  // Auto-resolve video ID & fetch public oEmbed title (Zero API Key) when URL changes
  useEffect(() => {
    const vid = extractYouTubeVideoId(urlInput);
    setPreviewVideoId(vid);
    setErrorMsg(null);
    if (!vid) return;

    let cancelled = false;
    setIsFetchingMeta(true);

    // 1. Try public noembed / oEmbed (100% free, no API key, CORS enabled)
    fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${vid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.title && !titleInput.trim()) {
          setTitleInput(data.title);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsFetchingMeta(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlInput]);

  if (!isOpen || !isMounted) return null;

  const resetForm = () => {
    setUrlInput("");
    setTitleInput("");
    setStartInput("");
    setEndInput("");
    setPreviewVideoId(null);
    setEditingItemId(null);
    setErrorMsg(null);
  };

  const handleEditExistingItem = (item: MediaFileItem) => {
    setEditingItemId(item.id);
    setUrlInput(item.youtubeUrl || `https://www.youtube.com/watch?v=${item.youtubeId || ""}`);
    setTitleInput(item.name);
    setStartInput(formatSecondsToMmSs(item.startTimeSec));
    setEndInput(formatSecondsToMmSs(item.endTimeSec));
    setLoopClip(item.loop ?? true);
    setPreviewVideoId(item.youtubeId || extractYouTubeVideoId(item.url));
  };

  const handleSaveYouTubeClip = (attachAndPlayNow: boolean) => {
    const videoId = extractYouTubeVideoId(urlInput);
    if (!videoId) {
      setErrorMsg("Please paste a valid YouTube Video URL (watch?v=, youtu.be/, shorts/, or live/).");
      return;
    }

    const startSec = parseTimeInputToSeconds(startInput);
    const endSec = parseTimeInputToSeconds(endInput);

    if (startSec !== undefined && endSec !== undefined && endSec <= startSec) {
      setErrorMsg("End Time must be greater than Start Time.");
      return;
    }

    const clipRangeLabel =
      startSec || endSec
        ? `${startSec ? formatSecondsToMmSs(startSec) : "00:00"} → ${endSec ? formatSecondsToMmSs(endSec) : "End"}`
        : "Full Video";

    const cleanTitle = titleInput.trim() || `YouTube Clip (${videoId})`;
    const canonicalWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const streamProxyUrl = `/api/media/youtube/stream?videoId=${videoId}`;
    const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    if (editingItemId) {
      const updates: Partial<MediaFileItem> = {
        name: cleanTitle,
        type: "youtube",
        url: streamProxyUrl,
        youtubeId: videoId,
        youtubeUrl: canonicalWatchUrl,
        thumbnail: thumbUrl,
        duration: clipRangeLabel,
        startTimeSec: startSec,
        endTimeSec: endSec,
        loop: loopClip,
        isUploaded: true,
      };
      updateMediaLibraryItem(editingItemId, updates);
      const updatedFull = mediaLibrary.find((m) => m.id === editingItemId);
      if (attachAndPlayNow && updatedFull) {
        const merged = { ...updatedFull, ...updates };
        if (effectiveSceneId) {
          updateScene(effectiveSceneId, { activeMedia: merged });
          if (effectiveSceneId !== activeSceneId) {
            switchScene(effectiveSceneId);
          }
        }
        setActiveMedia(merged);
        onSelectYouTubeItem?.(merged);
        onClose();
      } else {
        resetForm();
      }
      return;
    }

    const newItem: MediaFileItem = {
      id: `yt-clip-${Date.now()}`,
      name: cleanTitle,
      type: "youtube",
      url: streamProxyUrl,
      youtubeId: videoId,
      youtubeUrl: canonicalWatchUrl,
      thumbnail: thumbUrl,
      duration: clipRangeLabel,
      startTimeSec: startSec,
      endTimeSec: endSec,
      loop: loopClip,
      volume: 100,
      isMuted: false,
      isUploaded: true,
    };

    addMediaLibraryItem(newItem);

    if (attachAndPlayNow) {
      if (effectiveSceneId) {
        updateScene(effectiveSceneId, { activeMedia: newItem });
        if (effectiveSceneId !== activeSceneId) {
          switchScene(effectiveSceneId);
        }
      }
      setActiveMedia(newItem);
      onSelectYouTubeItem?.(newItem);
      resetForm();
      onClose();
    } else {
      resetForm();
    }
  };

  const handleAttachLibraryItemToScene = (item: MediaFileItem) => {
    if (effectiveSceneId) {
      updateScene(effectiveSceneId, { activeMedia: item });
      if (effectiveSceneId !== activeSceneId) {
        switchScene(effectiveSceneId);
      }
    }
    setActiveMedia(item);
    onSelectYouTubeItem?.(item);
    onClose();
  };

  const handleDetachFromScene = () => {
    if (effectiveSceneId) {
      updateScene(effectiveSceneId, { activeMedia: null });
    }
    if (!targetSceneId || targetSceneId === activeSceneId) {
      setActiveMedia(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0d0e1a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#121324] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Direct YouTube Scene Player & Clip Library</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Zero API Key • Subtitles OFF • Fair-Use Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Paste any YouTube URL with optional Start/End time — plays automatically when switching to your Scene
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-0">
          {/* Left Column: Add / Edit YouTube URL & Start/End Time (6 cols) */}
          <div className="lg:col-span-6 p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{editingItemId ? "Edit / Replace YouTube Clip" : "Add New YouTube Video to Library"}</span>
              </span>
              {editingItemId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-slate-400 hover:text-white underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* YouTube URL Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 block">
                YouTube Video URL or Video ID *
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* Clip Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300">
                  Clip Title / Label (Auto-fetched or custom)
                </label>
                {isFetchingMeta && (
                  <span className="text-[10px] text-cyan-400 animate-pulse">Fetching title...</span>
                )}
              </div>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="e.g. Breaking News Footage / Reaction Clip"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Optional Start Time & End Time */}
            <div className="p-3 rounded-xl bg-indigo-950/25 border border-indigo-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Optional Start Time & End Time Trim</span>
                </span>
                <span className="text-[9.5px] font-mono text-slate-400">Format: mm:ss or seconds</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-300 font-medium block mb-1">
                    Start Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    placeholder="00:00 (Start of video)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Leave blank to play from 0:00
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 font-medium block mb-1">
                    End Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    placeholder="Full Duration (No limit)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Leave blank to play till end
                  </span>
                </div>
              </div>

              {/* Loop vs Play Once at End Time */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-[10px] text-slate-300">When End Time (or video end) is reached:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLoopClip(true)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                      loopClip
                        ? "bg-indigo-600 text-white border-indigo-400"
                        : "bg-white/5 text-slate-400 border-white/10"
                    )}
                  >
                    Loop Clip Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoopClip(false)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                      !loopClip
                        ? "bg-amber-600 text-white border-amber-400"
                        : "bg-white/5 text-slate-400 border-white/10"
                    )}
                  >
                    Stop / Next Scene
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Preview */}
            {previewVideoId && (
              <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-3">
                <img
                  src={`https://i.ytimg.com/vi/${previewVideoId}/hqdefault.jpg`}
                  alt="YouTube Preview"
                  className="w-24 h-14 rounded-lg object-cover border border-white/15 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {titleInput || `YouTube Video (${previewVideoId})`}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    ID: {previewVideoId} • Subtitles: OFF
                  </div>
                  <div className="text-[10px] text-amber-300 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Fair-Use (Grain, Lines, Jerk/Pause, Flip, Speed, Volume) Ready</span>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSaveYouTubeClip(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{editingItemId ? "Save Changes to Library" : "Save to YouTube Library"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveYouTubeClip(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{targetScene ? `Add to "${targetScene.name}"` : "Play on Stage Now"}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Saved YouTube Video Library & Scene Assignment (6 cols) */}
          <div className="lg:col-span-6 p-4 bg-[#090a14] flex flex-col justify-between gap-3 overflow-y-auto custom-scrollbar">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-rose-400" />
                  <span>Saved YouTube Clips Library ({youtubeItems.length})</span>
                </span>
                {targetScene && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Target Scene: <strong>{targetScene.name}</strong>
                  </span>
                )}
              </div>

              {/* Currently Attached Scene Media Banner with Remove/Replace */}
              {targetScene?.activeMedia && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-bold uppercase text-emerald-400 block">
                      Currently Attached to {targetScene.name}:
                    </span>
                    <span className="text-xs font-semibold text-white truncate block">
                      {targetScene.activeMedia.name} ({targetScene.activeMedia.duration || "Ready"})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetachFromScene}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-semibold border border-rose-500/40 shrink-0 transition-colors"
                  >
                    Remove from Scene
                  </button>
                </div>
              )}

              {youtubeItems.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-2 text-slate-400">
                  <Youtube className="w-8 h-8 text-rose-500/50 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">No YouTube clips in library yet</p>
                  <p className="text-[11px] text-slate-500">
                    Paste any YouTube link on the left, set optional Start/End times, and click Save. Click any saved clip here to attach or replace it in your Scene!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1 custom-scrollbar">
                  {youtubeItems.map((item) => {
                    const isAttachedToScene = targetScene?.activeMedia?.id === item.id;
                    const isPlayingOnStage = activeMedia?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAttachLibraryItemToScene(item)}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all group",
                          isAttachedToScene || isPlayingOnStage
                            ? "bg-rose-950/30 border-rose-500/60 ring-1 ring-rose-500/30"
                            : "bg-white/[0.03] border-white/10 hover:border-rose-500/40 hover:bg-white/[0.06]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-20 h-12 rounded-lg overflow-hidden bg-black border border-white/10 relative shrink-0">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Youtube className="w-5 h-5 text-rose-500" />
                              </div>
                            )}
                            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/85 text-[8px] font-mono text-amber-300">
                              {item.duration || "Full"}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              <span>
                                ⏱ {item.startTimeSec ? formatSecondsToMmSs(item.startTimeSec) : "00:00"} →{" "}
                                {item.endTimeSec ? formatSecondsToMmSs(item.endTimeSec) : "End"}
                              </span>
                              <span>•</span>
                              <span>{item.loop !== false ? "Loop" : "1-Shot"}</span>
                              {isAttachedToScene && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                                  In Scene ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleAttachLibraryItemToScene(item)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors",
                              isAttachedToScene
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 hover:bg-rose-500 text-white"
                            )}
                            title="Attach or Replace in Scene"
                          >
                            {isAttachedToScene ? "Play" : targetScene?.activeMedia ? "Replace" : "Use"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditExistingItem(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10"
                            title="Edit Start/End Time or URL"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMediaLibraryItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30"
                            title="Delete from YouTube Library"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/30 text-[10.5px] text-amber-200/90 leading-relaxed">
              💡 <strong>Zero-Download Instant Workflow:</strong> Switching to any Scene with a YouTube clip automatically starts playing from your configured <strong>Start Time</strong>, hides subtitles, applies your <strong>Fair-Use Safe Mode</strong> filters (Grain, Lines, 8–12s Jerk/Pause, Flip, Speed, Volume/Ducking), and stops or loops at your <strong>End Time</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
