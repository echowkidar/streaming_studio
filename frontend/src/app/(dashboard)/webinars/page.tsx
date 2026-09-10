"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus, Calendar, ExternalLink, Globe, Copy, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { WebinarEmbedModal } from "@/components/webinar/WebinarEmbedModal";

export default function WebinarsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [embedWebinar, setEmbedWebinar] = useState<{ id: string; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const webinars = [
    {
      id: "webinar-101",
      title: "Mastering Browser-Based Live Production with WebRTC",
      description: "Comprehensive walkthrough of high-definition multi-guest streaming with local recordings.",
      scheduledAt: "Sep 15, 2026 • 2:00 PM UTC",
      duration: "60 mins",
      registrants: 428,
      status: "SCHEDULED",
    },
    {
      id: "webinar-102",
      title: "Enterprise Video Architecture & Portainer Deployment",
      description: "How to deploy LiveStudio in private cloud infrastructure with SSL and MinIO.",
      scheduledAt: "Sep 22, 2026 • 5:00 PM UTC",
      duration: "45 mins",
      registrants: 215,
      status: "SCHEDULED",
    }
  ];

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(`https://studio.example.com/watch/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Interactive Webinars</h1>
          <p className="text-sm text-slate-400 mt-1">
            Host branded webinars, collect custom registrations, and stream to embedded or standalone watch pages.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Webinar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {webinars.map((w) => (
          <Card key={w.id} hoverEffect className="space-y-4">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="warning">SCHEDULED</Badge>
                <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {w.registrants} Registrants
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">{w.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{w.description}</p>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-white/5 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {w.scheduledAt}
                </span>
                <span className="font-mono text-slate-400">{w.duration}</span>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  onClick={() => setEmbedWebinar({ id: w.id, title: w.title })}
                >
                  <Code2 className="w-3.5 h-3.5 mr-1" />
                  Embed Code
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleCopy(w.id)}
                  >
                    {copiedId === w.id ? (
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {copiedId === w.id ? "Copied!" : "Copy Link"}
                  </Button>

                  <Link href={`/watch/${w.id}`} target="_blank">
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-400">
                      Preview
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Webinar"
        description="Configure your webinar title, schedule, registration fields, and email alerts."
      >
        <div className="space-y-4">
          <Input label="Webinar Title" placeholder="e.g. Next-Gen Cloud Architecture" required />
          <Input label="Description" placeholder="What attendees will learn..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" required />
            <Input label="Time" type="time" required />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Save Webinar
            </Button>
          </div>
        </div>
      </Modal>


      {embedWebinar && (
        <WebinarEmbedModal
          isOpen={!!embedWebinar}
          onClose={() => setEmbedWebinar(null)}
          webinarId={embedWebinar.id}
          webinarTitle={embedWebinar.title}
        />
      )}
    </div>
  );
}

