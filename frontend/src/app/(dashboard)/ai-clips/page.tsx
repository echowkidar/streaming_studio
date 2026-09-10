"use client";

import { useState } from "react";
import { Sparkles, Play, Download, Share2, Scissors, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function AiClipsPage() {
  const clips = [
    {
      id: "clip-1",
      title: "Why WebRTC is Replacing RTMP for Real-Time Production",
      score: 96,
      duration: "00:48",
      aspectRatio: "9:16 (TikTok/Reels)",
      sourceRecording: "Architectural Evolution of LiveStudio",
      captions: "Burned-in animated karaoke style captions",
    },
    {
      id: "clip-2",
      title: "The Biggest Mistake in Self-Hosting Docker Containers",
      score: 91,
      duration: "00:35",
      aspectRatio: "9:16 (TikTok/Reels)",
      sourceRecording: "Weekly Engineering Sync & Demo Day",
      captions: "Dynamic split-screen with active speaker crop",
    },
    {
      id: "clip-3",
      title: "LiveStudio 2.0 Feature Breakdown in 60 Seconds",
      score: 88,
      duration: "00:58",
      aspectRatio: "1:1 (Square Feed)",
      sourceRecording: "Community AMA & Developer Roadmap",
      captions: "Minimal subtitle highlight",
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">AI Clips & Shorts</h1>
            <Badge variant="purple" size="sm">AI POWERED</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automatically detect viral moments, reframe horizontally recorded broadcasts into vertical 9:16 shorts, and generate animated captions.
          </p>
        </div>
        <Button variant="primary">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate New Clips
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {clips.map((clip) => (
          <Card key={clip.id} hoverEffect className="group overflow-hidden p-0 flex flex-col justify-between">
            <div className="aspect-[9/14] bg-[#07070c] relative flex items-center justify-center border-b border-white/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 z-10" />
              
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Score: {clip.score}/100
                </span>
              </div>

              <div className="absolute top-3 right-3 z-20">
                <Badge variant="neutral" size="sm" className="bg-black/60">
                  {clip.aspectRatio.split(" ")[0]}
                </Badge>
              </div>

              <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <Button variant="primary" size="icon" className="rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-5 h-5 ml-0.5" />
                </Button>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-20 space-y-2">
                <h3 className="text-sm font-bold text-white leading-snug">
                  {clip.title}
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  From: {clip.sourceRecording}
                </p>
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Duration: <strong className="text-white font-mono">{clip.duration}</strong></span>
                <span className="text-emerald-400 font-medium">Ready to Export</span>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <Button variant="primary" size="sm" className="w-full text-xs">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export Short
                </Button>
                <Button variant="secondary" size="icon" className="shrink-0 h-8 w-8">
                  <Scissors className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
