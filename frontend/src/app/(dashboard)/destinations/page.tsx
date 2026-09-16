"use client";

import { useState, useEffect } from "react";
import { Send, Plus, Globe, Youtube, Twitch, Facebook, Linkedin, Shield, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth.store";

interface Destination {
  id: string;
  name: string;
  platform: string;
  rtmpUrl: string;
  streamKey: string;
  status: string;
  lastUsedAt?: string | null;
  createdAt?: string;
}

const DEFAULT_URLS: Record<string, string> = {
  YOUTUBE: "rtmp://a.rtmp.youtube.com/live2",
  TWITCH: "rtmp://live.twitch.tv/app",
  FACEBOOK: "rtmps://live-api-s.facebook.com:443/rtmp/",
  LINKEDIN: "rtmps://live-api.linkedin.com:443/channel/",
  CUSTOM_RTMP: "rtmp://",
};

const LOCAL_STORAGE_KEY = "livestudio_custom_destinations";

export default function DestinationsPage() {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("YOUTUBE");
  const [rtmpUrl, setRtmpUrl] = useState(DEFAULT_URLS.YOUTUBE);
  const [streamKey, setStreamKey] = useState("");

  const getStorageKey = () => {
    return user?.id ? `livestudio_custom_destinations_${user.id}` : "livestudio_custom_destinations";
  };

  const getLocalDestinations = (): Destination[] => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(getStorageKey());
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveLocalDestinations = (items: Destination[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
      const res = await fetch("/api/destinations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setDestinations(json.data);
          saveLocalDestinations(json.data);
          return;
        }
      }
      // Fallback to local storage
      const local = getLocalDestinations();
      setDestinations(local);
    } catch (e) {
      console.error("Failed to fetch destinations from API, using offline backup:", e);
      const local = getLocalDestinations();
      setDestinations(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, [user?.id]);

  const handleOpenCreate = () => {
    setEditingDestination(null);
    setName("");
    setPlatform("YOUTUBE");
    setRtmpUrl(DEFAULT_URLS.YOUTUBE);
    setStreamKey("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dest: Destination) => {
    setEditingDestination(dest);
    setName(dest.name);
    setPlatform(dest.platform);
    setRtmpUrl(dest.rtmpUrl);
    setStreamKey("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handlePlatformChange = (p: string) => {
    setPlatform(p);
    setRtmpUrl(DEFAULT_URLS[p] || "rtmp://");
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Destination Name is required");
      return;
    }
    if (!editingDestination && !streamKey.trim()) {
      setFormError("Stream Key is required");
      return;
    }
    setFormError(null);

    if (editingDestination) {
      // Edit existing destination
      const updatedItem: Destination = {
        ...editingDestination,
        name: name.trim(),
        platform,
        rtmpUrl: rtmpUrl.trim(),
      };

      try {
        setSubmitting(true);
        const payload: Record<string, string> = {
          name: name.trim(),
          platform,
          rtmpUrl: rtmpUrl.trim(),
        };
        if (streamKey.trim()) {
          payload.streamKey = streamKey.trim();
        }

        const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
        const res = await fetch(`/api/destinations/${editingDestination.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const next = destinations.map((d) => (d.id === editingDestination.id ? { ...d, ...json.data } : d));
          setDestinations(next);
          saveLocalDestinations(next);
        } else {
          const next = destinations.map((d) => (d.id === editingDestination.id ? updatedItem : d));
          setDestinations(next);
          saveLocalDestinations(next);
        }
      } catch (err) {
        console.warn("Edit destination fallback update:", err);
        const next = destinations.map((d) => (d.id === editingDestination.id ? updatedItem : d));
        setDestinations(next);
        saveLocalDestinations(next);
      } finally {
        setSubmitting(false);
        setIsModalOpen(false);
        setEditingDestination(null);
      }
      return;
    }

    // Create new destination
    const newDestItem: Destination = {
      id: `dest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      platform,
      rtmpUrl: rtmpUrl.trim(),
      streamKey: "••••••••••••",
      status: "READY",
      createdAt: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
      const res = await fetch("/api/destinations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), platform, rtmpUrl: rtmpUrl.trim(), streamKey: streamKey.trim() }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setName("");
        setStreamKey("");
        setIsModalOpen(false);
        fetchDestinations();
      } else {
        const updated = [newDestItem, ...destinations.filter((d) => d.id !== newDestItem.id)];
        setDestinations(updated);
        saveLocalDestinations(updated);
        setName("");
        setStreamKey("");
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error("Add destination network error, saving locally:", e);
      const updated = [newDestItem, ...destinations.filter((d) => d.id !== newDestItem.id)];
      setDestinations(updated);
      saveLocalDestinations(updated);
      setName("");
      setStreamKey("");
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this destination?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
      await fetch(`/api/destinations/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.error("Delete error:", e);
    }
    const updated = destinations.filter((d) => d.id !== id);
    setDestinations(updated);
    saveLocalDestinations(updated);
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
            Multistream your live studio production to YouTube, Twitch, Facebook, and Custom RTMP servers simultaneously.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Destination
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading streaming destinations...</div>
      ) : destinations.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 p-12 bg-white/[0.01]">
          <Send className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">No Destinations Connected Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Connect your YouTube channel or custom RTMP server to start broadcasting your live studio show.
          </p>
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Connect Your First Destination
          </Button>
        </div>
      ) : (
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
                      <h4 className="font-semibold text-white leading-tight">{dest.name}</h4>
                      <p className="text-xs text-slate-400 uppercase font-mono mt-0.5">{dest.platform}</p>
                    </div>
                  </div>
                  <Badge variant={dest.status === "LIVE" ? "live" : "neutral"} size="sm">
                    {dest.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg bg-black/20 border border-white/5 font-mono text-xs text-slate-400">
                  <div className="truncate">
                    <span className="text-slate-500 select-none">URL: </span>
                    <span className="text-slate-300">{dest.rtmpUrl}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 select-none">KEY: </span>
                      <span className="text-slate-300">{dest.streamKey}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      AES-256
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                  <span>{dest.lastUsedAt ? `Used: ${new Date(dest.lastUsedAt).toLocaleDateString()}` : "Ready"}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(dest)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Edit destination"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dest.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove destination"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Destination Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDestination(null);
        }}
        title={editingDestination ? "Edit Streaming Destination" : "Add Streaming Destination"}
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "YOUTUBE", label: "YouTube", icon: Youtube, color: "text-rose-500" },
                { id: "TWITCH", label: "Twitch", icon: Twitch, color: "text-purple-400" },
                { id: "FACEBOOK", label: "Facebook", icon: Facebook, color: "text-blue-500" },
                { id: "CUSTOM_RTMP", label: "Custom RTMP", icon: Globe, color: "text-emerald-400" },
              ].map((p) => {
                const Icon = p.icon;
                const active = platform === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handlePlatformChange(p.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? "bg-indigo-600/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                        : "bg-surface border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${p.color}`} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Destination Name"
            placeholder="e.g. My YouTube Channel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="RTMP Server URL"
            placeholder="rtmp://..."
            value={rtmpUrl}
            onChange={(e) => setRtmpUrl(e.target.value)}
            required
          />

          <Input
            label={editingDestination ? "Stream Key (Leave blank to keep unchanged)" : "Stream Key"}
            type="password"
            placeholder={
              editingDestination
                ? "Leave blank to keep current key, or paste new key"
                : "Paste stream key here (stored with AES-256 encryption)"
            }
            value={streamKey}
            onChange={(e) => setStreamKey(e.target.value)}
            required={!editingDestination}
          />

          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2.5 text-xs text-indigo-300">
            <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Your stream key is encrypted with AES-256-GCM before storage. It is only decrypted server-side at the moment you click <strong>GO LIVE</strong>.
            </span>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingDestination(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={submitting}>
              {editingDestination ? "Update Destination" : "Connect Destination"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
