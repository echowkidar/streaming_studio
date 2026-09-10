"use client";

import { useState } from "react";
import Link from "next/link";
import { Video, Plus, Settings2, Users, Layout, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function StudiosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudioName, setNewStudioName] = useState("");
  const [studios, setStudios] = useState([
    {
      id: "studio-main",
      name: "Main Keynote & Townhall Studio",
      description: "Default studio configured for 1080p60 production with multi-guest layout.",
      layout: "Speaker + Large Grid",
      activeBroadcasts: 1,
      membersCount: 4,
      updatedAt: "10 mins ago",
      isDefault: true,
    },
    {
      id: "studio-podcast",
      name: "Weekly Video Podcast",
      description: "Optimized side-by-side layout with lower-third templates and intro clips.",
      layout: "Podcast Split Screen",
      activeBroadcasts: 0,
      membersCount: 2,
      updatedAt: "2 days ago",
      isDefault: false,
    },
    {
      id: "studio-qna",
      name: "Community AMA & Live Q&A",
      description: "Screen share + unified social chat overlay for viewer engagement.",
      layout: "Presentation + Chat",
      activeBroadcasts: 0,
      membersCount: 3,
      updatedAt: "5 days ago",
      isDefault: false,
    },
  ]);

  const handleCreateStudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudioName.trim()) return;
    setStudios([
      ...studios,
      {
        id: `studio-${Date.now()}`,
        name: newStudioName,
        description: "Custom reusable production studio.",
        layout: "Two Equal Participants",
        activeBroadcasts: 0,
        membersCount: 1,
        updatedAt: "Just now",
        isDefault: false,
      },
    ]);
    setNewStudioName("");
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reusable Studios</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create and manage persistent studio setups with pre-configured layouts, branding, and destinations.
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
                {studio.activeBroadcasts > 0 ? (
                  <Badge variant="live">LIVE</Badge>
                ) : studio.isDefault ? (
                  <Badge variant="purple">DEFAULT</Badge>
                ) : (
                  <Badge variant="neutral">READY</Badge>
                )}
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
        description="Set up a new broadcast stage with customizable branding, participants, and layouts."
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
