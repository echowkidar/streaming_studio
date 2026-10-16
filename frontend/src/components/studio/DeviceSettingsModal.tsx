"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Video,
  Volume2,
  Sparkles,
  Sliders,
  Check,
  Settings2,
  Upload,
  X,
  Play,
  Square,
  Headphones,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AudioMeter } from "./AudioMeter";
import { useStudioStore } from "@/stores/studio.store";
import { ChromaKeyCanvas } from "./ChromaKeyCanvas";
import { cn } from "@/lib/utils";
import { VIRTUAL_BACKGROUND_PRESETS } from "@/lib/virtualBackgrounds";
import {
  loadPreferredDevices,
  savePreferredDevices,
  resolveLockedHardwareDevice,
} from "@/hooks/useLiveKit";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudioDevice?: (deviceId: string) => Promise<void> | void;
  onSelectVideoDevice?: (deviceId: string) => Promise<void> | void;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSelectAudioDevice,
  onSelectVideoDevice,
}) => {
  const [activeTab, setActiveTab] = useState<"devices" | "green-screen">("devices");
  const [resolution, setResolution] = useState<"1080p" | "720p" | "480p">("1080p");

  // Real MediaDeviceInfo lists with hardware deviceId + label
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);

  const [selectedCamId, setSelectedCamId] = useState<string>("");
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("");

  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);

  // Dedicated real-time microphone test stream for the selected mic
  const [micTestStream, setMicTestStream] = useState<MediaStream | null>(null);
  const [micTestError, setMicTestError] = useState<string | null>(null);

  // Mic Check: Record 4s & Play Back + Live Loopback Monitor
  const [isRecordingTest, setIsRecordingTest] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testCountdown, setTestCountdown] = useState(0);
  const [isLiveMonitoringMic, setIsLiveMonitoringMic] = useState(false);
  const testRecorderRef = useRef<MediaRecorder | null>(null);
  const testAudioElRef = useRef<HTMLAudioElement | null>(null);
  const monitorAudioElRef = useRef<HTMLAudioElement | null>(null);

  const { chromaKeyConfig, setChromaKeyConfig, activeBackgroundUrl } = useStudioStore();

  // Green Screen preview camera
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const virtualBgFileInputRef = useRef<HTMLInputElement>(null);

  const [customVirtualBgs, setCustomVirtualBgs] = useState<{ id: string; name: string; url: string }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("livestudio_custom_virtual_bgs");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Load and enumerate real hardware devices (filtering out Windows 'default'/'communications' duplicates when physical device exists)
  const refreshDeviceList = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const prefs = loadPreferredDevices();

      setEchoCancellation(prefs.echoCancellation);
      setNoiseSuppression(prefs.noiseSuppression);
      setAutoGainControl(prefs.autoGainControl);

      const rawCams = all.filter((d) => d.kind === "videoinput" && d.deviceId);
      const rawMics = all.filter((d) => d.kind === "audioinput" && d.deviceId);
      const rawSpks = all.filter((d) => d.kind === "audiooutput" && d.deviceId);

      // Prefer physical microphone entries over virtual 'default'/'communications' aliases so Bluetooth never hijacks 'default'
      const physicalMics = rawMics.filter(
        (d) => d.deviceId !== "default" && d.deviceId !== "communications"
      );
      const finalMics = physicalMics.length > 0 ? physicalMics : rawMics;

      const physicalSpks = rawSpks.filter(
        (d) => d.deviceId !== "default" && d.deviceId !== "communications"
      );
      const finalSpks = physicalSpks.length > 0 ? physicalSpks : rawSpks;

      setCameraDevices(rawCams);
      setMicDevices(finalMics);
      setSpeakerDevices(finalSpks);

      // Resolve locked Mic
      const lockedMic = await resolveLockedHardwareDevice(
        "audioinput",
        prefs.audioDeviceId,
        prefs.audioLabel
      );
      if (lockedMic) {
        setSelectedMicId(lockedMic.deviceId);
      } else if (finalMics[0]) {
        setSelectedMicId(finalMics[0].deviceId);
      }

      // Resolve locked Camera
      const lockedCam = await resolveLockedHardwareDevice(
        "videoinput",
        prefs.videoDeviceId,
        prefs.videoLabel
      );
      if (lockedCam) {
        setSelectedCamId(lockedCam.deviceId);
      } else if (rawCams[0]) {
        setSelectedCamId(rawCams[0].deviceId);
      }

      // Resolve locked Speaker
      const lockedSpk = await resolveLockedHardwareDevice(
        "audiooutput",
        prefs.speakerDeviceId,
        prefs.speakerLabel
      );
      if (lockedSpk) {
        setSelectedSpeakerId(lockedSpk.deviceId);
      } else if (finalSpks[0]) {
        setSelectedSpeakerId(finalSpks[0].deviceId);
      }
    } catch (e) {
      console.warn("Failed to enumerate devices:", e);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshDeviceList();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDeviceList);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDeviceList);
    };
  }, [isOpen, refreshDeviceList]);

  // Open a real MediaStream for the currently selected Microphone so AudioMeter & Mic Test work 100% accurately
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    if (isOpen && activeTab === "devices" && selectedMicId) {
      setMicTestError(null);
      navigator.mediaDevices
        ?.getUserMedia({
          audio: {
            deviceId: { exact: selectedMicId },
            echoCancellation,
            noiseSuppression,
            autoGainControl,
          },
          video: false,
        })
        .then((stream) => {
          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          activeStream = stream;
          setMicTestStream(stream);
        })
        .catch(() => {
          // Fallback if exact device constraint fails
          navigator.mediaDevices
            ?.getUserMedia({ audio: true, video: false })
            .then((stream) => {
              if (isCancelled) {
                stream.getTracks().forEach((t) => t.stop());
                return;
              }
              activeStream = stream;
              setMicTestStream(stream);
            })
            .catch(() => {
              setMicTestError("Microphone unavailable or permission denied.");
              setMicTestStream(null);
            });
        });
    } else {
      setMicTestStream(null);
    }

    return () => {
      isCancelled = true;
      setIsLiveMonitoringMic(false);
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, activeTab, selectedMicId, echoCancellation, noiseSuppression, autoGainControl]);

  // Live "Hear Myself" Loopback Monitor
  useEffect(() => {
    if (!isLiveMonitoringMic || !micTestStream) {
      if (monitorAudioElRef.current) {
        monitorAudioElRef.current.pause();
        monitorAudioElRef.current.srcObject = null;
      }
      return;
    }

    const audio = new Audio();
    audio.srcObject = micTestStream;
    audio.autoplay = true;
    if (selectedSpeakerId && typeof (audio as any).setSinkId === "function") {
      (audio as any).setSinkId(selectedSpeakerId).catch(() => {});
    }
    audio.play().catch(() => {});
    monitorAudioElRef.current = audio;

    return () => {
      audio.pause();
      audio.srcObject = null;
    };
  }, [isLiveMonitoringMic, micTestStream, selectedSpeakerId]);

  // Handle Mic Selection Change (Immediately locks hardware ID & switches LiveKit room mic)
  const handleMicChange = async (newMicId: string) => {
    setSelectedMicId(newMicId);
    const dev = micDevices.find((d) => d.deviceId === newMicId);
    savePreferredDevices({
      audioDeviceId: newMicId,
      audioLabel: dev?.label || "",
    });
    if (onSelectAudioDevice) {
      await onSelectAudioDevice(newMicId);
    }
  };

  // Handle Camera Selection Change
  const handleCameraChange = async (newCamId: string) => {
    setSelectedCamId(newCamId);
    const dev = cameraDevices.find((d) => d.deviceId === newCamId);
    savePreferredDevices({
      videoDeviceId: newCamId,
      videoLabel: dev?.label || "",
    });
    if (onSelectVideoDevice) {
      await onSelectVideoDevice(newCamId);
    }
  };

  // Handle Speaker Output Selection Change (Applies setSinkId to all page <audio>/<video> elements)
  const handleSpeakerChange = async (newSpeakerId: string) => {
    setSelectedSpeakerId(newSpeakerId);
    const dev = speakerDevices.find((d) => d.deviceId === newSpeakerId);
    savePreferredDevices({
      speakerDeviceId: newSpeakerId,
      speakerLabel: dev?.label || "",
    });
    if (typeof document !== "undefined") {
      const mediaEls = document.querySelectorAll("audio, video");
      mediaEls.forEach((el: any) => {
        if (typeof el.setSinkId === "function") {
          el.setSinkId(newSpeakerId).catch(() => {});
        }
      });
    }
  };

  // 4-Second Record & Playback Mic Check
  const handleRunMicRecordTest = () => {
    if (!micTestStream) return;
    if (isRecordingTest) {
      testRecorderRef.current?.stop();
      setIsRecordingTest(false);
      return;
    }

    try {
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(micTestStream);
      testRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        setIsRecordingTest(false);
        setTestCountdown(0);
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        testAudioElRef.current = audio;
        if (selectedSpeakerId && typeof (audio as any).setSinkId === "function") {
          (audio as any).setSinkId(selectedSpeakerId).catch(() => {});
        }
        setIsPlayingTest(true);
        audio.onended = () => {
          setIsPlayingTest(false);
          URL.revokeObjectURL(url);
        };
        audio.play().catch(() => setIsPlayingTest(false));
      };

      setIsRecordingTest(true);
      setTestCountdown(4);
      recorder.start();

      let rem = 4;
      const timer = setInterval(() => {
        rem -= 1;
        setTestCountdown(rem);
        if (rem <= 0) {
          clearInterval(timer);
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }
      }, 1000);
    } catch (err) {
      console.warn("Mic test recording error:", err);
      setIsRecordingTest(false);
    }
  };

  // Speaker Test Chime
  const handlePlaySpeakerTestTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.18); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.36); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    } catch {}
  };

  // Green Screen preview camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && activeTab === "green-screen") {
      navigator.mediaDevices
        ?.getUserMedia({
          video: selectedCamId ? { deviceId: { exact: selectedCamId } } : true,
          audio: false,
        })
        .then((s) => {
          stream = s;
          setPreviewStream(s);
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = s;
          }
        })
        .catch(() => {});
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, activeTab, selectedCamId]);

  const handleVirtualBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newItem = {
          id: `virtual-bg-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, "").slice(0, 16),
          url: dataUrl,
        };
        const updated = [newItem, ...customVirtualBgs.filter((b) => b.name !== newItem.name)];
        setCustomVirtualBgs(updated);
        try {
          localStorage.setItem("livestudio_custom_virtual_bgs", JSON.stringify(updated.slice(0, 8)));
        } catch {}
        setChromaKeyConfig({ backdropType: "image", backdropUrl: dataUrl, enabled: true });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteCustomVirtualBg = (e: React.MouseEvent, id: string, url: string) => {
    e.stopPropagation();
    const updated = customVirtualBgs.filter((b) => b.id !== id);
    setCustomVirtualBgs(updated);
    try {
      localStorage.setItem("livestudio_custom_virtual_bgs", JSON.stringify(updated));
    } catch {}
    if (chromaKeyConfig?.backdropUrl === url) {
      setChromaKeyConfig({ backdropUrl: VIRTUAL_BACKGROUND_PRESETS[0].url });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Studio Settings & Hardware Engine"
      description="Configure and lock your microphone, camera, speaker output, and Green Screen."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
          <div className="flex gap-2">
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

          <button
            type="button"
            onClick={refreshDeviceList}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
            title="Refresh connected USB / Bluetooth devices"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>Rescan Devices</span>
          </button>
        </div>

        {/* ─── TAB 1: Devices & Audio ──────────────────────────── */}
        {activeTab === "devices" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Camera Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-400" />
                    Camera Device
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Locked ✓</span>
                </label>
                <select
                  value={selectedCamId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  {cameraDevices.length > 0 ? (
                    cameraDevices.map((c, i) => (
                      <option key={c.deviceId || i} value={c.deviceId}>
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">No Camera Detected (Audio-Only Mode)</option>
                  )}
                </select>
              </div>

              {/* Microphone Selector (Hardware-Locked) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    Microphone Input (Hardware Locked)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">48 kHz • Locked ✓</span>
                </label>
                <select
                  value={selectedMicId}
                  onChange={(e) => handleMicChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface border border-emerald-500/40 text-white focus:outline-none focus:border-emerald-400"
                >
                  {micDevices.map((m, i) => (
                    <option key={m.deviceId || i} value={m.deviceId}>
                      {m.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Microphone Level Test + Record/Play Check & Loopback Monitor */}
            <div className="p-3.5 rounded-xl bg-surface border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-200 font-semibold">Live Microphone Level & Check</span>
                  {micTestError ? (
                    <span className="text-[10px] text-rose-400 font-medium">({micTestError})</span>
                  ) : (
                    <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Real-Time Input
                    </span>
                  )}
                </div>

                {/* Mic Check Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRunMicRecordTest}
                    disabled={!micTestStream || isPlayingTest}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer",
                      isRecordingTest
                        ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                        : isPlayingTest
                        ? "bg-amber-500/20 border-amber-400 text-amber-300"
                        : "bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow"
                    )}
                    title="Record 4 seconds of your voice and play it back to verify mic quality"
                  >
                    {isRecordingTest ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Recording... ({testCountdown}s)</span>
                      </>
                    ) : isPlayingTest ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                        <span>Playing Back Voice...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Test Mic (4s Record & Play)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLiveMonitoringMic(!isLiveMonitoringMic)}
                    disabled={!micTestStream}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer",
                      isLiveMonitoringMic
                        ? "bg-emerald-600 border-emerald-400 text-white shadow"
                        : "bg-white/5 hover:bg-white/10 border-white/15 text-slate-300 hover:text-white"
                    )}
                    title="Listen to your own microphone live in your headphones"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>{isLiveMonitoringMic ? "Stop Listening" : "Hear Myself"}</span>
                  </button>
                </div>
              </div>

              {/* Real-Time VU Meter */}
              <AudioMeter stream={micTestStream} className="w-full" />

              <p className="text-[10px] text-slate-400 leading-relaxed">
                💡 <strong>Hardware Lock Active:</strong> Your selected microphone is locked to its physical hardware ID. Connecting a Bluetooth speaker or refreshing the browser will <strong>not</strong> switch or disable your PC microphone.
              </p>
            </div>

            {/* Speaker Selector + Test Tone Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  Audio Output / Monitor Headphones
                </label>
                <button
                  type="button"
                  onClick={handlePlaySpeakerTestTone}
                  className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Play Test Sound</span>
                </button>
              </div>
              <select
                value={selectedSpeakerId}
                onChange={(e) => handleSpeakerChange(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              >
                {speakerDevices.map((s, i) => (
                  <option key={s.deviceId || i} value={s.deviceId}>
                    {s.label || `Speaker ${i + 1}`}
                  </option>
                ))}
              </select>
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
                  { id: "1080p", title: "1080p FHD", desc: "4500 kbps • 60 FPS" },
                  { id: "720p", title: "720p HD", desc: "2500 kbps • 30 FPS" },
                  { id: "480p", title: "480p SD", desc: "1000 kbps • 30 FPS" },
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

            {/* Audio Processing Toggles */}
            <div className="p-3 rounded-xl bg-surface/60 border border-white/5 grid grid-cols-2 gap-3 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={echoCancellation}
                  onChange={(e) => {
                    setEchoCancellation(e.target.checked);
                    savePreferredDevices({ echoCancellation: e.target.checked });
                  }}
                  className="rounded border-white/10 bg-surface text-indigo-500"
                />
                <span>Studio Echo Cancellation</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={(e) => {
                    setNoiseSuppression(e.target.checked);
                    savePreferredDevices({ noiseSuppression: e.target.checked });
                  }}
                  className="rounded border-white/10 bg-surface text-indigo-500"
                />
                <span>AI Noise Suppression (RNNoise)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={autoGainControl}
                  onChange={(e) => {
                    setAutoGainControl(e.target.checked);
                    savePreferredDevices({ autoGainControl: e.target.checked });
                  }}
                  className="rounded border-white/10 bg-surface text-indigo-500"
                />
                <span>Auto Gain Control (AGC)</span>
              </label>
            </div>
          </div>
        )}

        {/* ─── TAB 2: Green Screen (Chroma Key) ────────────────── */}
        {activeTab === "green-screen" && (
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/90 border border-white/15 relative flex items-center justify-center shadow-2xl">
              {chromaKeyConfig?.enabled && (
                <>
                  {chromaKeyConfig.backdropType === "image" && (
                    <img
                      src={chromaKeyConfig.backdropUrl || VIRTUAL_BACKGROUND_PRESETS[0].url}
                      alt="Virtual Backdrop"
                      className="absolute inset-0 w-full h-full object-cover z-0"
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
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-slate-300 font-semibold block text-xs">Keyed Backdrop Layer</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "image" as const, label: "Virtual Backdrop", desc: "Selected Office/Studio" },
                      { id: "stage" as const, label: "Stage Canvas", desc: "100% Transparent" },
                      { id: "blur" as const, label: "Studio Blur", desc: "Blurred Background" },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setChromaKeyConfig({ backdropType: b.id })}
                        className={cn(
                          "p-2 rounded-xl border text-left transition-all",
                          (chromaKeyConfig?.backdropType || "image") === b.id
                            ? "bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-md"
                            : "bg-surface border-white/5 text-slate-400 hover:border-white/10"
                        )}
                      >
                        <div className="font-semibold text-xs text-white">{b.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{b.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Virtual Background Gallery when "image" is selected */}
                  {(chromaKeyConfig?.backdropType === "image" || !chromaKeyConfig?.backdropType) && (
                    <div className="space-y-2.5 pt-2 border-t border-white/5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          Virtual Background Gallery
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {VIRTUAL_BACKGROUND_PRESETS.length + customVirtualBgs.length} Backdrops
                        </span>
                      </div>

                      {/* Hidden file input */}
                      <input
                        ref={virtualBgFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleVirtualBgUpload}
                      />

                      {/* Upload Button */}
                      <button
                        onClick={() => virtualBgFileInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium cursor-pointer shadow-sm"
                      >
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span>Upload Custom Background Photo from Device</span>
                      </button>

                      {/* Custom Uploads */}
                      {customVirtualBgs.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Your Uploaded Photos</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {customVirtualBgs.map((bg) => {
                              const isSelected = chromaKeyConfig?.backdropUrl === bg.url;
                              return (
                                <div
                                  key={bg.id}
                                  onClick={() => setChromaKeyConfig({ backdropType: "image", backdropUrl: bg.url, enabled: true })}
                                  className={cn(
                                    "h-16 rounded-xl border relative overflow-hidden transition-all text-left p-1.5 flex flex-col justify-end group cursor-pointer",
                                    isSelected
                                      ? "border-emerald-400 ring-2 ring-emerald-500/40 shadow-md"
                                      : "border-white/10 hover:border-white/30"
                                  )}
                                  style={{
                                    backgroundImage: `url(${bg.url})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }}
                                >
                                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                                  <span className="relative z-10 text-[10px] font-bold text-white drop-shadow truncate">
                                    {bg.name}
                                  </span>
                                  {isSelected && (
                                    <span className="absolute top-1 left-1 z-10 p-0.5 rounded-full bg-emerald-500 text-white">
                                      <Check className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteCustomVirtualBg(e, bg.id, bg.url)}
                                    title="Delete photo"
                                    className="absolute top-1 right-1 z-20 p-1 rounded bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Presets Grid */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">Broadcast Studios & Modern Offices</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {VIRTUAL_BACKGROUND_PRESETS.map((bg) => {
                            const isSelected = (chromaKeyConfig?.backdropUrl || VIRTUAL_BACKGROUND_PRESETS[0].url) === bg.url;
                            return (
                              <button
                                key={bg.id}
                                onClick={() => setChromaKeyConfig({ backdropType: "image", backdropUrl: bg.url, enabled: true })}
                                className={cn(
                                  "h-16 rounded-xl border relative overflow-hidden transition-all text-left p-1.5 flex flex-col justify-end group cursor-pointer",
                                  isSelected
                                    ? "border-emerald-400 ring-2 ring-emerald-500/40 shadow-md"
                                    : "border-white/10 hover:border-white/30"
                                )}
                                style={{
                                  backgroundImage: `url(${bg.thumb})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                              >
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                                <span className="relative z-10 text-[10px] font-bold text-white drop-shadow truncate">
                                  {bg.name}
                                </span>
                                <span className="absolute top-1 left-1 text-[8px] uppercase font-bold px-1 rounded bg-black/60 text-slate-300 backdrop-blur-sm">
                                  {bg.category}
                                </span>
                                {isSelected && (
                                  <span className="absolute top-1 right-1 z-10 p-0.5 rounded-full bg-emerald-500 text-white">
                                    <Check className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
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
            Save & Lock Hardware Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};
