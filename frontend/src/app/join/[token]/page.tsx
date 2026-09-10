"use client";

import React, { useState } from "react";
import { Mic, MicOff, Video, VideoOff, Volume2, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function GuestJoinPage({ params }: { params: { token: string } }) {
  const [displayName, setDisplayName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [step, setStep] = useState<"setup" | "waiting">("setup");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setStep("waiting");
  };

  return (
    <div className="min-h-screen w-screen bg-[#07070b] flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            LiveStudio Green Room
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Guest Studio Check-In
          </h1>
          <p className="text-xs text-slate-400">
            You've been invited as a guest speaker. Test your hardware before joining the stage.
          </p>
        </div>

        {step === "setup" ? (
          <div className="rounded-2xl border border-white/10 bg-[#0e0e17]/80 backdrop-blur-xl p-6 shadow-2xl space-y-6">
            {/* Video Preview Box */}
            <div className="aspect-video w-full rounded-xl bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
              {camOn ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/40 via-slate-900 to-black">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-2xl font-bold border border-white/10 shadow-xl">
                    {displayName ? displayName[0].toUpperCase() : "G"}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <VideoOff className="w-8 h-8" />
                  <span className="text-xs">Camera is paused</span>
                </div>
              )}

              {/* Floating Camera / Mic Toggles */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 z-10">
                <Button
                  variant={micOn ? "secondary" : "danger"}
                  size="icon"
                  className="rounded-full shadow-lg"
                  onClick={() => setMicOn(!micOn)}
                >
                  {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant={camOn ? "secondary" : "danger"}
                  size="icon"
                  className="rounded-full shadow-lg"
                  onClick={() => setCamOn(!camOn)}
                >
                  {camOn ? <Video className="w-4 h-4 text-indigo-400" /> : <VideoOff className="w-4 h-4" />}
                </Button>
              </div>

              <div className="absolute top-3 left-3">
                <Badge variant="neutral" size="sm" className="bg-black/60">
                  1080p WebRTC
                </Badge>
              </div>
            </div>

            {/* Mic Meter Simulation */}
            <div className="p-3 rounded-xl bg-surface border border-white/5 flex items-center gap-3">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 shrink-0">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Audio Level:
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden flex gap-0.5 p-0.5">
                <div className="h-full w-1/3 bg-emerald-500 rounded-xs" />
                <div className="h-full w-1/4 bg-emerald-500 rounded-xs" />
                <div className="h-full w-1/6 bg-amber-500 rounded-xs animate-pulse" />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                label="Your Display Name"
                placeholder="e.g. Dr. Jane Doe (Keynote Speaker)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
              />

              <Button variant="primary" size="lg" className="w-full">
                Enter Green Room
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0e0e17]/80 backdrop-blur-xl p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">You're in the Green Room!</h2>
              <p className="text-xs text-slate-400">
                Welcome, <span className="text-white font-semibold">{displayName}</span>. The studio host and producer have been notified that you are ready.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/5 text-xs text-slate-300 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span>Microphone Status:</span>
                <span className="text-emerald-400 font-semibold">{micOn ? "Active & Tested" : "Muted"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Camera Stream:</span>
                <span className="text-indigo-400 font-semibold">{camOn ? "Connected" : "Paused"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audio Latency:</span>
                <span className="text-slate-400 font-mono">118 ms (Sub-second)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Please keep this tab open. Your camera will appear live on stage once admitted by the producer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
