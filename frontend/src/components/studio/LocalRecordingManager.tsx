"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Download, CircleDot, HardDrive, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useStudioStore } from "@/stores/studio.store";
import { LocalParticipantRecorder, LocalRecordingTrack } from "@/lib/localRecorder";
import { formatDuration, formatFileSize } from "@/lib/utils";

interface LocalRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalRecordingManager: React.FC<LocalRecordingModalProps> = ({ isOpen, onClose }) => {
  const { participants } = useStudioStore();
  const [recorders, setRecorders] = useState<Map<string, LocalParticipantRecorder>>(new Map());
  const [tracks, setTracks] = useState<LocalRecordingTrack[]>([]);

  // Deduplicate participants by unique ID and remove stale placeholder copies
  const uniqueParticipants = useMemo(() => {
    const map = new Map<string, typeof participants[0]>();
    participants.forEach((p) => {
      const idStr = String(p.id);
      if (!map.has(idStr)) {
        map.set(idStr, p);
      }
    });
    return Array.from(map.values());
  }, [participants]);

  // Synchronize recorders with active unique participants
  useEffect(() => {
    const newMap = new Map(recorders);
    const activeIds = new Set(uniqueParticipants.map((p) => String(p.id)));

    // Clean up recorders for participants that disconnected
    newMap.forEach((rec, id) => {
      if (!activeIds.has(id)) {
        if (rec.trackInfo.status === "RECORDING") {
          rec.stop();
        }
        newMap.delete(id);
      }
    });

    // Create recorder instances for newly joined participants
    uniqueParticipants.forEach((p) => {
      const pId = String(p.id);
      if (!newMap.has(pId)) {
        const recorder = new LocalParticipantRecorder(pId, p.name, (updatedTrack) => {
          setTracks((prev) => {
            const index = prev.findIndex((t) => t.participantId === updatedTrack.participantId);
            if (index >= 0) {
              const copy = [...prev];
              copy[index] = updatedTrack;
              return copy;
            }
            return [...prev, updatedTrack];
          });
        });
        newMap.set(pId, recorder);
      }
    });

    setRecorders(newMap);
    setTracks(
      uniqueParticipants
        .map((p) => newMap.get(String(p.id))?.trackInfo)
        .filter(Boolean) as LocalRecordingTrack[]
    );
  }, [uniqueParticipants]);

  const extractParticipantStream = (p: typeof participants[0]): MediaStream | null => {
    const tracks: MediaStreamTrack[] = [];

    // 1. Video track extraction from LiveKit Track publication
    const vTrack =
      (p.videoTrack as any)?.mediaStreamTrack ||
      (p.videoTrack instanceof MediaStreamTrack ? p.videoTrack : null) ||
      (p.videoTrack as any)?.track?.mediaStreamTrack;
    if (vTrack && vTrack.readyState === "live") {
      tracks.push(vTrack);
    }

    // 2. Audio track extraction from LiveKit Track publication
    const aTrack =
      (p.audioTrack as any)?.mediaStreamTrack ||
      (p.audioTrack instanceof MediaStreamTrack ? p.audioTrack : null) ||
      (p.audioTrack as any)?.track?.mediaStreamTrack;
    if (aTrack && aTrack.readyState === "live") {
      tracks.push(aTrack);
    }

    // 3. DOM fallback: Inspect rendered <video> element for this participant
    if (tracks.length === 0 && typeof document !== "undefined") {
      const videoEl =
        (document.querySelector(`video[data-participant-id="${p.id}"]`) as HTMLVideoElement | null) ||
        (document.getElementById(`participant-video-${p.id}`) as HTMLVideoElement | null);

      if (videoEl) {
        if (videoEl.srcObject instanceof MediaStream) {
          return videoEl.srcObject;
        }
        try {
          const captured = (videoEl as any).captureStream?.() || (videoEl as any).mozCaptureStream?.();
          if (captured && captured.getTracks().length > 0) {
            return captured;
          }
        } catch {}
      }
    }

    return tracks.length > 0 ? new MediaStream(tracks) : null;
  };

  const toggleTrackRecord = async (participantId: string) => {
    const recorder = recorders.get(participantId);
    if (!recorder) return;

    if (recorder.trackInfo.status === "RECORDING") {
      await recorder.stop();
    } else {
      const participant = uniqueParticipants.find((p) => String(p.id) === participantId);
      const stream = participant ? extractParticipantStream(participant) : null;
      await recorder.start(stream || undefined);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Individual Local ISO Recordings"
      description="Record clean, high-bitrate video/audio tracks for each participant locally in the browser without stream compression or overlays."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>100% Local PC Recording:</strong> ISO tracks are captured in your browser memory and downloaded directly to your computer. <strong>Zero bytes are uploaded to the VPS server.</strong>
            </span>
          </span>
          <Badge variant="success" size="sm" className="shrink-0 ml-2">ZERO VPS DATA</Badge>
        </div>

        <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-surface overflow-hidden">
          {tracks.map((track) => (
            <div key={track.id} className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-raised border border-white/5 flex items-center justify-center font-bold text-white text-xs">
                  {track.participantName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{track.participantName}</span>
                    {track.status === "RECORDING" && <Badge variant="recording" size="sm">RECORDING</Badge>}
                    {track.status === "STOPPED" && <Badge variant="success" size="sm">READY</Badge>}
                    <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                      {(track.fileExtension || "MP4").toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                    <span>{formatDuration(track.durationSeconds)}</span>
                    <span>•</span>
                    <span className={track.blobSize > 0 ? "text-emerald-400" : "text-slate-500"}>
                      {formatFileSize(track.blobSize)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={track.status === "RECORDING" ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => toggleTrackRecord(track.participantId)}
                  className="h-8 text-xs font-medium"
                >
                  <CircleDot className={`w-3.5 h-3.5 mr-1.5 ${track.status === "RECORDING" ? "animate-pulse text-rose-400" : ""}`} />
                  {track.status === "RECORDING" ? "Stop ISO" : "Record ISO"}
                </Button>

                {track.downloadUrl && (
                  <a
                    href={track.downloadUrl}
                    download={track.fileName || `${track.participantName}_ISO_${Date.now()}.${track.fileExtension || "mp4"}`}
                  >
                    <Button variant="primary" size="sm" className="h-8 text-xs">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Save {(track.fileExtension || "mp4").toUpperCase()}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
