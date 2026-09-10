"use client";

import { useState } from "react";
import { Send, Plus, Check, Globe, Youtube, Twitch, Facebook, Linkedin, Shield, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function DestinationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("YOUTUBE");
  const [rtmpUrl, setRtmpUrl] = useState("rtmp://a.rtmp.youtube.com/live2");
  const [streamKey, setStreamKey] = useState("");

  const [destinations, setDestinations] = useState([
    {
      id: "dest-yt",
      name: "YouTube Live - Salar Studio",
      platform: "YOUTUBE",
      rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
      maskedKey: "••••••••••••••••3821",
      status: "READY",
      lastUsed: "2 hours ago",
    },
    {
      id: "dest-tw",
      name: "Twitch Gaming & Dev Stream",
      platform: "TWITCH",
      rtmpUrl: "rtmp://live.twitch.tv/app",
      maskedKey: "••••••••••••••••9104",
      status: "READY",
      lastUsed: "Yesterday",
    },
    {
      id: "dest-custom",
      name: "Private High-Performance CDN RTMP",
      platform: "CUSTOM_RTMP",
      rtmpUrl: "rtmp://edge.stream.network.io/live",
      maskedKey: "••••••••••••••••7741",
      status: "READY",
      lastUsed: "3 days ago",
    }
  ]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !streamKey) return;
    setDestinations([
      ...destinations,
      {
        id: `dest-${Date.now()}`,
        name,
        platform,
        rtmpUrl,
        maskedKey: "••••••••••••••••" + streamKey.slice(-4),
        status: "READY",
        lastUsed: "Never",
      }
    ]);
    setName("");
    setStreamKey("");
    setIsModalOpen(false);
  };

  const getIcon = (p: string) => {
    switch (p) {
      case "YOUTUBE": return <Youtube className="w-5 h-5 text-rose-500" />;
      case "TWITCH": return <Twitch className="w-5 h-5 text-purple-400" />;
      case "FACEBOOK": return <Facebook className="w-5 h-5 text-blue-500" />;
      case "LINKEDIN": return <Linkedin className="w-5 h-5 text-blue-400" />;
      default: return <Globe className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Streaming Destinations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Multistream your live production to YouTube, Twitch, Facebook, and Custom RTMP servers simultaneously.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Destination
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {destinations.map((dest) => (
          <Card key={dest.id} hoverEffect className="space-y-4">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-surface border border-white/5">
                    {getIcon(dest.platform)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{dest.name}</h3>
                    <p className="text-[11px] text-slate-400 capitalize">{dest.platform.replace("_", " ")}</p>
                  </div>
                </div>
                <Badge variant="success">READY</Badge>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Server URL:</span>
                  <span className="font-mono text-slate-300 truncate max-w-[160px]">{dest.rtmpUrl}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-400"/> Stream Key:</span>
                  <span className="font-mono text-slate-400">{dest.maskedKey}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                <span>Last used {dest.lastUsed}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Streaming Destination"
        description="Enter your RTMP endpoint and stream key. Keys are AES-256 encrypted at rest."
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Destination Name"
            placeholder="e.g. YouTube Live Primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {["YOUTUBE", "TWITCH", "CUSTOM_RTMP"].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    setPlatform(p);
                    if (p === "YOUTUBE") setRtmpUrl("rtmp://a.rtmp.youtube.com/live2");
                    else if (p === "TWITCH") setRtmpUrl("rtmp://live.twitch.tv/app");
                    else setRtmpUrl("rtmp://");
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    platform === p
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-white/5 bg-surface text-slate-400 hover:text-white"
                  }`}
                >
                  {getIcon(p)}
                  <span>{p === "CUSTOM_RTMP" ? "Custom" : p}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="RTMP Server URL"
            value={rtmpUrl}
            onChange={(e) => setRtmpUrl(e.target.value)}
            required
          />

          <Input
            label="Stream Key (Encrypted)"
            placeholder="Paste your secret stream key"
            isPassword
            value={streamKey}
            onChange={(e) => setStreamKey(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Destination
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
