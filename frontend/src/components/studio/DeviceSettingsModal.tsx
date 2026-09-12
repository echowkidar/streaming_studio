"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Video, Volume2, ShieldCheck, Sparkles, Sliders, Check, Settings2, Image as ImageIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AudioMeter } from "./AudioMeter";
import { useStudioStore } from "@/stores/studio.store";
import { ChromaKeyCanvas } from "./ChromaKeyCanvas";
import { cn } from "@/lib/utils";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"devices" | "green-screen">("devices");

  const [camera, setCamera] = useState("FaceTime HD Camera / Integrated Webcam");
  const [mic, setMic] = useState("Default Microphone (Built-in High Definition Audio)");
  const [speaker, setSpeaker] = useState("Default Speaker (Audio Output)");
  const [resolution, setResolution] = useState<"1080p" | "720p" | "480p">("1080p");

  const [availableCameras, setAvailableCameras] = useState<string[]>([]);
  const [availableMics, setAvailableMics] = useState<string[]>([]);
  const [availableSpeakers, setAvailableSpeakers] = useState<string[]>([]);

  const { chromaKeyConfig, setChromaKeyConfig, activeBackgroundUrl } = useStudioStore();

  // Local camera stream for Green Screen preview inside modal
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

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

  // Request camera when Green Screen tab is open for live key test
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && activeTab === "green-screen") {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          setPreviewStream(s);
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn("Could not start preview camera in modal:", err);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, activeTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio Settings & Hardware Engine"
      description="Configure your audio/video devices, stream resolution, and StreamYard-grade Green Screen."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs (Devices vs Green Screen) */}
        <div className="flex border-b border-white/10 pb-2 gap-2">
          <button
            onClick={() => setActiveTab("devices")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all",
              activeTab === "devices"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Audio & Video Devices</span>
          </button>
          <button
            onClick={() => setActiveTab("green-screen")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all",
              activeTab === "green-screen"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Green Screen (Chroma Key)</span>
            {chromaKeyConfig?.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>
        </div>

        {/* ─── TAB 1: Devices & Audio ──────────────────────────── */}
        {activeTab === "devices" && (
          <div className="space-y-4">
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

            {/* Speaker Selector */}
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
          </div>
        )}

        {/* ─── TAB 2: Green Screen (Chroma Key) ────────────────── */}
        {activeTab === "green-screen" && (
          <div className="space-y-4">
            {/* Live Camera Preview Box with Chroma Key Output */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/90 border border-white/15 relative flex items-center justify-center shadow-2xl">
              {/* Virtual Backdrop Layer */}
              {chromaKeyConfig?.enabled && (
                <>
                  {chromaKeyConfig.backdropType === "image" && (
                    <img
                      src={chromaKeyConfig.backdropUrl || activeBackgroundUrl || "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80"}
                      alt="Virtual Backdrop"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {chromaKeyConfig.backdropType === "blur" && (
                    <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-2xl" />
                  )}
                  {chromaKeyConfig.backdropType === "stage" && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-80"
                      style={{ backgroundImage: activeBackgroundUrl ? `url(${activeBackgroundUrl})` : undefined }}
                    />
                  )}
                </>
              )}

              {/* Hidden Local Video */}
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover scale-x-[-1]",
                  chromaKeyConfig?.enabled ? "opacity-0 absolute w-1 h-1 pointer-events-none" : "opacity-100"
                )}
              />

              {/* WebGL Chroma Key Canvas */}
              {chromaKeyConfig?.enabled && (
                <ChromaKeyCanvas
                  videoElement={previewVideoRef.current}
                  keyColor={chromaKeyConfig.keyColor}
                  tolerance={chromaKeyConfig.tolerance}
                  smoothness={chromaKeyConfig.smoothness}
                  spill={chromaKeyConfig.spill}
                  mirror={true}
                  className="w-full h-full object-cover z-10 pointer-events-none"
                />
              )}

              {/* Status Pill */}
              <div className="absolute top-3 left-3 z-20">
                <Badge
                  variant={chromaKeyConfig?.enabled ? "success" : "neutral"}
                  size="sm"
                  className="bg-black/70 backdrop-blur-md"
                >
                  {chromaKeyConfig?.enabled ? "Chroma Key Active" : "Normal Video"}
                </Badge>
              </div>
            </div>

            {/* Main Toggle */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white text-xs block">Enable Green Screen / Chroma Key</span>
                <span className="text-[11px] text-slate-400">
                  Cuts out physical green or blue backdrop to show studio background underneath.
                </span>
              </div>
              <button
                onClick={() => setChromaKeyConfig({ enabled: !chromaKeyConfig?.enabled })}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1.5",
                  chromaKeyConfig?.enabled
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-lg"
                    : "bg-white/10 border-white/15 text-slate-400 hover:text-white"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", chromaKeyConfig?.enabled ? "bg-white animate-pulse" : "bg-slate-500")} />
                {chromaKeyConfig?.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            {/* Sliders & Color Selection */}
            {chromaKeyConfig?.enabled && (
              <div className="space-y-3 p-3 rounded-xl bg-surface border border-white/5 animate-in fade-in duration-200">
                {/* Backdrop Color */}
                <div className="space-y-1">
                  <span className="text-slate-300 font-semibold block">Chroma Key Color</span>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Green Screen", color: "#00b140", icon: "🟢" },
                      { label: "Blue Screen", color: "#0047bb", icon: "🔵" },
                    ].map((k) => (
                      <button
                        key={k.color}
                        onClick={() => setChromaKeyConfig({ keyColor: k.color })}
                        className={cn(
                          "flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all",
                          (chromaKeyConfig?.keyColor || "#00b140").toLowerCase() === k.color.toLowerCase()
                            ? "bg-indigo-600/30 border-indigo-400 text-white shadow-sm"
                            : "bg-surface border-white/10 text-slate-300 hover:border-white/20"
                        )}
                      >
                        <span>{k.icon}</span>
                        <span>{k.label}</span>
                      </button>
                    ))}
                    <div className="flex items-center gap-1 bg-surface border border-white/10 rounded-lg px-2 py-1">
                      <input
                        type="color"
                        value={chromaKeyConfig?.keyColor || "#00b140"}
                        onChange={(e) => setChromaKeyConfig({ keyColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        title="Pick Custom Key Color"
                      />
                      <span className="font-mono text-[10px] text-slate-400 uppercase">
                        {chromaKeyConfig?.keyColor || "#00b140"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Similarity (Tolerance) Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Similarity / Key Tolerance</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {Math.round((chromaKeyConfig?.tolerance ?? 0.38) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.02"
                    value={chromaKeyConfig?.tolerance ?? 0.38}
                    onChange={(e) => setChromaKeyConfig({ tolerance: Number(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">Higher values remove more green variations.</span>
                </div>

                {/* Smoothness Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Edge Smoothness / Feathering</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {Math.round((chromaKeyConfig?.smoothness ?? 0.12) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.4"
                    step="0.01"
                    value={chromaKeyConfig?.smoothness ?? 0.12}
                    onChange={(e) => setChromaKeyConfig({ smoothness: Number(e.target.value) })}
                    className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">Softens harsh edges around hair and clothing.</span>
                </div>

                {/* Spill Suppression */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Color Spill Suppression</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round((chromaKeyConfig?.spill ?? 0.35) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={chromaKeyConfig?.spill ?? 0.35}
                    onChange={(e) => setChromaKeyConfig({ spill: Number(e.target.value) })}
                    className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">Removes green light bounce on hair, ears, and shoulders.</span>
                </div>

                {/* Keyed Backdrop Layer */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <span className="text-slate-300 font-semibold block">Keyed Backdrop Layer</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "stage" as const, label: "Stage Canvas", desc: "Reveals Stage Underneath" },
                      { id: "blur" as const, label: "Studio Blur", desc: "Blurred Background" },
                      { id: "image" as const, label: "Virtual Backdrop", desc: "Selected Studio Image" },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setChromaKeyConfig({ backdropType: b.id })}
                        className={cn(
                          "p-2 rounded-xl border text-left transition-all",
                          (chromaKeyConfig?.backdropType || "stage") === b.id
                            ? "bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500"
                            : "bg-surface border-white/5 text-slate-400 hover:border-white/10"
                        )}
                      >
                        <div className="font-semibold text-xs text-white">{b.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{b.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-white/5 gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Save Hardware Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};
