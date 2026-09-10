"use client";

import React, { useState } from "react";
import { Play, Users, MessageSquare, Send, Heart, Flame, ThumbsUp, Radio, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function WebinarWatchPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState([
    { id: 1, author: "Amina K.", text: "Audio and video are crystal clear!", time: "2:01 PM" },
    { id: 2, author: "Marcus Vance", text: "Great keynote! Will the slides be available?", time: "2:04 PM" },
    { id: 3, author: "DevTeam_HQ", text: "Can we self-host this with Portainer on Ubuntu?", time: "2:06 PM" },
  ]);
  const [inputText, setInputText] = useState("");
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages([
      ...messages,
      { id: Date.now(), author: "You", text: inputText.trim(), time: "Just now" },
    ]);
    setInputText("");
  };

  const triggerReaction = (emoji: string) => {
    const id = Date.now();
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  return (
    <div className="min-h-screen w-screen bg-[#07070b] text-slate-100 flex flex-col overflow-x-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-white/5 bg-[#0b0b12]/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-sm font-bold text-white tracking-wider font-mono">LiveStudio</span>
          </div>
          <span className="text-slate-500">•</span>
          <span className="text-xs text-slate-300 font-medium truncate max-w-sm">
            Mastering Browser-Based Live Production with WebRTC
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="live" size="sm">LIVE STREAM</Badge>
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5" />
            1,428 Watching
          </span>
        </div>
      </header>

      {/* Main Watch Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Video Player & Details */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto custom-scrollbar">
          {/* Main Video Viewport */}
          <div className="w-full aspect-video rounded-2xl bg-black border border-white/10 relative overflow-hidden shadow-2xl flex items-center justify-center group">
            {/* Simulated Live Broadcast Stream Content */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-black flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-300">
                  <Radio className="w-10 h-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Keynote Broadcast</h3>
                  <p className="text-xs text-slate-400">Streamed via LiveKit SFU • 1080p 60FPS</p>
                </div>
              </div>
            </div>

            {/* Live Watermark Overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <Badge variant="live" size="sm">LIVE</Badge>
              <span className="text-[11px] font-mono text-white/70 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
                00:42:15
              </span>
            </div>

            {/* Floating Emoji Animations */}
            <div className="absolute bottom-6 right-6 pointer-events-none z-30 flex flex-col gap-2">
              {reactions.map((r) => (
                <div
                  key={r.id}
                  className="text-3xl animate-in fade-in slide-in-from-bottom-6 duration-500"
                >
                  {r.emoji}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Emoji Reactions Bar */}
          <div className="mt-4 p-3 rounded-2xl bg-surface border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-2">React Live:</span>
              {[
                { emoji: "❤️", icon: Heart },
                { emoji: "🔥", icon: Flame },
                { emoji: "👍", icon: ThumbsUp },
                { emoji: "✨", icon: Sparkles },
              ].map((r, i) => (
                <button
                  key={i}
                  onClick={() => triggerReaction(r.emoji)}
                  className="px-3 py-1.5 rounded-xl bg-surface-raised border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-sm flex items-center gap-1 active:scale-95"
                >
                  <span>{r.emoji}</span>
                </button>
              ))}
            </div>

            <Button variant="secondary" size="sm" className="text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share Webinar
            </Button>
          </div>

          {/* Webinar Metadata */}
          <div className="mt-6 space-y-2">
            <h1 className="text-xl font-bold text-white">
              Mastering Browser-Based Live Production with WebRTC
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Learn how to run professional interactive broadcasts directly from modern desktop browsers with real-time video compositing, dynamic lower-thirds, and multi-platform distribution.
            </p>
          </div>
        </div>

        {/* Right Live Chat Sidebar */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0a0a10] flex flex-col h-96 lg:h-auto shrink-0">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Webinar Live Chat</h3>
            </div>
            <span className="text-[10px] text-slate-500">Live audience</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className="p-3 rounded-xl bg-surface/60 border border-white/5 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{m.author}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{m.time}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Join the conversation..."
              className="flex-1 h-9 px-3 text-xs rounded-xl bg-surface border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Button type="submit" variant="primary" size="icon" className="h-9 w-9 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
