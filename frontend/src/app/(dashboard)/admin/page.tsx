"use client";

import { Shield, Server, Cpu, HardDrive, Database, Activity, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function AdminPage() {
  const containers = [
    { name: "livestudio-frontend", status: "HEALTHY", port: "3000", uptime: "4 days, 12 hrs", memory: "128 MB" },
    { name: "livestudio-api", status: "HEALTHY", port: "4000", uptime: "4 days, 12 hrs", memory: "214 MB" },
    { name: "livestudio-websocket", status: "HEALTHY", port: "4001", uptime: "4 days, 12 hrs", memory: "86 MB" },
    { name: "livestudio-worker", status: "HEALTHY", port: "-", uptime: "4 days, 12 hrs", memory: "310 MB" },
    { name: "livestudio-postgres", status: "HEALTHY", port: "5432", uptime: "18 days", memory: "195 MB" },
    { name: "livestudio-redis", status: "HEALTHY", port: "6379", uptime: "18 days", memory: "42 MB" },
    { name: "livestudio-minio", status: "HEALTHY", port: "9000/9001", uptime: "18 days", memory: "160 MB" },
    { name: "livestudio-livekit", status: "HEALTHY", port: "7880/7881", uptime: "18 days", memory: "180 MB" },
    { name: "livestudio-coturn", status: "HEALTHY", port: "3478/5349", uptime: "18 days", memory: "35 MB" },
    { name: "livestudio-nginx", status: "HEALTHY", port: "80/443", uptime: "18 days", memory: "24 MB" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">System Administration</h1>
            <Badge variant="purple" size="sm">SUPER ADMIN</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Global server health, Docker container status, resource telemetry, and active WebRTC rooms.
          </p>
        </div>
        <Button variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Metrics
        </Button>
      </div>

      {/* Host Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">Host CPU Load</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">14.2%</div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: "14.2%" }} />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">8 Cores @ 3.4 GHz</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">System Memory</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">5.8 GB / 32 GB</div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: "18.1%" }} />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">26.2 GB Available RAM</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">NVMe Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">142 GB / 1000 GB</div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "14.2%" }} />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">MinIO S3 Root Volume</span>
        </Card>
      </div>

      {/* Docker Stack Health */}
      <Card className="p-6">
        <CardHeader className="p-0 mb-4 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            Portainer / Docker Services (10 Containers)
          </CardTitle>
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> All Services Operational
          </span>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400">
                <th className="py-3 px-4 font-semibold">Service Container</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Ports</th>
                <th className="py-3 px-4 font-semibold">Memory</th>
                <th className="py-3 px-4 font-semibold">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {containers.map((c, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] text-slate-300">
                  <td className="py-3 px-4 font-mono font-medium text-white">{c.name}</td>
                  <td className="py-3 px-4">
                    <Badge variant="success" size="sm">{c.status}</Badge>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{c.port}</td>
                  <td className="py-3 px-4 font-mono">{c.memory}</td>
                  <td className="py-3 px-4 text-slate-400">{c.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
