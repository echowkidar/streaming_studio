"use client";

import React, { useState, useEffect } from "react";
import { Film, Download, CircleDot, CheckCircle2, HardDrive, Play, ShieldAlert } from "lucide-react";
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
  const { participants, isRecording } = useStudioStore();
  const [recorders, setRecorders] = useState<Map<string, LocalParticipantRecorder>>(new Map());
  const [tracks, setTracks] = useState<LocalRecordingTrack[]>([]);

  // Initialize or update recorder instances for participants
  useEffect(() => {
    const newMap = new Map(recorders);
    participants.forEach((p) => {
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
        setTracks((prev) => [...prev, recorder.trackInfo]);
      }
    });
    setRecorders(newMap);
  }, [participants]);

  const toggleTrackRecord = async (participantId: string) => {
    const recorder = recorders.get(participantId);
    if (!recorder) return;

    if (recorder.trackInfo.status === "RECORDING") {
      await recorder.stop();
    } else {
      await recorder.start();
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
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            ISO tracks are stored in browser memory & buffered locally.
          </span>
          <Badge variant="purple" size="sm">ZERO OVERLAY</Badge>
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
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                    <span>{formatDuration(track.durationSeconds)}</span>
                    <span>•</span>
                    <span>{formatFileSize(track.blobSize)}</span>
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
                  <CircleDot className={`w-3.5 h-3.5 mr-1.5 ${track.status === "RECORDING" ? "animate-pulse" : ""}`} />
                  {track.status === "RECORDING" ? "Stop ISO" : "Record ISO"}
                </Button>

                {track.downloadUrl && (
                  <a href={track.downloadUrl} download={`${track.participantName}_ISO_${Date.now()}.webm`}>
                    <Button variant="primary" size="sm" className="h-8 text-xs">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Save
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
