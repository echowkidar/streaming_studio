"use client";

import { useState } from "react";
import { Film, Download, Play, Trash2, Sparkles, FileText, Search, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

export default function RecordingsPage() {
  const [search, setSearch] = useState("");

  const recordings = [
    {
      id: "rec-1",
      title: "Keynote: Architectural Evolution of LiveStudio v2",
      duration: "01:14:22",
      resolution: "1080p60",
      fileSize: "2.4 GB",
      recordedAt: "Yesterday, 4:20 PM",
      status: "READY",
      hasAiClips: true,
      hasTranscript: true,
    },
    {
      id: "rec-2",
      title: "Weekly Engineering Sync & Demo Day",
      duration: "00:45:10",
      resolution: "1080p30",
      fileSize: "1.1 GB",
      recordedAt: "Sep 8, 2026",
      status: "READY",
      hasAiClips: false,
      hasTranscript: true,
    },
    {
      id: "rec-3",
      title: "Q&A Session with Community Contributors",
      duration: "00:32:45",
      resolution: "1080p60",
      fileSize: "890 MB",
      recordedAt: "Sep 5, 2026",
      status: "READY",
      hasAiClips: true,
      hasTranscript: false,
    },
    {
      id: "rec-4",
      title: "Live Studio Stress Test & Network Simulation",
      duration: "00:15:30",
      resolution: "1080p60",
      fileSize: "450 MB",
      recordedAt: "Sep 2, 2026",
      status: "READY",
      hasAiClips: false,
      hasTranscript: false,
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Recordings Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Access, download, trim, and generate AI highlights from your recorded broadcasts.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search recordings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings.map((rec) => (
          <Card key={rec.id} hoverEffect className="group overflow-hidden p-0">
            <div className="aspect-video bg-[#0a0a10] relative flex items-center justify-center border-b border-white/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              <Film className="w-12 h-12 text-indigo-500/20 group-hover:scale-110 transition-transform duration-300" />
              
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
                <Button variant="primary" size="icon" className="rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-5 h-5 ml-0.5" />
                </Button>
              </div>

              <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between text-xs">
                <Badge variant="neutral" size="sm" className="bg-black/60 backdrop-blur-md">
                  {rec.resolution}
                </Badge>
                <span className="font-mono text-[11px] text-white bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded">
                  {rec.duration}
                </span>
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {rec.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {rec.recordedAt} • {rec.fileSize}
                </p>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {rec.hasAiClips && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                    <Sparkles className="w-3 h-3" /> AI Clips Ready
                  </span>
                )}
                {rec.hasTranscript && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                    <FileText className="w-3 h-3" /> Transcript
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <Button variant="secondary" size="sm" className="text-xs h-8">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10" title="Generate AI Highlights">
                    <Sparkles className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" title="Delete Recording">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
