"use client";

import React, { useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoTrackViewProps {
  track?: any; // LiveKit Track or LocalVideoTrack / RemoteVideoTrack
  mediaStream?: MediaStream | null;
  name: string;
  isSpeaking?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  isLocal?: boolean;
  role?: string;
  className?: string;
}

export function VideoTrackView({
  track,
  mediaStream,
  name,
  isSpeaking = false,
  micOn = true,
  camOn = true,
  isLocal = false,
  role,
  className,
}: VideoTrackViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (track && typeof track.attach === "function") {
      track.attach(videoEl);
      return () => {
        try {
          track.detach(videoEl);
        } catch {
          // ignore
        }
      };
    } else if (mediaStream) {
      videoEl.srcObject = mediaStream;
      return () => {
        videoEl.srcObject = null;
      };
    }
  }, [track, mediaStream]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const hasActiveVideo = camOn && (track || mediaStream);

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
          "w-full h-full object-cover transition-opacity duration-300",
          hasActiveVideo ? "opacity-100" : "opacity-0 absolute pointer-events-none",
          isLocal && "scale-x-[-1]" // Mirror local camera
        )}
      />

      {/* Camera Off / Fallback State */}
      {!hasActiveVideo && (
        <div className="flex flex-col items-center justify-center gap-3 p-4 z-10 animate-in fade-in duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-xl">
            {initials}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            <VideoOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Camera Off</span>
          </div>
        </div>
      )}

      {/* Participant Name & Mic Status Overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs">
        <span className="font-medium text-white truncate max-w-[140px] sm:max-w-[200px]">
          {name} {isLocal && "(You)"}
        </span>
        {role && (
          <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/20 px-1 rounded">
            {role}
          </span>
        )}
        <div className="w-px h-3 bg-white/20" />
        {micOn ? (
          <Mic className={cn("w-3.5 h-3.5", isSpeaking ? "text-emerald-400 animate-pulse" : "text-slate-300")} />
        ) : (
          <MicOff className="w-3.5 h-3.5 text-rose-400" />
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
