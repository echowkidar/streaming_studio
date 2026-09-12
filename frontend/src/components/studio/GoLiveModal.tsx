"use client";

import { useState, useEffect } from "react";
import { Radio, Youtube, Twitch, Facebook, Globe, Check, AlertCircle, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface Destination {
  id: string;
  name: string;
  platform: string;
  rtmpUrl: string;
  streamKey: string;
  status: string;
}

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
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDestinations();
    }
  }, [isOpen]);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/destinations");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDestinations(json.data);
        // By default select all active destinations
        setSelectedIds(json.data.map((d: Destination) => d.id));
      }
    } catch (e) {
      console.error("Failed to load destinations:", e);
    } finally {
      setLoading(false);
    }
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Streaming Destinations
          </label>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading destinations...</div>
          ) : destinations.length === 0 ? (
            <div className="p-5 rounded-xl border border-dashed border-white/10 text-center space-y-3 bg-black/20">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <div>
                <p className="text-xs font-medium text-white">No Destinations Connected</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You need to add a YouTube or RTMP destination first.
                </p>
              </div>
              <Link href="/destinations" target="_blank">
                <Button variant="secondary" size="sm" className="text-xs mt-1">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Destination
                </Button>
              </Link>
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

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-white/20 bg-black/20"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
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
  );
}
