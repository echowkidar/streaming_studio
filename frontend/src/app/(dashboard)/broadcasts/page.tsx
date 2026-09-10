"use client";

import { useState } from "react";
import Link from "next/link";
import { Radio, Calendar, Play, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";

export default function BroadcastsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const broadcasts = [
    {
      id: "b-1",
      title: "Global Product Launch Keynote 2026",
      status: "LIVE",
      studioName: "Main Keynote Studio",
      startedAt: "Started 42 mins ago",
      duration: "00:42:15",
      viewers: 1420,
      destinations: ["YouTube", "Twitch", "Custom RTMP"],
    },
    {
      id: "b-2",
      title: "Q3 Community AMA & Developer Roadmap",
      status: "SCHEDULED",
      studioName: "Community AMA Studio",
      scheduledFor: "Tomorrow, 4:00 PM UTC",
      duration: "Scheduled (60m)",
      viewers: 0,
      destinations: ["YouTube", "Facebook"],
    },
    {
      id: "b-3",
      title: "Deep Dive: Microservices Architecture with Rust",
      status: "ENDED",
      studioName: "Main Keynote Studio",
      endedAt: "Yesterday at 6:30 PM",
      duration: "01:14:20",
      viewers: 3280,
      destinations: ["YouTube", "Twitch", "LinkedIn"],
    },
    {
      id: "b-4",
      title: "Design System & UI Components Review",
      status: "RECORDING",
      studioName: "Weekly Video Podcast",
      startedAt: "Started 15 mins ago",
      duration: "00:15:00",
      viewers: 0,
      destinations: ["Local Cloud Recording"],
    }
  ];

  const filteredBroadcasts = broadcasts.filter((b) => {
    if (activeTab === "live") return b.status === "LIVE" || b.status === "RECORDING";
    if (activeTab === "scheduled") return b.status === "SCHEDULED";
    if (activeTab === "ended") return b.status === "ENDED";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Broadcasts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track active live streams, view scheduled events, and review previous broadcast archives.
          </p>
        </div>
        <Link href="/studio/studio-main">
          <Button variant="primary">
            <Radio className="w-4 h-4 mr-2" />
            Go Live Now
          </Button>
        </Link>
      </div>

      <Tabs
        tabs={[
          { id: "all", label: "All Broadcasts", count: broadcasts.length },
          { id: "live", label: "Live & Recording", count: 2 },
          { id: "scheduled", label: "Upcoming", count: 1 },
          { id: "ended", label: "Past / Ended", count: 1 },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="rounded-2xl border border-white/5 bg-surface-raised/50 overflow-hidden backdrop-blur-md">
        <div className="divide-y divide-white/5">
          {filteredBroadcasts.map((b) => (
            <div
              key={b.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-surface border border-white/5 text-indigo-400 shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-white">{b.title}</h3>
                    {b.status === "LIVE" && <Badge variant="live">LIVE</Badge>}
                    {b.status === "RECORDING" && <Badge variant="recording">RECORDING</Badge>}
                    {b.status === "SCHEDULED" && <Badge variant="warning">SCHEDULED</Badge>}
                    {b.status === "ENDED" && <Badge variant="neutral">ENDED</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>{b.studioName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {b.status === "SCHEDULED" ? b.scheduledFor : b.duration}
                    </span>
                    <span>•</span>
                    <span className="text-slate-300">
                      Destinations: {b.destinations.join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                {b.status === "LIVE" || b.status === "RECORDING" ? (
                  <Link href={`/studio/studio-main`}>
                    <Button variant="primary" size="sm">
                      Enter Studio
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
