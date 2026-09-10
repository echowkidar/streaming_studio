"use client";

import { useState } from "react";
import { FileText, Download, Search, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function TranscriptsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("trans-1");

  const transcripts = [
    {
      id: "trans-1",
      title: "Keynote: Architectural Evolution of LiveStudio v2",
      date: "Sep 9, 2026",
      wordCount: 8420,
      accuracy: "99.2%",
      segments: [
        { time: "00:00:15", speaker: "Salar Khan", text: "Welcome everyone to the LiveStudio keynote. Today we are showcasing our brand new self-hosted browser production studio." },
        { time: "00:01:42", speaker: "Elena Rostova", text: "What really sets this apart is the zero-install SFU WebRTC architecture running cleanly on Ubuntu and Portainer." },
        { time: "00:03:10", speaker: "Salar Khan", text: "Exactly. You get sub-200ms latency between all co-hosts while simultaneously pushing high-bitrate RTMP to YouTube and Twitch." },
      ]
    },
    {
      id: "trans-2",
      title: "Weekly Engineering Sync & Demo Day",
      date: "Sep 8, 2026",
      wordCount: 4150,
      accuracy: "98.7%",
      segments: [
        { time: "00:00:05", speaker: "Alex Chen", text: "Let's review the MinIO chunked upload resilience tests for local participant recordings." },
        { time: "00:02:18", speaker: "Salar Khan", text: "The tus protocol integration allows automatic resume even if a guest drops their WiFi connection mid-stream." }
      ]
    }
  ];

  const activeTranscript = transcripts.find((t) => t.id === selectedId) || transcripts[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Speech Transcripts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Searchable, timestamped transcripts generated with local Whisper and faster-whisper models.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Download SRT / VTT
          </Button>
          <Button variant="primary">
            <Copy className="w-4 h-4 mr-2" />
            Copy Text
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transcript Selection List */}
        <div className="space-y-3">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search transcript text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="space-y-2">
            {transcripts.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedId === t.id
                    ? "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5"
                    : "bg-surface-raised border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-semibold text-white truncate">{t.title}</h4>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>{t.date}</span>
                  <span>{t.wordCount} words • {t.accuracy} acc</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript Segment Reader */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-surface-raised/70 p-6 backdrop-blur-md">
          <div className="pb-4 border-b border-white/5 mb-6">
            <h2 className="text-base font-semibold text-white">{activeTranscript.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Recorded on {activeTranscript.date} • {activeTranscript.wordCount} words</p>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {activeTranscript.segments.map((seg, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-surface/50 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-400">{seg.speaker}</span>
                  <span className="font-mono text-[10px] text-slate-500 bg-black/40 px-2 py-0.5 rounded">{seg.time}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{seg.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
