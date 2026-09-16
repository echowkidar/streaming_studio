"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Send,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Youtube,
  Twitch,
  Globe,
  Sparkles,
  Radio,
  CheckCircle2,
  Sliders,
  Star,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { useStudioStore } from "@/stores/studio.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types";

export const ChatPanel: React.FC = () => {
  const {
    messages,
    addMessage,
    pinnedMessage,
    pinMessage,
    commentConfig,
    setCommentConfig,
    activeThemeColor,
  } = useStudioStore();
  const [inputText, setInputText] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    addMessage({
      id: `msg-${Date.now()}`,
      platform: "internal",
      author: "Host (Studio)",
      message: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setInputText("");
  };

  const handleSimulateAudience = () => {
    const sampleQuestions = [
      {
        author: "TechGeek24",
        platform: "youtube",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
        msg: "The new UI looks breathtaking! Is this fully self-hosted?",
      },
      {
        author: "Priya Sharma",
        platform: "youtube",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
        msg: "Are ISO individual recording tracks exported in full 48kHz uncompressed audio?",
      },
      {
        author: "DevStudio_Pro",
        platform: "twitch",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
        msg: "Awesome multi-layout switching! Can we automate lower-third graphics via API?",
      },
      {
        author: "Marcus Vance",
        platform: "webinar",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
        msg: "Is there any latency difference when streaming to YouTube & Twitch simultaneously?",
      },
    ];
    const picked = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
    addMessage({
      id: `msg-${Date.now()}`,
      platform: picked.platform as "youtube" | "twitch" | "webinar",
      author: picked.author,
      avatar: picked.avatar,
      message: picked.msg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  const getPlatformBadge = (p: string) => {
    switch (p) {
      case "youtube":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30">
            <Youtube className="w-2.5 h-2.5 text-rose-500" /> YouTube
          </span>
        );
      case "twitch":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/30">
            <Twitch className="w-2.5 h-2.5 text-purple-400" /> Twitch
          </span>
        );
      case "webinar":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-500/30">
            <Globe className="w-2.5 h-2.5 text-cyan-400" /> Webinar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30">
            <Radio className="w-2.5 h-2.5 text-indigo-400" /> Studio
          </span>
        );
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filterPlatform === "starred") return starredIds.has(m.id);
    if (filterPlatform === "all") return true;
    return m.platform === filterPlatform;
  });

  return (
    <div className="h-full flex flex-col justify-between bg-[#0b0b12]">
      {/* Header */}
      <div className="p-3 border-b border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Unified Live Chat
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-1.5 rounded-lg border text-xs transition-colors",
                showSettings
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              )}
              title="StreamYard Comment Display Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSimulateAudience}
              className="h-7 text-[10px] px-2 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/5"
              title="Simulate incoming YouTube/Twitch live comment"
            >
              <Sparkles className="w-3 h-3 mr-1 text-indigo-400" />
              + Test Comment
            </Button>
          </div>
        </div>

        {/* StreamYard Comment Overlay Customizer (Collapsible) */}
        {showSettings && (
          <div className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/25 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                Comment Overlay Settings (StreamYard)
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Position: Bottom (StreamYard Standard) vs Top */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-300 font-medium">On-Screen Position</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCommentConfig({ position: "bottom" })}
                  className={cn(
                    "py-1 px-2 rounded-lg text-[10px] font-semibold border transition-all text-center",
                    commentConfig?.position !== "top"
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-md"
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                  )}
                >
                  Lower Third (Bottom)
                </button>
                <button
                  type="button"
                  onClick={() => setCommentConfig({ position: "top" })}
                  className={cn(
                    "py-1 px-2 rounded-lg text-[10px] font-semibold border transition-all text-center",
                    commentConfig?.position === "top"
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-md"
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                  )}
                >
                  Headline (Top)
                </button>
              </div>
            </div>

            {/* Theme: Default / Minimal / Classic */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-300 font-medium">Card Theme</div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "default" as const, label: "Bubble" },
                  { id: "minimal" as const, label: "Minimal" },
                  { id: "classic" as const, label: "Classic" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCommentConfig({ theme: t.id })}
                    className={cn(
                      "py-1 rounded-md text-[9px] font-semibold border transition-all text-center",
                      (commentConfig?.theme || "default") === t.id
                        ? "bg-indigo-600 border-indigo-400 text-white"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Platform Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {[
            { id: "all", label: "All" },
            { id: "youtube", label: "YouTube" },
            { id: "twitch", label: "Twitch" },
            { id: "starred", label: `Starred (${starredIds.size})` },
            { id: "internal", label: "Studio" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterPlatform(tab.id)}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all shrink-0",
                filterPlatform === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-surface text-slate-400 hover:text-slate-200 border border-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* On-Stream Graphic Active Banner */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-indigo-950/70 border-b border-indigo-500/30 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <span>ON STREAM</span>
                <span className="text-[9px] font-mono text-slate-400">
                  ({commentConfig?.position === "top" ? "Top" : "Lower Third"})
                </span>
              </div>
              <p className="text-[11px] text-white truncate max-w-[180px]">
                <strong className="text-slate-300">{pinnedMessage.author}:</strong> {pinnedMessage.message}
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => pinMessage(null)}
            className="h-6 px-2 text-[10px] shrink-0"
          >
            <EyeOff className="w-3 h-3 mr-1" />
            Hide
          </Button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-medium text-slate-400">No messages in this feed yet</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Live comments from YouTube, Twitch, and Studio will aggregate here automatically.
            </p>
          </div>
        ) : (
          filteredMessages.map((m) => {
            const isPinned = pinnedMessage?.id === m.id;
            const isStarred = starredIds.has(m.id);
            return (
              <div
                key={m.id}
                className={cn(
                  "p-2.5 rounded-xl border text-xs transition-all space-y-2",
                  isPinned
                    ? "bg-indigo-500/15 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
                    : "bg-surface border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* User Avatar Circle */}
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.author}
                        className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[9px] text-white shrink-0">
                        {m.author[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-white text-[11px] truncate max-w-[120px]">
                      {m.author}
                    </span>
                    {getPlatformBadge(m.platform)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleStar(m.id)}
                      className={cn(
                        "p-1 rounded transition-colors",
                        isStarred ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                      )}
                      title={isStarred ? "Unstar question" : "Star question for Q&A"}
                    >
                      <Star className="w-3 h-3 fill-current" />
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">{m.timestamp}</span>
                  </div>
                </div>

                <p className="text-slate-200 text-xs leading-relaxed">{m.message}</p>

                <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                  {isPinned ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ON STREAM GRAPHIC
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Not showing on stage</span>
                  )}

                  <Button
                    variant={isPinned ? "danger" : "secondary"}
                    size="sm"
                    onClick={() => pinMessage(isPinned ? null : m)}
                    className={cn(
                      "h-6 px-2.5 text-[10px] font-medium transition-all",
                      isPinned
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                        : "hover:text-indigo-300"
                    )}
                  >
                    {isPinned ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1 text-rose-400" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1 text-indigo-400" />
                        Show on Stream
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSend} className="p-2.5 border-t border-white/5 bg-[#09090f] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a host announcement or banner..."
          className="flex-1 h-8 px-3 text-xs rounded-xl bg-surface border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <Button type="submit" variant="primary" size="icon" className="h-8 w-8 shrink-0 rounded-xl">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
