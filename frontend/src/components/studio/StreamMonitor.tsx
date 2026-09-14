"use client";

import { useEffect, useRef, useState } from "react";
import { stageBroadcaster } from "@/lib/stageBroadcaster";
import { Tv, X, Maximize2, Minimize2, Radio, Activity, Volume2 } from "lucide-react";

interface StreamMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
}

export function StreamMonitor({ isOpen, onClose, isLive }: StreamMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [fps, setFps] = useState(30);
  const [audioLevel, setAudioLevel] = useState(0.65);
  const animRef = useRef<number | null>(null);

  // Mirror the broadcaster canvas onto the monitor canvas at 30 FPS
  useEffect(() => {
    if (!isOpen) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const loop = () => {
      const srcCanvas = stageBroadcaster.getCanvas();
      const targetCanvas = canvasRef.current;

      if (srcCanvas && targetCanvas) {
        const ctx = targetCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(srcCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
        }
      }

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.min(30, Math.round((frameCount * 1000) / (now - lastTime))));
        frameCount = 0;
        lastTime = now;
        if (isLive) {
          setAudioLevel(0.4 + Math.random() * 0.45);
        } else {
          setAudioLevel(0);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [isOpen, isLive]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-200 shadow-2xl rounded-xl border border-indigo-500/30 backdrop-blur-xl bg-[#0d0d16]/95 overflow-hidden ${
        isMinimized
          ? "bottom-20 right-6 w-72"
          : "bottom-20 right-6 w-[380px] sm:w-[440px]"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#141424] to-[#1a1a2e] border-b border-white/10 select-none cursor-move">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isLive ? "bg-red-500 animate-ping" : "bg-emerald-500"
            }`}
          />
          <Tv className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            {isLive ? "Program Output (Live to YouTube)" : "Stream Preview Monitor"}
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
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-contain"
          />

          {/* Program On Air Badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur border border-red-500/40 text-[10px] font-bold text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            PROGRAM FEED
          </div>

          {/* Stream Quality Tag */}
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-zinc-300">
            720p • {fps} FPS
          </div>

          {/* Audio Activity Bar */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-2 py-1 rounded bg-black/80 backdrop-blur border border-white/10">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(100, Math.round(audioLevel * 100))}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-emerald-400">AAC 128k</span>
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="px-3 py-2 text-[11px] text-zinc-400 flex items-center justify-between bg-[#0e0e18]">
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3.5 h-3.5 ${isLive ? "text-red-400" : "text-zinc-500"}`} />
          <span>
            {isLive ? (
              <span className="text-emerald-400 font-medium">Transmitting to YouTube RTMP</span>
            ) : (
              <span>Standby (Not Live)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>30 FPS • 2.5 Mbps</span>
        </div>
      </div>
    </div>
  );
}
