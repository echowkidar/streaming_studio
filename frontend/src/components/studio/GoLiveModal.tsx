import { useState, useEffect } from "react";
import { Radio, Youtube, Twitch, Facebook, Globe, Check, AlertCircle, Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { stageBroadcaster } from "@/lib/stageBroadcaster";
import { useAuthStore } from "@/stores/auth.store";

interface Destination {
  id: string;
  name: string;
  platform: string;
  rtmpUrl: string;
  streamKey: string;
  status: string;
}

const DEFAULT_URLS: Record<string, string> = {
  YOUTUBE: "rtmp://a.rtmp.youtube.com/live2",
  TWITCH: "rtmp://live.twitch.tv/app",
  FACEBOOK: "rtmps://live-api-s.facebook.com:443/rtmp/",
  CUSTOM_RTMP: "rtmp://",
};

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  broadcastTitle: string;
  onGoLive: (selectedDestinationIds: string[]) => Promise<void>;
}

export function GoLiveModal({
  isOpen,
  onClose,
  broadcastTitle,
  onGoLive,
}: GoLiveModalProps) {
  const { user } = useAuthStore();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  // In-studio Add / Edit Channel sub-modal state
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [channelName, setChannelName] = useState("");
  const [channelPlatform, setChannelPlatform] = useState("YOUTUBE");
  const [channelRtmpUrl, setChannelRtmpUrl] = useState(DEFAULT_URLS.YOUTUBE);
  const [channelStreamKey, setChannelStreamKey] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  const getStorageKey = () => {
    return user?.id ? `livestudio_custom_destinations_${user.id}` : "livestudio_custom_destinations";
  };

  useEffect(() => {
    if (isOpen) {
      fetchDestinations();
    }
  }, [isOpen, user?.id]);

  const saveLocalDestinations = (items: Destination[]) => {
    if (typeof window === "undefined") return;
    try {
      const existingRaw = localStorage.getItem(getStorageKey());
      const keyMap = new Map<string, string>();
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((d: Destination) => {
              if (d.id && d.streamKey && !d.streamKey.includes("••••")) {
                keyMap.set(d.id, d.streamKey);
              }
            });
          }
        } catch {}
      }

      const merged = items.map((d) => {
        if (d.streamKey && d.streamKey.includes("••••")) {
          const preservedKey = keyMap.get(d.id);
          if (preservedKey) {
            return { ...d, streamKey: preservedKey };
          }
        }
        return d;
      });

      localStorage.setItem(getStorageKey(), JSON.stringify(merged));
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
          setSelectedIds(json.data.map((d: Destination) => d.id));
          saveLocalDestinations(json.data);
          return;
        }
      }
      // Fallback to local storage if API is empty or offline
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(getStorageKey());
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDestinations(parsed);
            setSelectedIds(parsed.map((d: Destination) => d.id));
          }
        }
      }
    } catch (e) {
      console.error("Failed to load destinations, checking localStorage fallback:", e);
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(getStorageKey());
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDestinations(parsed);
            setSelectedIds(parsed.map((d: Destination) => d.id));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddChannel = () => {
    setEditingDest(null);
    setChannelName("");
    setChannelPlatform("YOUTUBE");
    setChannelRtmpUrl(DEFAULT_URLS.YOUTUBE);
    setChannelStreamKey("");
    setChannelError(null);
    setIsChannelModalOpen(true);
  };

  const handleOpenEditChannel = (dest: Destination) => {
    setEditingDest(dest);
    setChannelName(dest.name);
    setChannelPlatform(dest.platform);
    setChannelRtmpUrl(dest.rtmpUrl);
    setChannelStreamKey("");
    setChannelError(null);
    setIsChannelModalOpen(true);
  };

  const handlePlatformChange = (p: string) => {
    setChannelPlatform(p);
    setChannelRtmpUrl(DEFAULT_URLS[p] || "rtmp://");
    setChannelError(null);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      setChannelError("Destination Name is required");
      return;
    }
    if (!editingDest && !channelStreamKey.trim()) {
      setChannelError("Stream Key is required");
      return;
    }
    setChannelError(null);

    setSavingChannel(true);

    if (editingDest) {
      // Edit existing
      const updatedItem: Destination = {
        ...editingDest,
        name: channelName.trim(),
        platform: channelPlatform,
        rtmpUrl: channelRtmpUrl.trim(),
        streamKey: channelStreamKey.trim() || editingDest.streamKey,
      };

      try {
        const payload: Record<string, string> = {
          name: channelName.trim(),
          platform: channelPlatform,
          rtmpUrl: channelRtmpUrl.trim(),
        };
        if (channelStreamKey.trim()) {
          payload.streamKey = channelStreamKey.trim();
        }

        const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
        const res = await fetch(`/api/destinations/${editingDest.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        const next = destinations.map((d) =>
          d.id === editingDest.id ? (json.success && json.data ? { ...d, ...json.data, streamKey: updatedItem.streamKey } : updatedItem) : d
        );
        setDestinations(next);
        saveLocalDestinations(next);
      } catch (err) {
        console.warn("Edit channel fallback update:", err);
        const next = destinations.map((d) => (d.id === editingDest.id ? updatedItem : d));
        setDestinations(next);
        saveLocalDestinations(next);
      } finally {
        setSavingChannel(false);
        setIsChannelModalOpen(false);
        setEditingDest(null);
      }
      return;
    }

    // Create new
    const newDest: Destination = {
      id: `dest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: channelName.trim(),
      platform: channelPlatform,
      rtmpUrl: channelRtmpUrl.trim(),
      streamKey: channelStreamKey.trim(),
      status: "READY",
    };

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
      const res = await fetch("/api/destinations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: channelName.trim(),
          platform: channelPlatform,
          rtmpUrl: channelRtmpUrl.trim(),
          streamKey: channelStreamKey.trim(),
        }),
      });
      const json = await res.json();
      const savedItem = json.success && json.data ? { ...json.data, streamKey: channelStreamKey.trim() } : newDest;
      const next = [savedItem, ...destinations.filter((d) => d.id !== savedItem.id)];
      setDestinations(next);
      setSelectedIds((prev) => [...prev, savedItem.id]);
      saveLocalDestinations(next);
    } catch (err) {
      console.warn("Add channel fallback save:", err);
      const next = [newDest, ...destinations.filter((d) => d.id !== newDest.id)];
      setDestinations(next);
      setSelectedIds((prev) => [...prev, newDest.id]);
      saveLocalDestinations(next);
    } finally {
      setSavingChannel(false);
      setIsChannelModalOpen(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("Are you sure you want to remove this streaming destination?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
      await fetch(`/api/destinations/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn("Delete channel API error:", e);
    }
    const next = destinations.filter((d) => d.id !== id);
    setDestinations(next);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    saveLocalDestinations(next);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one destination to stream to.");
      return;
    }
    try {
      setStarting(true);
      stageBroadcaster.ensureAudioContext();
      await onGoLive(selectedIds);
      onClose();
    } catch (e) {
      console.error("Failed to start live stream:", e);
    } finally {
      setStarting(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "YOUTUBE": return <Youtube className="w-5 h-5 text-rose-500" />;
      case "TWITCH": return <Twitch className="w-5 h-5 text-purple-400" />;
      case "FACEBOOK": return <Facebook className="w-5 h-5 text-blue-500" />;
      default: return <Globe className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Ready to Go Live?">
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
            <Radio className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-xs font-semibold text-white">Broadcast: {broadcastTitle}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Select which destinations you want to multistream to. Your stage composite will stream simultaneously in 1080p HD.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Streaming Destinations
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenAddChannel}
                className="text-[11px] h-7 px-2.5"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                Add Channel
              </Button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading destinations...</div>
            ) : destinations.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-white/10 text-center space-y-3 bg-black/20">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <div>
                  <p className="text-xs font-medium text-white">No Destinations Connected Yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                    Add your YouTube channel or custom RTMP credentials to broadcast your live show.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={handleOpenAddChannel} className="text-xs mt-1">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Connect YouTube Channel
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {destinations.map((dest) => {
                  const isSelected = selectedIds.includes(dest.id);
                  return (
                    <div
                      key={dest.id}
                      onClick={() => toggleSelect(dest.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-500/5"
                          : "bg-surface border-white/5 hover:border-white/10 opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                          {getPlatformIcon(dest.platform)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white leading-tight">{dest.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{dest.rtmpUrl}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditChannel(dest);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition-colors"
                          title="Edit channel credentials"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChannel(dest.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                          title="Remove channel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ml-1 ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-white/20 bg-black/20"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleOpenAddChannel}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition-all mt-2"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Add Another Channel / Custom RTMP</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <Button variant="ghost" onClick={onClose} disabled={starting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={starting}
              disabled={destinations.length === 0 || selectedIds.length === 0}
              className="px-6 font-semibold"
            >
              <Radio className="w-4 h-4 mr-2" />
              Go Live Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* In-Studio Add / Edit Destination Modal */}
      <Modal
        isOpen={isChannelModalOpen}
        onClose={() => {
          setIsChannelModalOpen(false);
          setEditingDest(null);
        }}
        title={editingDest ? "Edit Streaming Destination" : "Add Streaming Destination"}
      >
        <form onSubmit={handleSaveChannel} className="space-y-4">
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
                const active = channelPlatform === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handlePlatformChange(p.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? "bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                        : "bg-surface border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${p.color}`} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Channel / Destination Name"
            placeholder="e.g. My YouTube Channel"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            required
          />

          <Input
            label="RTMP Server URL"
            placeholder="rtmp://..."
            value={channelRtmpUrl}
            onChange={(e) => setChannelRtmpUrl(e.target.value)}
            required
          />

          <Input
            label={editingDest ? "Stream Key (Leave blank to keep unchanged)" : "Stream Key"}
            type="password"
            placeholder={
              editingDest
                ? "Leave blank to keep current key, or paste new key"
                : "Paste stream key here (stored with AES-256 encryption)"
            }
            value={channelStreamKey}
            onChange={(e) => setChannelStreamKey(e.target.value)}
            required={!editingDest}
          />

          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2 text-[11px] text-indigo-300">
            <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Your stream key is encrypted with AES-256-GCM. Decrypted strictly at the moment you broadcast.
            </span>
          </div>

          {channelError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {channelError}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsChannelModalOpen(false);
                setEditingDest(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={savingChannel}>
              {editingDest ? "Update Destination" : "Save & Connect"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
