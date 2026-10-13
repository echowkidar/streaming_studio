"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Plus, Settings2, Users, Layout, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth.store";
import { apiRequest } from "@/lib/api";

interface StudioCardItem {
  id: string;
  name: string;
  description: string;
  layout: string;
  defaultLayout?: string;
  activeBroadcasts: number;
  membersCount: number;
  updatedAt: string;
  isDefault: boolean;
}

export default function StudiosPage() {
  const { user } = useAuthStore();
  const userSlug = user?.name
    ? user.name.toLowerCase().replace(/[^a-z0-9]/g, "")
    : user?.email
    ? user.email.split("@")[0].replace(/[^a-z0-9]/g, "")
    : "live";

  const storageKey = `livestudio_user_studios_${userSlug}`;

  const defaultStudios: StudioCardItem[] = [
    {
      id: `studio-${userSlug}-main`,
      name: "Main Keynote & Townhall Studio",
      description: "Default studio configured for 1080p60 production with multi-guest layout.",
      layout: "Speaker + Large Grid",
      defaultLayout: "speaker-large",
      activeBroadcasts: 1,
      membersCount: 4,
      updatedAt: "Active now",
      isDefault: true,
    },
    {
      id: `studio-${userSlug}-podcast`,
      name: "Weekly Video Podcast",
      description: "Optimized side-by-side layout with lower-third templates and intro clips.",
      layout: "Podcast Split Screen",
      defaultLayout: "cropped",
      activeBroadcasts: 0,
      membersCount: 2,
      updatedAt: "Ready",
      isDefault: false,
    },
    {
      id: `studio-${userSlug}-qna`,
      name: "Community AMA & Live Q&A",
      description: "Screen share + unified social chat overlay for viewer engagement.",
      layout: "Presentation + Chat",
      defaultLayout: "presentation",
      activeBroadcasts: 0,
      membersCount: 3,
      updatedAt: "Ready",
      isDefault: false,
    },
  ];

  const [studios, setStudios] = useState<StudioCardItem[]>(defaultStudios);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudioName, setNewStudioName] = useState("");
  const [newStudioDesc, setNewStudioDesc] = useState("");
  const [newStudioLayout, setNewStudioLayout] = useState<string>("side-by-side");

  // Load persisted studios from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStudios(parsed);
          return;
        }
      }
    } catch {}
    // First run fallback: persist default presets
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaultStudios));
    } catch {}
  }, [storageKey]);

  const saveStudios = (updatedList: StudioCardItem[]) => {
    setStudios(updatedList);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedList));
      } catch (err) {
        console.warn("Failed to persist studios:", err);
      }
    }
  };

  const handleCreateStudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudioName.trim()) return;

    const newId = `studio-${userSlug}-${Date.now().toString(36)}`;
    const layoutLabel =
      newStudioLayout === "solo"
        ? "Solo Host"
        : newStudioLayout === "cropped"
        ? "Podcast Split Screen"
        : newStudioLayout === "presentation"
        ? "Presentation + Screen"
        : "Two Equal Participants";

    const newStudio: StudioCardItem = {
      id: newId,
      name: newStudioName.trim(),
      description: newStudioDesc.trim() || "Custom reusable production studio stage.",
      layout: layoutLabel,
      defaultLayout: newStudioLayout,
      activeBroadcasts: 0,
      membersCount: 1,
      updatedAt: "Just created",
      isDefault: false,
    };

    // Pre-initialize isolated storage for this studio
    if (typeof window !== "undefined") {
      try {
        const studioStorageKey = `livestudio_studio_${newId}`;
        const initialStudioState = {
          broadcastTitle: newStudio.name,
          activeLayout: newStudioLayout,
          layoutSplitRatio: 50,
          scenes: [
            {
              id: `scene-host-${newId}`,
              name: "Host Intro",
              layout: "solo",
              splitRatio: 50,
              thumbnailColor: "#6366f1",
            },
            {
              id: `scene-main-${newId}`,
              name: "Stage Main",
              layout: newStudioLayout,
              splitRatio: 50,
              thumbnailColor: "#10b981",
            },
            {
              id: `scene-screen-${newId}`,
              name: "Slides & Share",
              layout: "presentation",
              splitRatio: 65,
              thumbnailColor: "#06b6d4",
            },
          ],
          activeSceneId: `scene-main-${newId}`,
        };
        localStorage.setItem(studioStorageKey, JSON.stringify(initialStudioState));
      } catch {}
    }

    // Try backend sync non-blockingly
    apiRequest("/api/studios", {
      method: "POST",
      data: {
        name: newStudio.name,
        description: newStudio.description,
        defaultLayout: newStudioLayout,
      },
    }).catch(() => {});

    saveStudios([...studios, newStudio]);
    setNewStudioName("");
    setNewStudioDesc("");
    setNewStudioLayout("side-by-side");
    setIsModalOpen(false);
  };

  const handleDeleteStudio = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will remove its saved scenes and layouts.`)) {
      const next = studios.filter((s) => s.id !== id);
      saveStudios(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`livestudio_studio_${id}`);
        } catch {}
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reusable Studios</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create and manage persistent studio setups with isolated layouts, branding, and stage scenes.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Studio
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studios.map((studio) => (
          <Card key={studio.id} hoverEffect className="flex flex-col justify-between group">
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5">
                  {studio.activeBroadcasts > 0 ? (
                    <Badge variant="live">LIVE</Badge>
                  ) : studio.isDefault ? (
                    <Badge variant="purple">DEFAULT</Badge>
                  ) : (
                    <Badge variant="neutral">READY</Badge>
                  )}
                  {!studio.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteStudio(studio.id, studio.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                      title="Delete Studio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {studio.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {studio.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Layout className="w-3.5 h-3.5" /> Layout</span>
                  <span className="text-slate-200 font-medium">{studio.layout}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Team Access</span>
                  <span className="text-slate-200 font-medium">{studio.membersCount} producers</span>
                </div>
              </div>
            </CardContent>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">Active {studio.updatedAt}</span>
              <div className="flex items-center gap-2">
                <Link href={`/studio/${studio.id}`}>
                  <Button variant="primary" size="sm">
                    Enter Studio
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Studio"
        description="Set up an independent broadcast stage with its own isolated scenes, layouts, and branding."
      >
        <form onSubmit={handleCreateStudio} className="space-y-4">
          <Input
            label="Studio Name"
            placeholder="e.g. Weekly Tech Roundup, Investor Updates"
            value={newStudioName}
            onChange={(e) => setNewStudioName(e.target.value)}
            autoFocus
            required
          />

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Dedicated interview stage with side-by-side branding"
              value={newStudioDesc}
              onChange={(e) => setNewStudioDesc(e.target.value)}
              className="w-full bg-[#161726] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Initial Default Layout
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "side-by-side", label: "Side-by-Side (Fit)" },
                { id: "cropped", label: "Podcast Split (Cropped)" },
                { id: "presentation", label: "Presentation + Screen" },
                { id: "solo", label: "Solo Keynote" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNewStudioLayout(opt.id)}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                    newStudioLayout === opt.id
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Studio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
