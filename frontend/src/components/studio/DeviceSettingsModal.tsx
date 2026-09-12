"use client";

import React, { useState, useEffect } from "react";
import { Mic, Video, Volume2, ShieldCheck, Sparkles, Sliders, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AudioMeter } from "./AudioMeter";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [camera, setCamera] = useState("FaceTime HD Camera / Integrated Webcam");
  const [mic, setMic] = useState("Default Microphone (Built-in High Definition Audio)");
  const [speaker, setSpeaker] = useState("Default Speaker (Audio Output)");
  const [resolution, setResolution] = useState<"1080p" | "720p" | "480p">("1080p");
  const [virtualBackground, setVirtualBackground] = useState<"none" | "blur" | "heavy-blur">("none");

  const [availableCameras, setAvailableCameras] = useState<string[]>([]);
  const [availableMics, setAvailableMics] = useState<string[]>([]);
  const [availableSpeakers, setAvailableSpeakers] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const cams = devices.filter((d) => d.kind === "videoinput").map((d, i) => d.label || `Camera ${i + 1}`);
        const mics = devices.filter((d) => d.kind === "audioinput").map((d, i) => d.label || `Microphone ${i + 1}`);
        const spks = devices.filter((d) => d.kind === "audiooutput").map((d, i) => d.label || `Speaker ${i + 1}`);

        if (cams.length > 0) {
          setAvailableCameras(cams);
          setCamera(cams[0]);
        }
        if (mics.length > 0) {
          setAvailableMics(mics);
          setMic(mics[0]);
        }
        if (spks.length > 0) {
          setAvailableSpeakers(spks);
          setSpeaker(spks[0]);
        }
      }).catch(() => {
        // Fallback defaults if permission denied
      });
    }
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio Hardware & Audio/Video Engine"
      description="Configure your local input devices, stream resolution quality, and audio DSP processing."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Device Inputs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Camera Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                Camera Device
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
            </label>
            <select
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
            >
              {availableCameras.length > 0 ? (
                availableCameras.map((c, i) => <option key={i} value={c}>{c}</option>)
              ) : (
                <>
                  <option>Integrated HD Webcam (1080p)</option>
                  <option>OBS Virtual Camera (60 FPS)</option>
                  <option>CamLink 4K Capture Device</option>
                </>
              )}
            </select>
          </div>

          {/* Microphone Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Microphone Input
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">48 kHz</span>
            </label>
            <select
              value={mic}
              onChange={(e) => setMic(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
            >
              {availableMics.length > 0 ? (
                availableMics.map((m, i) => <option key={i} value={m}>{m}</option>)
              ) : (
                <>
                  <option>Default Microphone (High Definition Audio)</option>
                  <option>Yeti USB Stereo Microphone</option>
                  <option>Shure MV7 Broadcast Mic</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Live Audio Level VU Meter */}
        <div className="p-3 rounded-xl bg-surface border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Mic className="w-3 h-3 text-emerald-400" />
              Live Microphone Level Test
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Speak to test levels</span>
          </div>
          <AudioMeter className="w-full" />
        </div>

        {/* Stream Quality Resolution Switcher */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Studio Broadcast Quality
            </span>
            <Badge variant="purple" size="sm">H.264 / VP8</Badge>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "1080p", title: "1080p FHD", desc: "4500 kbps • 60 FPS", tag: "Recommended" },
              { id: "720p", title: "720p HD", desc: "2500 kbps • 30 FPS", tag: "Fast" },
              { id: "480p", title: "480p SD", desc: "1000 kbps • 30 FPS", tag: "Low Data" },
            ].map((res) => (
              <button
                key={res.id}
                type="button"
                onClick={() => setResolution(res.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  resolution === res.id
                    ? "bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500"
                    : "bg-surface border-white/5 text-slate-400 hover:border-white/10"
                }`}
              >
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>{res.title}</span>
                  {resolution === res.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{res.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Speaker Selector & Toggles */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Audio Output / Monitor Headphones
          </label>
          <select
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
          >
            {availableSpeakers.length > 0 ? (
              availableSpeakers.map((s, i) => <option key={i} value={s}>{s}</option>)
            ) : (
              <>
                <option>Built-in Speakers (Default Audio Output)</option>
                <option>External Headphones / AirPod Pro</option>
              </>
            )}
          </select>
        </div>

        {/* Audio Processing & AI Effects */}
        <div className="p-3 rounded-xl bg-surface/60 border border-white/5 grid grid-cols-2 gap-3 text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500" />
            <span>Studio Echo Cancellation</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500" />
            <span>AI Noise Suppression (RNNoise)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500" />
            <span>Auto Gain Control (AGC)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500" />
            <span>Stereo Audio Passthrough</span>
          </label>
        </div>

        <div className="flex justify-end pt-3 border-t border-white/5 gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Save Hardware Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};
