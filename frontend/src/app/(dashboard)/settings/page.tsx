"use client";

import { useState } from "react";
import { Settings, Shield, HardDrive, Key, Save, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Studio Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure workspace defaults, WebRTC parameters, object storage, and security preferences.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: "general", label: "General & Branding" },
          { id: "video", label: "Video & Audio Quality" },
          { id: "storage", label: "Storage & Retention" },
          { id: "api", label: "API & Webhooks" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "general" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Workspace Information</h3>
            <Input label="Workspace Name" defaultValue="Main Production Studio" />
            <Input label="Custom Subdomain / Vanity URL" defaultValue="studio.mycompany.com" />
            <Input label="Support Contact Email" defaultValue="broadcast@mycompany.com" />
          </div>
        </Card>
      )}

      {activeTab === "video" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Broadcast Encoding Defaults</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Default Resolution</label>
                <select className="w-full h-10 px-3 text-sm rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500">
                  <option>1080p (Full HD - 1920x1080)</option>
                  <option>720p (HD - 1280x720)</option>
                  <option>4K (UHD - 3840x2160)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Target Framerate</label>
                <select className="w-full h-10 px-3 text-sm rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500">
                  <option>60 FPS (Smooth Motion)</option>
                  <option>30 FPS (Standard Broadcast)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/5 space-y-3">
              <h4 className="text-xs font-semibold text-white">Audio Processing Engine</h4>
              <div className="space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500 focus:ring-0" />
                  Enable Browser Acoustic Echo Cancellation (AEC)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500 focus:ring-0" />
                  AI-Powered Background Noise Suppression (RNNoise)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500 focus:ring-0" />
                  Automatic Audio Gain Control (AGC)
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "storage" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">MinIO / S3 Storage Quota</h3>
            <div className="p-4 rounded-xl bg-surface border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Storage Used</span>
                <span className="text-white font-mono font-bold">45.2 GB / 250 GB (18%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "18%" }} />
              </div>
            </div>
            <Input label="Recording Retention (Days, 0 = Keep forever)" defaultValue="0" />
          </div>
        </Card>
      )}

      {activeTab === "api" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">API Keys & LiveKit Webhooks</h3>
            <Input label="Workspace API Key" defaultValue="ls_live_948fbc2839485b01823a" isPassword />
            <Input label="LiveKit Egress Webhook URL" defaultValue="https://studio.example.com/api/livekit/webhook" />
          </div>
        </Card>
      )}
    </div>
  );
}
