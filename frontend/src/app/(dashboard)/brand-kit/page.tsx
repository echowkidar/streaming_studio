"use client";

import { useState } from "react";
import { Palette, Upload, Image as ImageIcon, Type, Sparkles, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { useAuthStore } from "@/stores/auth.store";

export default function BrandKitPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("logos");
  const [activeColor, setActiveColor] = useState("#6366f1");

  const colors = [
    "#6366f1", // Indigo
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f43f5e", // Rose
    "#8b5cf6", // Purple
    "#f59e0b", // Amber
    "#ec4899", // Pink
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Brand Kit</h1>
          <p className="text-sm text-slate-400 mt-1">
            Maintain your visual identity across all broadcasts with custom logos, lower-thirds, video overlays, and color themes.
          </p>
        </div>
        <Button variant="primary">
          <Upload className="w-4 h-4 mr-2" />
          Upload Asset
        </Button>
      </div>

      {/* Brand Color Theme Palette */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Primary Brand Theme Color</h3>
            <p className="text-xs text-slate-400 mt-0.5">Applied to lower-third banners, active speaker halos, and stream accents.</p>
          </div>
          <div className="flex items-center gap-3">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                style={{ backgroundColor: c }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg"
              >
                {activeColor === c && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: "logos", label: "Watermark Logos", count: 3 },
          { id: "overlays", label: "Video Overlays", count: 2 },
          { id: "backgrounds", label: "Virtual Backgrounds", count: 4 },
          { id: "banners", label: "Lower-Third Templates", count: 5 },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "logos" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="rounded-2xl border-2 border-dashed border-white/10 p-6 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors cursor-pointer bg-surface/30">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-medium text-white">Upload New Logo</span>
            <span className="text-[10px] text-slate-500 mt-1">PNG, SVG with transparency</span>
          </div>

          {[
            { name: "LiveStudio Primary Light", format: "PNG (1080p)", isDefault: true },
            { name: "Corporate Minimal Icon", format: "SVG Vector", isDefault: false },
            { name: "Sponsor Dark Badge", format: "PNG (Trans)", isDefault: false },
          ].map((item, idx) => (
            <Card key={idx} hoverEffect className="group">
              <div className="aspect-video rounded-xl bg-black/40 border border-white/5 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="font-bold tracking-wider text-xl text-indigo-400">
                  {idx === 0 ? "LiveStudio" : idx === 1 ? "LS ◈" : "PARTNER"}
                </div>
                {item.isDefault && (
                  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="pt-3">
                <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.format}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "banners" && (
        <div className="space-y-4">
          {[
            { title: user?.name || "Host Presenter", subtitle: "Founder & Lead Architect", style: "Minimal Gradient" },
            { title: "Special Guest Keynote", subtitle: "VP of Cloud & AI Infrastructure", style: "Corporate Glass" },
            { title: "⚡ Breaking Announcement", subtitle: "LiveStudio v2 is now generally available", style: "High Contrast News" },
          ].map((banner, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-white/5 bg-surface-raised flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-10 rounded-full bg-indigo-500" />
                <div>
                  <h4 className="text-sm font-semibold text-white">{banner.title}</h4>
                  <p className="text-xs text-slate-400">{banner.subtitle}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{banner.style}</span>
            </div>
          ))}
        </div>
      )}

      {(activeTab === "overlays" || activeTab === "backgrounds") && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} hoverEffect className="group overflow-hidden p-0">
              <div className="aspect-video bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-indigo-400/40" />
              </div>
              <div className="p-3">
                <h4 className="text-xs font-semibold text-white">Preset Background #{i}</h4>
                <p className="text-[10px] text-slate-400">1920x1080 • 60 FPS</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
