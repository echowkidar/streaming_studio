"use client";

import React, { useState } from "react";
import { Mic, Video, Volume2, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AudioMeter } from "./AudioMeter";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [camera, setCamera] = useState("FaceTime HD Camera / Integrated Webcam (1080p)");
  const [mic, setMic] = useState("Built-in Microphone (High Definition Audio)");
  const [speaker, setSpeaker] = useState("Built-in Speakers (Default Output)");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audio & Video Settings"
      description="Select and test your input hardware before going on air."
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Camera Selector */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            Camera Source
          </label>
          <select
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
          >
            <option>FaceTime HD Camera / Integrated Webcam (1080p)</option>
            <option>OBS Virtual Camera (60 FPS)</option>
            <option>External USB Capture Card (4K HDMI)</option>
          </select>
        </div>

        {/* Microphone Selector */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            Microphone Device
          </label>
          <select
            value={mic}
            onChange={(e) => setMic(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
          >
            <option>Built-in Microphone (High Definition Audio)</option>
            <option>Yeti USB Microphone (Cardioid Pattern)</option>
            <option>Shure MV7 Broadcast Microphone</option>
          </select>

          {/* Real Web Audio API VU Level Meter */}
          <div className="pt-2 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-16">Mic Meter:</span>
            <AudioMeter className="flex-1" />
          </div>

        </div>

        {/* Speaker Selector */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Audio Output / Headphones
          </label>
          <select
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
          >
            <option>Built-in Speakers (Default Output)</option>
            <option>External Headphones / AirPod Pro</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="p-3 rounded-xl bg-surface/50 border border-white/5 space-y-2 text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500" />
            Echo Cancellation
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500" />
            Noise Suppression
          </label>
        </div>

        <div className="flex justify-end pt-3 border-t border-white/5">
          <Button variant="primary" size="sm" onClick={onClose}>
            Apply Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};
