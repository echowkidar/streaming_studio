"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  LayoutGrid,
  MessageSquare,
  Palette,
  PlaySquare,
  Settings2,
  CircleDot,
  PhoneOff,
  Users,
  Radio,
  Share2,
  MoreVertical,
  Plus,
  ArrowLeft,
  Volume2,
  Shield,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useStudioStore } from "@/stores/studio.store";
import { StagePreview } from "@/components/studio/StagePreview";
import { LayoutSelector } from "@/components/studio/LayoutSelector";
import { ChatPanel } from "@/components/studio/ChatPanel";
import { BrandPanel } from "@/components/studio/BrandPanel";
import { MediaPanel } from "@/components/studio/MediaPanel";
import { DeviceSettingsModal } from "@/components/studio/DeviceSettingsModal";
import { LocalRecordingManager } from "@/components/studio/LocalRecordingManager";
import { PreRecordedSchedulerModal } from "@/components/studio/PreRecordedSchedulerModal";
import { HardDrive, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit";
import { useAuthStore } from "@/stores/auth.store";

export default function StudioPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const hostName = user?.name || "Host";

  const {
    isConnected,
    isConnecting,
    error: livekitError,
    camEnabled: lkCam,
    micEnabled: lkMic,
    screenEnabled: lkScreen,
    liveParticipants,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
  } = useLiveKit({
    roomName: `studio-${params.id}`,
    participantName: hostName,
    role: "HOST",
    autoConnect: true,
  });

  const {
    broadcastTitle,
    setTitle,
    isLive,
    startLive,
    endLive,
    isRecording,
    startRecord,
    stopRecord,
    viewerCount,
    participants,
    moveToStage,
    moveToBackstage,
    removeParticipant,
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<"chat" | "brand" | "media" | "layout" | null>("chat");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIsoModalOpen, setIsIsoModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync LiveKit participants to studio store
  useEffect(() => {
    if (liveParticipants.length > 0) {
      useStudioStore.getState().setParticipants(liveParticipants);
    }
  }, [liveParticipants]);

  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");
  const backstageParticipants = participants.filter((p) => p.status === "BACKSTAGE");
  const greenRoomParticipants = participants.filter((p) => p.status === "GREEN_ROOM");

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/join/studio-${params.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#07070b] overflow-hidden text-slate-200 select-none">
      {/* ─── Top Bar ────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0c0c14]/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none px-1 py-0.5 max-w-[240px] truncate"
            />
            {isLive ? (
              <Badge variant="live" size="sm">LIVE</Badge>
            ) : (
              <Badge variant="neutral" size="sm">STUDIO READY</Badge>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 pl-2 border-l border-white/10">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              {isLive ? `${viewerCount.toLocaleString()} Viewers` : `${participants.length} in Studio`}
            </span>
            <span>•</span>
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LiveKit Connected
              </span>
            ) : isConnecting ? (
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Connecting WebRTC...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400" title={livekitError || undefined}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {livekitError ? "Connection Error" : "Offline"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pre-record Live Stream Scheduler Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSchedulerOpen(true)}
            className="h-8 rounded-full text-xs text-slate-300 hidden sm:flex items-center"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Pre-record
          </Button>

          {/* Local Participant ISO Recording Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsIsoModalOpen(true)}
            className="h-8 rounded-full text-xs font-medium"
          >
            <HardDrive className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            ISO Tracks
          </Button>

          {/* Cloud Record Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (isRecording ? stopRecord() : startRecord())}
            className={cn("h-8 rounded-full text-xs font-medium transition-all", isRecording && "text-rose-400 border-rose-500/40 bg-rose-500/10")}
          >
            <CircleDot className={cn("w-3.5 h-3.5 mr-1.5", isRecording && "animate-pulse fill-rose-500")} />
            {isRecording ? "REC 00:14:32" : "Record"}
          </Button>


          {/* Go Live Button */}
          <Button
            variant={isLive ? "danger" : "primary"}
            size="sm"
            onClick={() => (isLive ? endLive() : startLive())}
            className={cn("h-8 px-5 rounded-full font-bold text-xs tracking-wider", !isLive && "shadow-lg shadow-indigo-500/20")}
          >
            {isLive ? (
              "END BROADCAST"
            ) : (
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                GO LIVE
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* ─── Main Workspace ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Icon Bar */}
        <div className="w-14 border-r border-white/5 bg-[#090910] flex flex-col items-center py-3 gap-2 z-20 shrink-0">
          {[
            { id: "chat" as const, icon: MessageSquare, label: "Chat" },
            { id: "brand" as const, icon: Palette, label: "Brand" },
            { id: "media" as const, icon: PlaySquare, label: "Media" },
            { id: "layout" as const, icon: LayoutGrid, label: "Layout" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(isActive ? null : tab.id)}
                className={cn(
                  "w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all group relative",
                  isActive
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-md shadow-indigo-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
                title={tab.label}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[8px] mt-0.5 font-medium">{tab.label}</span>
              </button>
            );
          })}

          <div className="mt-auto">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              title="Studio Settings"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-[8px] mt-0.5">Setup</span>
            </button>
          </div>
        </div>

        {/* Tab Slide-Out Drawer Panel */}
        <AnimatePresence>
          {activeTab && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="border-r border-white/5 bg-[#0b0b12] overflow-hidden flex flex-col z-10 shrink-0 shadow-2xl"
            >
              {activeTab === "chat" && <ChatPanel />}
              {activeTab === "brand" && <BrandPanel />}
              {activeTab === "media" && <MediaPanel />}
              {activeTab === "layout" && (
                <div className="p-4 h-full overflow-y-auto custom-scrollbar">
                  <LayoutSelector />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Main Stage + Bottom Control Bar */}
        <div className="flex-1 flex flex-col bg-[#050508] p-3 overflow-hidden min-w-0">
          {/* Video Stage Canvas */}
          <div className="flex-1 min-h-0 relative">
            <StagePreview />
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="h-16 mt-3 rounded-2xl bg-[#0c0c14]/95 border border-white/10 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 shadow-2xl">
            {/* Device Toggles */}
            <div className="flex items-center gap-2">
              <Button
                variant={lkMic ? "secondary" : "danger"}
                size="sm"
                onClick={toggleMicrophone}
                className="h-10 px-3.5 rounded-xl font-medium"
              >
                {lkMic ? <Mic className="w-4 h-4 mr-2 text-emerald-400" /> : <MicOff className="w-4 h-4 mr-2" />}
                {lkMic ? "Mute" : "Unmute"}
              </Button>

              <Button
                variant={lkCam ? "secondary" : "danger"}
                size="sm"
                onClick={toggleCamera}
                className="h-10 px-3.5 rounded-xl font-medium"
              >
                {lkCam ? <Video className="w-4 h-4 mr-2 text-indigo-400" /> : <VideoOff className="w-4 h-4 mr-2" />}
                {lkCam ? "Stop Cam" : "Start Cam"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={toggleScreenShare}
                className={cn("h-10 px-3.5 rounded-xl font-medium transition-all", lkScreen && "border-indigo-500 bg-indigo-500/20 text-indigo-300")}
              >
                <MonitorUp className="w-4 h-4 mr-2" />
                {lkScreen ? "Stop Sharing" : "Share Screen"}
              </Button>
            </div>

            {/* Quick Layout & Settings */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(activeTab === "layout" ? null : "layout")}
                className="h-10 rounded-xl text-xs text-slate-300"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Layouts
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="h-10 rounded-xl text-xs text-slate-300"
              >
                <Settings2 className="w-4 h-4 mr-1.5" />
                Cam/Mic Test
              </Button>

              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <PhoneOff className="w-4 h-4 mr-1.5" />
                  Exit
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Right Sidebar: Participants & Green Room ───────── */}
        <div className="w-72 border-l border-white/5 bg-[#0a0a10] flex flex-col z-20 shrink-0">
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Participants ({participants.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={handleCopyInvite} className="h-7 text-xs text-indigo-400 hover:text-indigo-300">
              <Share2 className="w-3 h-3 mr-1" />
              {copiedLink ? "Copied!" : "Invite"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {/* Section: On Stage */}
            <div>
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>On Stage ({onStageParticipants.length})</span>
              </div>
              <div className="space-y-1.5">
                {onStageParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 rounded-xl bg-surface border border-white/5 flex items-center justify-between group hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {p.isScreen ? <MonitorUp className="w-4 h-4" /> : p.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{p.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {p.micOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                      <button
                        onClick={() => moveToBackstage(p.id)}
                        className="text-[10px] font-semibold text-slate-400 hover:text-rose-400 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
                        title="Remove to backstage"
                      >
                        Down
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Backstage */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Backstage ({backstageParticipants.length})
              </div>
              <div className="space-y-1.5">
                {backstageParticipants.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No one backstage</p>
                ) : (
                  backstageParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-surface/50 border border-white/5 flex items-center justify-between group hover:border-white/10"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {p.name[0]}
                        </div>
                        <span className="text-xs text-slate-300 truncate">{p.name}</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => moveToStage(p.id)}
                      >
                        Add to Stage
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section: Green Room */}
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Green Room ({greenRoomParticipants.length})</span>
                <span className="text-[9px] text-slate-500">Device Checks</span>
              </div>
              <div className="space-y-1.5">
                {greenRoomParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {p.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{p.name}</div>
                        <div className="text-[9px] text-emerald-400">Ready to admit</div>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => moveToStage(p.id)}
                    >
                      Admit
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Device Settings Modal */}
      <DeviceSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Local Participant ISO Recording Manager Modal */}
      <LocalRecordingManager isOpen={isIsoModalOpen} onClose={() => setIsIsoModalOpen(false)} />

      {/* Pre-recorded Live Broadcast Scheduler Modal */}
      <PreRecordedSchedulerModal isOpen={isSchedulerOpen} onClose={() => setIsSchedulerOpen(false)} />
    </div>
  );
}

