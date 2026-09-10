"use client";

import { useState } from "react";
import { FolderOpen, Upload, Video, Image as ImageIcon, Music, FileText, Search, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";

export default function MediaLibraryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const mediaFiles = [
    {
      id: "media-1",
      name: "Intro_Countdown_30s_1080p.mp4",
      type: "VIDEO",
      size: "42.5 MB",
      duration: "00:30",
      uploadedAt: "Yesterday",
    },
    {
      id: "media-2",
      name: "Outro_Credits_Theme.mp4",
      type: "VIDEO",
      size: "28.1 MB",
      duration: "00:20",
      uploadedAt: "3 days ago",
    },
    {
      id: "media-3",
      name: "Product_Roadmap_Slide_Deck.pdf",
      type: "PDF",
      size: "8.4 MB",
      pages: "24 slides",
      uploadedAt: "Sep 4, 2026",
    },
    {
      id: "media-4",
      name: "Ambient_Chillhop_Background.mp3",
      type: "AUDIO",
      size: "12.0 MB",
      duration: "03:45",
      uploadedAt: "Aug 29, 2026",
    },
    {
      id: "media-5",
      name: "Sponsor_Banner_LowerThird.png",
      type: "IMAGE",
      size: "1.2 MB",
      resolution: "1920x250",
      uploadedAt: "Aug 20, 2026",
    }
  ];

  const filteredMedia = mediaFiles.filter((m) => {
    if (activeTab === "video") return m.type === "VIDEO";
    if (activeTab === "audio") return m.type === "AUDIO";
    if (activeTab === "pdf") return m.type === "PDF";
    if (activeTab === "image") return m.type === "IMAGE";
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "VIDEO": return <Video className="w-5 h-5 text-indigo-400" />;
      case "AUDIO": return <Music className="w-5 h-5 text-emerald-400" />;
      case "IMAGE": return <ImageIcon className="w-5 h-5 text-cyan-400" />;
      default: return <FileText className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Media Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Store video clips, intro/outro stingers, background music, slides, and PDFs to share live on stage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary">
            <Upload className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: "all", label: "All Media", count: mediaFiles.length },
            { id: "video", label: "Videos / Clips", count: 2 },
            { id: "audio", label: "Audio & Music", count: 1 },
            { id: "pdf", label: "Slides & PDF", count: 1 },
            { id: "image", label: "Images", count: 1 },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredMedia.map((m) => (
          <Card key={m.id} hoverEffect className="group overflow-hidden p-0 flex flex-col justify-between">
            <div className="aspect-video bg-[#0a0a10] relative flex items-center justify-center border-b border-white/5">
              <div className="p-4 rounded-2xl bg-surface border border-white/5">
                {getIcon(m.type)}
              </div>
              {m.type === "VIDEO" && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                  <Button variant="primary" size="icon" className="rounded-full shadow-lg">
                    <Play className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-white truncate" title={m.name}>
                {m.name}
              </h4>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{m.size}</span>
                <span>{m.duration || m.pages || m.resolution}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
