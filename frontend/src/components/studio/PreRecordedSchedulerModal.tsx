"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Radio,
  Zap,
  ShieldCheck,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useStudioStore } from "@/stores/studio.store";
import { formatDuration } from "@/lib/utils";

interface PreRecordedSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId?: string;
}

interface MediaAssetOption {
  id: string;
  name: string;
  duration?: number;
  fileSize: number;
}

export const PreRecordedSchedulerModal: React.FC<PreRecordedSchedulerModalProps> = ({
  isOpen,
  onClose,
  studioId,
}) => {
  const { destinations } = useStudioStore();

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [sourceType, setSourceType] = useState<"upload" | "library">("upload");

  // Upload source
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);

  // Library source
  const [libraryVideos, setLibraryVideos] = useState<MediaAssetOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Scheduling date & time (Strictly between now and +72 hours)
  const now = new Date();
  const minDateTime = new Date(now.getTime() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const maxDateTime = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [scheduledDateTime, setScheduledDateTime] = useState(minDateTime);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Selected destinations
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState<{
    title: string;
    scheduledAt: string;
    duration: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default select all available destinations
  useEffect(() => {
    if (destinations.length > 0 && selectedDestinations.length === 0) {
      setSelectedDestinations(destinations.map((d) => d.id));
    }
  }, [destinations]);

  // Load existing media library videos
  useEffect(() => {
    if (!isOpen) return;
    const fetchLibrary = async () => {
      try {
        setIsLoadingLibrary(true);
        const res = await fetch("/api/media?type=VIDEO");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            // Filter videos that are <= 40 minutes (2400s)
            const valid = json.data.filter((v: any) => !v.duration || v.duration <= 2400);
            setLibraryVideos(valid);
            if (valid.length > 0 && !selectedAssetId) {
              setSelectedAssetId(valid[0].id);
              setFileDuration(valid[0].duration || 0);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch media library videos:", e);
      } finally {
        setIsLoadingLibrary(false);
      }
    };
    fetchLibrary();
  }, [isOpen]);

  // Handle local file selection and measure duration
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDurationError(null);
    setFileDuration(null);

    // Read duration locally via HTML5 video element
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = URL.createObjectURL(file);

    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(tempVideo.src);
      const dur = Math.round(tempVideo.duration);
      setFileDuration(dur);

      if (dur > 2400) {
        setDurationError(
          `Video is ${formatDuration(dur)} long! Pre-recorded broadcasts are capped at a maximum of 40 minutes (2400 seconds). Please select a shorter video.`
        );
      } else {
        setDurationError(null);
      }
    };

    tempVideo.onerror = () => {
      URL.revokeObjectURL(tempVideo.src);
      setDurationError("Could not read video metadata. Please ensure this is a valid MP4/WebM video.");
    };
  };

  const handleToggleDestination = (id: string) => {
    setSelectedDestinations((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationError) return;

    const schedDate = new Date(scheduledDateTime);
    const nowTime = Date.now();
    if (schedDate.getTime() < nowTime) {
      setScheduleError("Scheduled time must be in the future (at least 5 minutes from now).");
      return;
    }
    if (schedDate.getTime() > nowTime + 72 * 60 * 60 * 1000) {
      setScheduleError("Broadcast cannot be scheduled more than 72 hours (3 days) in advance.");
      return;
    }

    if (sourceType === "upload" && !selectedFile) {
      alert("Please upload a video file.");
      return;
    }
    if (sourceType === "library" && !selectedAssetId) {
      alert("Please select a video from the library.");
      return;
    }

    try {
      setIsSubmitting(true);
      setScheduleError(null);

      const formData = new FormData();
      formData.append("title", broadcastTitle.trim());
      formData.append("scheduledAt", schedDate.toISOString());
      formData.append("duration", String(fileDuration || 0));
      formData.append("destinationIds", JSON.stringify(selectedDestinations));
      if (studioId) formData.append("studioId", studioId);

      if (sourceType === "upload" && selectedFile) {
        formData.append("video", selectedFile);
      } else if (sourceType === "library" && selectedAssetId) {
        formData.append("mediaAssetId", selectedAssetId);
      }

      const res = await fetch("/api/broadcasts/schedule-prerecorded", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setScheduledInfo({
          title: broadcastTitle,
          scheduledAt: schedDate.toLocaleString(),
          duration: fileDuration || 0,
        });
        setIsScheduled(true);
      } else {
        setScheduleError(json.error || "Failed to schedule pre-recorded broadcast.");
      }
    } catch (err: any) {
      setScheduleError(err.message || "Network error while scheduling broadcast.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsScheduled(false);
        onClose();
      }}
      title="Schedule Pre-Recorded Live Broadcast"
      description="Stream an existing video to your destinations as a simulated live event. Stored temporarily on VPS and auto-deleted immediately after completion."
      maxWidth="lg"
    >
      {!isScheduled ? (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Broadcast Title */}
          <Input
            label="Broadcast Title"
            placeholder="e.g. Worldwide Product Launch (Automated Broadcast)"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            required
            autoFocus
          />

          {/* Video Source Tabs */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Source Video (Max 40 Minutes)</span>
              <span className="text-[11px] text-indigo-400 font-mono">Capped at 40:00</span>
            </label>

            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-raised rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setSourceType("upload");
                  setDurationError(null);
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  sourceType === "upload"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload New Video
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceType("library");
                  setDurationError(null);
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  sourceType === "library"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Select from Media Library
              </button>
            </div>

            {/* Upload File Input */}
            {sourceType === "upload" && (
              <div className="p-4 rounded-xl bg-surface border border-white/10 text-center space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-white/20 hover:border-indigo-500/60 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-all bg-white/[0.01] hover:bg-white/[0.03]"
                  >
                    <Upload className="w-6 h-6 text-indigo-400 animate-bounce" />
                    <span className="font-semibold text-xs">Choose Video File from Computer</span>
                    <span className="text-[10px] text-slate-500">1080p MP4 or WebM • Max 40 Minutes Duration</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Film className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white font-bold truncate max-w-[240px] sm:max-w-xs">{selectedFile.name}</p>
                        <p className="text-[11px] text-indigo-300 font-mono">
                          {fileDuration !== null ? formatDuration(fileDuration) : "Analyzing duration..."} •{" "}
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileDuration(null);
                        setDurationError(null);
                      }}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Pick from Media Library */}
            {sourceType === "library" && (
              <div className="p-3 rounded-xl bg-surface border border-white/10 space-y-2">
                {isLoadingLibrary ? (
                  <p className="text-slate-400 text-center py-2">Loading library videos...</p>
                ) : libraryVideos.length === 0 ? (
                  <p className="text-slate-400 text-center py-2">
                    No suitable videos found in Media Library. Please upload a new video.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {libraryVideos.map((v) => (
                      <label
                        key={v.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          selectedAssetId === v.id
                            ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                            : "bg-surface-raised/60 border-white/5 text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="radio"
                            name="libraryVideo"
                            checked={selectedAssetId === v.id}
                            onChange={() => {
                              setSelectedAssetId(v.id);
                              setFileDuration(v.duration || 0);
                            }}
                            className="text-indigo-600 focus:ring-0"
                          />
                          <span className="truncate font-medium">{v.name}</span>
                        </div>
                        <span className="text-[11px] font-mono text-indigo-300 shrink-0">
                          {v.duration ? formatDuration(v.duration) : "≤40m"}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Duration Error Message */}
            {durationError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{durationError}</span>
              </div>
            )}
          </div>

          {/* Schedule Date & Time (Max 72 Hours Window) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Broadcast Date & Time (Max 72h Window)</label>
              <span className="text-[10px] text-slate-400">Within 3 Days</span>
            </div>
            <Input
              type="datetime-local"
              min={minDateTime}
              max={maxDateTime}
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              required
            />
            <p className="text-[10px] text-slate-500">
              You can schedule this stream up to 72 hours in advance. The server will stream automatically without your computer staying online.
            </p>
          </div>

          {/* Destination Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Push to Destinations</label>
            {destinations.length === 0 ? (
              <p className="text-slate-500 text-[11px]">No destinations configured. Add YouTube or Twitch in the Destinations dashboard tab.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {destinations.map((d) => {
                  const isChecked = selectedDestinations.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                          : "bg-surface/60 border-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate pr-2 font-medium">{d.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleDestination(d.id)}
                        className="rounded bg-surface text-indigo-500 shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* VPS Auto-Delete Policy Guarantee Badge */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px] leading-relaxed flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">VPS Auto-Delete Policy:</strong>
              <p className="mt-0.5">
                • Video is <strong>immediately deleted</strong> from the VPS server disk as soon as the live broadcast completes.
                <br />• If the broadcast encounters an error, the video is <strong>automatically deleted after 24 hours</strong> so server space stays completely clean.
              </p>
            </div>
          </div>

          {scheduleError && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{scheduleError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !!durationError || (!selectedFile && !selectedAssetId)}
              className="shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? "Uploading & Scheduling..." : "Schedule Broadcast"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">Broadcast Scheduled Successfully!</h3>
            <p className="text-xs text-slate-300 font-medium">
              "{scheduledInfo?.title}"
            </p>
            <p className="text-xs text-slate-400">
              Live broadcast will begin on <strong className="text-white">{scheduledInfo?.scheduledAt}</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-white/10 max-w-sm mx-auto text-left text-[11px] text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Video Duration:</span>
              <span className="font-mono text-white font-bold">{scheduledInfo ? formatDuration(scheduledInfo.duration) : "≤40m"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">VPS Disk Cleanup:</span>
              <span className="text-emerald-400 font-bold">Auto-Delete on Complete</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PC Required:</span>
              <span className="text-indigo-300">No (Streams from VPS)</span>
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={onClose} className="px-6">
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
};
