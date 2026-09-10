"use client";

import React, { useState } from "react";
import { MessageSquare, Send, Pin, Eye, Youtube, Twitch, Globe } from "lucide-react";
import { useStudioStore } from "@/stores/studio.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const ChatPanel: React.FC = () => {
  const { messages, addMessage, pinnedMessage, pinMessage } = useStudioStore();
  const [inputText, setInputText] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    addMessage({
      id: `msg-${Date.now()}`,
      platform: "internal",
      author: "Host (You)",
      message: inputText.trim(),
      timestamp: "Just now",
    });
    setInputText("");
  };

  const getPlatformIcon = (p: string) => {
    switch (p) {
      case "youtube": return <Youtube className="w-3 h-3 text-rose-500" />;
      case "twitch": return <Twitch className="w-3 h-3 text-purple-400" />;
      default: return <Globe className="w-3 h-3 text-cyan-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Unified Live Chat</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{messages.length} messages</span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((m) => {
          const isPinned = pinnedMessage?.id === m.id;
          return (
            <div
              key={m.id}
              className={`p-3 rounded-xl border text-xs transition-all space-y-1 group ${
                isPinned
                  ? "bg-indigo-500/15 border-indigo-500/50"
                  : "bg-surface border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  {getPlatformIcon(m.platform)}
                  <span>{m.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-mono">{m.timestamp}</span>
                  <button
                    onClick={() => pinMessage(isPinned ? null : m)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-opacity"
                    title={isPinned ? "Remove from Stream" : "Show on Stream"}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">{m.message}</p>
            </div>
          );
        })}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send message to stream..."
          className="flex-1 h-9 px-3 text-xs rounded-xl bg-surface border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <Button type="submit" variant="primary" size="icon" className="h-9 w-9 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
