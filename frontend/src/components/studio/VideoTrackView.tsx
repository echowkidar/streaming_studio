"use client";

import React, { useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff, MonitorUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoTrackViewProps {
  track?: any; // LiveKit Track or LocalVideoTrack / RemoteVideoTrack
  audioTrack?: any; // LiveKit RemoteAudioTrack
  mediaStream?: MediaStream | null;
  name: string;
  isSpeaking?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  isLocal?: boolean;
  isScreen?: boolean;
  role?: string;
  className?: string;
}

export function VideoTrackView({
  track,
  audioTrack,
  mediaStream,
  name,
  isSpeaking = false,
  micOn = true,
  camOn = true,
  isLocal = false,
  isScreen = false,
  role,
  className,
}: VideoTrackViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachedTrackRef = useRef<any>(null);

  // Play video track safely without flickering on re-renders
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (track && typeof track.attach === "function") {
      if (attachedTrackRef.current !== track) {
        if (attachedTrackRef.current && typeof attachedTrackRef.current.detach === "function") {
          try {
            attachedTrackRef.current.detach(videoEl);
          } catch {
            // ignore
          }
        }
        track.attach(videoEl);
        attachedTrackRef.current = track;
      }
    } else if (mediaStream) {
      if (videoEl.srcObject !== mediaStream) {
        videoEl.srcObject = mediaStream;
      }
    } else {
      if (attachedTrackRef.current && typeof attachedTrackRef.current.detach === "function") {
        try {
          attachedTrackRef.current.detach(videoEl);
        } catch {
          // ignore
        }
        attachedTrackRef.current = null;
      }
      videoEl.srcObject = null;
    }
  }, [track, mediaStream]);

  // Unmount cleanup for video
  useEffect(() => {
    return () => {
      const videoEl = videoRef.current;
      if (videoEl && attachedTrackRef.current && typeof attachedTrackRef.current.detach === "function") {
        try {
          attachedTrackRef.current.detach(videoEl);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const hasActiveVideo = isScreen ? Boolean(track || mediaStream) : (camOn && Boolean(track || mediaStream));

  return (
    <div
      className={cn(
        "relative w-full h-full bg-[#0c0c14] rounded-2xl overflow-hidden flex items-center justify-center border transition-all duration-300",
        isSpeaking ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "border-white/10 hover:border-white/20",
        className
      )}
    >
      {/* Real Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local video to prevent audio feedback
        className={cn(
          "w-full h-full transition-opacity duration-300",
          isScreen ? "object-contain bg-black" : "object-cover",
          hasActiveVideo ? "opacity-100" : "opacity-0 absolute pointer-events-none",
          isLocal && !isScreen && "scale-x-[-1]" // Mirror local camera ONLY, never mirror screen share
        )}
      />

      {/* Camera Off / Screen Share Fallback State */}
      {!hasActiveVideo && (
        <div className="flex flex-col items-center justify-center gap-3 p-4 z-10 animate-in fade-in duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-xl">
            {isScreen ? <MonitorUp className="w-8 h-8 text-cyan-400" /> : initials}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            {isScreen ? (
              <>
                <MonitorUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Screen Share Inactive</span>
              </>
            ) : (
              <>
                <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Camera Off</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Participant Name & Mic Status Overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs">
        {isScreen && <MonitorUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
        <span className="font-medium text-white truncate max-w-[140px] sm:max-w-[200px]">
          {name} {isLocal && !isScreen && "(You)"}
        </span>
        {role && (
          <span className={cn(
            "text-[10px] uppercase font-bold px-1 rounded",
            isScreen ? "text-cyan-300 bg-cyan-500/20" : "text-indigo-400 bg-indigo-500/20"
          )}>
            {role}
          </span>
        )}
        {!isScreen && (
          <>
            <div className="w-px h-3 bg-white/20" />
            {micOn ? (
              <Mic className={cn("w-3.5 h-3.5", isSpeaking ? "text-emerald-400 animate-pulse" : "text-slate-300")} />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
            )}
          </>
        )}
      </div>

      {/* Speaking Indicator Badge (top-right) */}
      {isSpeaking && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>SPEAKING</span>
        </div>
      )}
    </div>
  );
}
