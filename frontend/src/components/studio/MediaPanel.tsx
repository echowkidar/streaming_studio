"use client";

import React from "react";
import { PlaySquare, Video, FileText, Music, Play, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const MediaPanel: React.FC = () => {
  const mediaItems = [
    { name: "Intro_Countdown_30s.mp4", type: "video", duration: "00:30" },
    { name: "Outro_Credits_Theme.mp4", type: "video", duration: "00:20" },
    { name: "Product_Roadmap_2026.pdf", type: "pdf", duration: "24 slides" },
    { name: "Background_Lofi_Beat.mp3", type: "audio", duration: "03:45" },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Production Media</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-400">
          <Upload className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {mediaItems.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-surface border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-raised border border-white/5 text-indigo-400">
                {item.type === "video" && <Video className="w-4 h-4" />}
                {item.type === "pdf" && <FileText className="w-4 h-4" />}
                {item.type === "audio" && <Music className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate max-w-[140px]">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{item.duration}</div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="h-7 px-2.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Play className="w-3 h-3 mr-1" />
              Play
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
