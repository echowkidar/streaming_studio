"use client";

import React, { useState, useEffect, useRef } from "react";

interface AudioMeterProps {
  stream?: MediaStream | null;
  className?: string;
}

export const AudioMeter: React.FC<AudioMeterProps> = ({ stream, className = "" }) => {
  const [volume, setVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Agar koi active audio stream nahi hai ya track ended/muted hai, toh meter strictly 0% rahega (NO fake random animation!)
    const audioTracks = stream?.getAudioTracks() || [];
    const activeTrack = audioTracks.find((t) => t.readyState === "live" && t.enabled);

    if (!stream || !activeTrack) {
      setVolume(0);
      return;
    }

    let isCancelled = false;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const timeData = new Uint8Array(analyser.fftSize);

      const updateMeter = () => {
        if (isCancelled) return;

        const track = stream.getAudioTracks()[0];
        if (!track || !track.enabled || track.readyState !== "live") {
          setVolume(0);
          animationFrameRef.current = requestAnimationFrame(updateMeter);
          return;
        }

        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }

        analyser.getByteTimeDomainData(timeData);
        let sumSquares = 0;
        let peak = 0;

        for (let i = 0; i < timeData.length; i++) {
          const normalizedSample = (timeData[i] - 128) / 128;
          const abs = Math.abs(normalizedSample);
          if (abs > peak) peak = abs;
          sumSquares += normalizedSample * normalizedSample;
        }

        const rms = Math.sqrt(sumSquares / timeData.length);
        // Combine RMS and Peak for natural broadcast VU meter response
        const rawPct = Math.min(100, Math.round((rms * 260 + peak * 65)));
        // Noise gate: ignore <= 3% background electrical hum so silence reads 0%
        const gatedPct = rawPct <= 3 ? 0 : rawPct;

        setVolume(gatedPct);
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (e) {
      console.warn("AudioMeter Web Audio error:", e);
      setVolume(0);
    }

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream]);

  const getColor = (pct: number) => {
    if (pct < 65) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    if (pct < 85) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
    return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2.5 rounded-full bg-black/60 border border-white/10 overflow-hidden flex gap-0.5 p-0.5">
        {[5, 12, 20, 30, 40, 50, 60, 70, 80, 90, 96].map((threshold, idx) => (
          <div
            key={idx}
            className={`h-full flex-1 rounded-xs transition-all duration-75 ${
              volume >= threshold ? getColor(threshold) : "bg-white/5"
            }`}
          />
        ))}
      </div>
      <span
        className={`text-[10px] font-mono font-bold w-9 text-right ${
          volume > 5 ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        {volume}%
      </span>
    </div>
  );
};
