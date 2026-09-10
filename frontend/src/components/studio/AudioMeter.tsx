"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface AudioMeterProps {
  stream?: MediaStream | null;
  className?: string;
}

export const AudioMeter: React.FC<AudioMeterProps> = ({ stream, className = "" }) => {
  const [volume, setVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      // If no live stream passed, run gentle ambient audio activity simulation for demo
      const interval = setInterval(() => {
        setVolume(Math.floor(Math.random() * 45) + 15);
      }, 150);
      return () => clearInterval(interval);
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setVolume(normalized);
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (e) {
      console.warn("Web Audio API not supported or mic stream error:", e);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [stream]);

  // Color calculate: 0-60 green, 60-80 amber, 80-100 red (clipping)
  const getColor = (pct: number) => {
    if (pct < 60) return "bg-emerald-500";
    if (pct < 80) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden flex gap-0.5 p-0.5">
        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((threshold, idx) => (
          <div
            key={idx}
            className={`h-full flex-1 rounded-xs transition-colors duration-75 ${
              volume >= threshold ? getColor(threshold) : "bg-white/5"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
        {volume}%
      </span>
    </div>
  );
};
