"use client";

import { useEffect, useRef, useState } from "react";
import { stageBroadcaster } from "@/lib/stageBroadcaster";
import {
  Tv,
  X,
  Maximize2,
  Minimize2,
  Radio,
  Activity,
  Volume2,
  AlertTriangle,
  Loader2,
  Wifi,
} from "lucide-react";

interface StreamMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  broadcastId?: string;
}

export function StreamMonitor({
  isOpen,
  onClose,
  isLive,
  broadcastId,
}: StreamMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [fps, setFps] = useState(30);
  const [bitrate, setBitrate] = useState("3.0 Mbps");
  const [streamTime, setStreamTime] = useState("00:00:00");
  const [chunksSent, setChunksSent] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0.65);
  const [isConnectedToRtmp, setIsConnectedToRtmp] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>("IDLE");
  const [lastError, setLastError] = useState<string | null>(null);

  const animRef = useRef<number | null>(null);

  // Poll backend RTMP streamer status to know when FFmpeg is actually connected to YouTube
  useEffect(() => {
    if (!isOpen || !isLive || !broadcastId) {
      if (!isLive) {
        setIsConnectedToRtmp(false);
        setBackendStatus("IDLE");
        setLastError(null);
        setChunksSent(0);
        setBytesSent(0);
      }
      return;
    }

    let isSubscribed = true;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/broadcasts/${broadcastId}/stream/status`);
        if (!res.ok) return;
        const json = await res.json();
        if (!isSubscribed || !json.success || !json.data) return;

        const data = json.data;
        setIsConnectedToRtmp(Boolean(data.isConnectedToRtmp));
        setBackendStatus(data.status || "LIVE");

        if (data.currentFps && data.currentFps > 0) {
          setFps(Math.round(data.currentFps));
        }
        if (data.currentBitrate) {
          setBitrate(data.currentBitrate);
        }
        if (data.streamTime) {
          setStreamTime(data.streamTime);
        }
        if (typeof data.chunksReceived === "number") {
          setChunksSent(data.chunksReceived);
        }
        if (typeof data.bytesReceived === "number") {
          setBytesSent(data.bytesReceived);
        }
        if (data.lastError) {
          setLastError(data.lastError);
        }
      } catch (err) {
        console.warn("[StreamMonitor] Status poll warning:", err);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 1200ms
    const interval = setInterval(checkStatus, 1200);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isOpen, isLive, broadcastId]);

  // Mirror the broadcaster canvas onto the monitor canvas only when ready
  useEffect(() => {
    if (!isOpen) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const loop = () => {
      // Only draw video onto canvas if NOT live (preview mode) OR if linked to YouTube
      const shouldRenderVideo = !isLive || isConnectedToRtmp;

      if (shouldRenderVideo) {
        const srcCanvas = stageBroadcaster.getCanvas();
        const targetCanvas = canvasRef.current;

        if (srcCanvas && targetCanvas) {
          const ctx = targetCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(srcCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
          }
        }
      }

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        if (!isLive) {
          setFps(Math.min(30, Math.round((frameCount * 1000) / (now - lastTime))));
          setAudioLevel(0.4 + Math.random() * 0.3);
        } else if (isConnectedToRtmp) {
          setAudioLevel(0.4 + Math.random() * 0.45);
        } else {
          setAudioLevel(0);
        }
        frameCount = 0;
        lastTime = now;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [isOpen, isLive, isConnectedToRtmp]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-200 shadow-2xl rounded-xl border border-indigo-500/30 backdrop-blur-xl bg-[#0d0d16]/95 overflow-hidden ${
        isMinimized
          ? "bottom-20 right-6 w-72"
          : "bottom-20 right-6 w-[380px] sm:w-[460px]"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#141424] to-[#1a1a2e] border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              !isLive
                ? "bg-emerald-500"
                : isConnectedToRtmp
                ? "bg-red-500 animate-ping"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <Tv className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            {!isLive
              ? "Stream Preview Monitor"
              : isConnectedToRtmp
              ? "Program Output (Live on YouTube)"
              : "Connecting to YouTube..."}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition"
            title="Close Monitor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monitor Video Feed */}
      {!isMinimized && (
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden border-b border-white/5">
          {/* Canvas always mounted to keep context alive */}
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className={`w-full h-full object-contain ${
              isLive && !isConnectedToRtmp ? "opacity-0" : "opacity-100"
            } transition-opacity duration-300`}
          />

          {/* CONNECTING STATE OVERLAY: Shown until YouTube RTMP confirms link & receives data */}
          {isLive && !isConnectedToRtmp && (
            <div className="absolute inset-0 bg-[#080812]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 animate-ping absolute" />
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center relative shadow-lg shadow-amber-500/10">
                  <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
              </div>

              <div className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                <span>Connecting to YouTube</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 mt-1 max-w-[290px] leading-relaxed">
                Handshaking with YouTube RTMP encoder. Live video feed will start here as soon as YouTube links.
              </p>

              {/* Real-time Telemetry */}
              <div className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3 text-[10px] font-mono text-zinc-300">
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  Chunks: <strong className="text-white">{chunksSent}</strong>
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  Sent: <strong className="text-white">{(bytesSent / 1024).toFixed(0)} KB</strong>
                </span>
              </div>

              {lastError && (
                <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-300 max-w-[320px] text-left flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{lastError}</span>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE LIVE OVERLAY: Shown once YouTube RTMP link is verified */}
          {isLive && isConnectedToRtmp && (
            <>
              {/* Program On Air Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur border border-red-500/50 text-[10px] font-bold text-red-400 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                ● ON AIR (Live on YouTube)
              </div>

              {/* Stream Quality Tag */}
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur border border-white/10 text-[10px] font-mono text-zinc-300">
                720p • {fps} FPS • {bitrate}
              </div>

              {/* Audio Activity Bar */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-2 py-1 rounded bg-black/85 backdrop-blur border border-white/10">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(100, Math.round(audioLevel * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-emerald-400">AAC 128k</span>
              </div>
            </>
          )}

          {/* STANDBY PREVIEW OVERLAY: Shown when not live */}
          {!isLive && (
            <>
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur border border-white/10 text-[10px] font-semibold text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                PREVIEW (OFF AIR)
              </div>
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] font-mono text-zinc-300">
                720p • 30 FPS
              </div>
            </>
          )}
        </div>
      )}

      {/* Status Footer */}
      <div className="px-3 py-2 text-[11px] text-zinc-400 flex items-center justify-between bg-[#0e0e18]">
        <div className="flex items-center gap-1.5 truncate">
          <Radio
            className={`w-3.5 h-3.5 shrink-0 ${
              !isLive
                ? "text-zinc-500"
                : isConnectedToRtmp
                ? "text-red-400"
                : "text-amber-400 animate-pulse"
            }`}
          />
          <span className="truncate">
            {!isLive ? (
              <span>Standby (Not Live) • Local Preview</span>
            ) : isConnectedToRtmp ? (
              <span className="text-emerald-400 font-medium">
                Transmitting Live to YouTube • {streamTime}
              </span>
            ) : (
              <span className="text-amber-400 font-medium animate-pulse">
                Handshaking with YouTube RTMP Server...
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono shrink-0 ml-2">
          {isConnectedToRtmp ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>{fps} FPS • {bitrate}</span>
            </>
          ) : isLive ? (
            <>
              <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              <span>Linking...</span>
            </>
          ) : (
            <>
              <Activity className="w-3 h-3 text-indigo-400" />
              <span>Ready</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
