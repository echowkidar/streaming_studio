"use client";

import { BarChart3, TrendingUp, Users, Clock, Radio, Eye, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function AnalyticsPage() {
  const metrics = [
    { label: "Total Peak Viewers", value: "14,892", change: "+24.5%", icon: Eye, color: "text-indigo-400" },
    { label: "Total Stream Hours", value: "84.2 hrs", change: "+12.1%", icon: Clock, color: "text-cyan-400" },
    { label: "Chat Messages Shared", value: "3,410", change: "+48.0%", icon: Users, color: "text-emerald-400" },
    { label: "Average Retention", value: "72.4%", change: "+5.3%", icon: Award, color: "text-purple-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Stream Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Detailed metrics on viewer engagement, stream stability, platform breakdown, and retention.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">{m.label}</span>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{m.value}</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              {m.change} vs last month
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle>Concurrent Viewers by Platform</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {[
              { platform: "YouTube Live", viewers: "8,410", percentage: "58%", color: "bg-rose-500" },
              { platform: "Twitch", viewers: "4,220", percentage: "28%", color: "bg-purple-500" },
              { platform: "Custom RTMP CDN", viewers: "1,540", percentage: "10%", color: "bg-cyan-500" },
              { platform: "Embedded Webinar", viewers: "722", percentage: "4%", color: "bg-indigo-500" },
            ].map((p, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{p.platform}</span>
                  <span className="text-white font-mono">{p.viewers} ({p.percentage})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full ${p.color}`} style={{ width: p.percentage }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle>Stream Health & Frame Delivery</CardTitle>
          </CardHeader>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-surface border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Encoder Output</span>
                <div className="text-sm font-semibold text-white mt-0.5">1080p @ 60 FPS • 6,500 kbps</div>
              </div>
              <Badge variant="success">OPTIMAL</Badge>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Dropped Frames (Network)</span>
                <div className="text-sm font-semibold text-white mt-0.5">0.02% (12 frames in 2 hrs)</div>
              </div>
              <Badge variant="success">99.98% HEALTH</Badge>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-slate-400">WebRTC SFU Latency</span>
                <div className="text-sm font-semibold text-white mt-0.5">142 ms Average RTT</div>
              </div>
              <Badge variant="neutral">SUB-SECOND</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
