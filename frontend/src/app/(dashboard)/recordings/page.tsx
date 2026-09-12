"use client";

import { useState, useEffect } from "react";
import { Film, Download, Play, Trash2, Sparkles, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

interface RecordingItem {
  id: string;
  title: string;
  duration: number;
  resolution: string | null;
  fileSize: number;
  createdAt: string;
  status: string;
  broadcast?: { id: string; title: string };
  aiClips?: unknown[];
  transcripts?: unknown[];
}

function formatDuration(seconds: number): string {
  if (!seconds) return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/recordings");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecordings(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch recordings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id);
      const res = await fetch(`/api/recordings/${id}/download`);
      const json = await res.json();
      if (json.success && json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, "_blank");
      } else {
        alert(json.error || "Failed to generate download URL");
      }
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recording? This will also remove the video from cloud storage.")) return;
    try {
      await fetch(`/api/recordings/${id}`, { method: "DELETE" });
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const filtered = recordings.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Recordings Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Access, download, trim, and generate AI highlights from your recorded broadcasts stored in MinIO.
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

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading recordings...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 p-12 bg-white/[0.01]">
          <Film className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">No Cloud Recordings Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            When you finish a live stream or record in your studio, the video file will automatically appear here with high-speed download links.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((rec) => (
            <Card key={rec.id} hoverEffect className="group overflow-hidden p-0">
              <div className="aspect-video bg-[#0a0a10] relative flex items-center justify-center border-b border-white/5 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                <Film className="w-12 h-12 text-indigo-500/20 group-hover:scale-110 transition-transform duration-300" />

                <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between text-xs">
                  <Badge variant="neutral" size="sm" className="bg-black/60 backdrop-blur-md">
                    {rec.resolution || "1080p"}
                  </Badge>
                  <span className="font-mono text-[11px] text-white bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded">
                    {formatDuration(rec.duration)}
                  </span>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {rec.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(rec.createdAt).toLocaleDateString()} • {formatBytes(rec.fileSize)}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8"
                    isLoading={downloadingId === rec.id}
                    onClick={() => handleDownload(rec.id)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download MP4
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      title="Delete Recording"
                      onClick={() => handleDelete(rec.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
