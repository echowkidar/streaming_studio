"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Layers,
  X,
  RefreshCw,
  PictureInPicture
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
import { GoLiveModal } from "@/components/studio/GoLiveModal";
import { HardDrive, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit";
import { useAuthStore } from "@/stores/auth.store";

export default function StudioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const hostName = user?.name || "Host";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const cleanStudioId = params.id.replace(/^studio-/, "");
  const roomName = `studio-${cleanStudioId}`;
  const {
    room,
    isConnected,
    isConnecting,
    error: livekitError,
    liveParticipants,
    micEnabled: lkMic,
    cameraEnabled: lkCam,
    screenEnabled: lkScreen,
    toggleMicrophone,
    toggleCamera,
    flipCamera,
    toggleScreenShare,
    setAudioDevice,
    setVideoDevice,
    publishStageSync,
  } = useLiveKit({
    roomName,
    participantName: hostName,
    role: "HOST",
    autoConnect: true,
  });

  const {
    broadcastTitle,
    setTitle,
    activeLayout,
    setLayout,
    layoutSplitRatio,
    participantBounds,
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

  const handleMoveToStage = (id: string | number) => {
    moveToStage(id);
    const nextOnStage = Array.from(
      new Set([...participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id), id])
    );
    publishStageSync(nextOnStage, activeLayout, layoutSplitRatio, participantBounds);
  };

  const handleMoveToBackstage = (id: string | number) => {
    moveToBackstage(id);
    const nextOnStage = participants
      .filter((p) => p.status === "ON_STAGE" && String(p.id) !== String(id))
      .map((p) => p.id);
    publishStageSync(nextOnStage, activeLayout, layoutSplitRatio, participantBounds);
  };

  // Sync layout and freeform bounds changes to all guests (debounced so mouse dragging never floods WebRTC channel)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const onStageIds = participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
        if (onStageIds.length > 0) {
          publishStageSync(onStageIds, activeLayout, layoutSplitRatio, participantBounds);
        }
      } catch (err) {
        console.warn("Stage sync broadcast error:", err);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [activeLayout, layoutSplitRatio, participantBounds]);

  const [activeTab, setActiveTab] = useState<"chat" | "brand" | "media" | "layout" | null>("chat");
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIsoModalOpen, setIsIsoModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState(false);
  const [liveDurationSec, setLiveDurationSec] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Check auth session safely without breaking browser history
  useEffect(() => {
    if (typeof window !== "undefined") {
      const authRaw = localStorage.getItem("livestudio_auth");
      if (!authRaw) {
        router.push("/login");
        return;
      }
      try {
        const parsed = JSON.parse(authRaw);
        if (!parsed?.state?.user && !parsed?.state?.token) {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    }
  }, [router]);

  // Live timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => setLiveDurationSec((s) => s + 1), 1000);
    } else {
      setLiveDurationSec(0);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Picture-in-Picture Floating Mini Studio
  const [isPiPActive, setIsPiPActive] = useState(false);

  const handleTogglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
        return;
      }

      const videos = Array.from(document.querySelectorAll("video"));
      const stageVideo = videos.find((v) => (v.srcObject || v.src) && v.videoWidth > 0) || videos[0];
      if (stageVideo && "requestPictureInPicture" in stageVideo) {
        await stageVideo.requestPictureInPicture();
        setIsPiPActive(true);
        stageVideo.addEventListener("leavepictureinpicture", () => setIsPiPActive(false), { once: true });
      } else {
        alert("Picture-in-Picture is not supported in this browser or no active video stream.");
      }
    } catch (err) {
      console.warn("PiP toggle error:", err);
    }
  };

  // Auto-switch to presentation layout when screen sharing starts
  useEffect(() => {
    if (lkScreen) {
      if (activeLayout === "four-grid" || activeLayout === "custom") {
        setLayout("presentation");
      }
    }
  }, [lkScreen]);

  const handleGoLive = async (destinationIds: string[]) => {
    try {
      await fetch(`/api/broadcasts/${params.id}/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationIds,
          roomName,
        }),
      });
      startLive();
    } catch (e) {
      console.error("Failed to start RTMP stream:", e);
      startLive();
    }
  };

  const handleEndBroadcast = async () => {
    if (!confirm("Are you sure you want to end this live broadcast?")) return;
    try {
      await fetch(`/api/broadcasts/${params.id}/stream/stop`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to stop stream:", e);
    } finally {
      endLive();
    }
  };

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
    const inviteUrl = `${window.location.origin}/join/${roomName}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const renderParticipantsList = () => (
    <>
      <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0c0c14]">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          Participants ({participants.length})
        </h3>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleCopyInvite} className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300">
            <Share2 className="w-3 h-3 mr-1" />
            {copiedLink ? "Copied!" : "Invite"}
          </Button>
          {isParticipantsOpen && (
            <button
              onClick={() => setIsParticipantsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
                    onClick={() => handleMoveToBackstage(p.id)}
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
                    onClick={() => handleMoveToStage(p.id)}
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
                  onClick={() => handleMoveToStage(p.id)}
                >
                  Admit
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#07070b] overflow-hidden text-slate-200 select-none">
      {/* ─── Top Bar ────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-3 sm:px-4 bg-[#0c0c14]/90 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none px-1 py-0.5 max-w-[100px] xs:max-w-[160px] sm:max-w-[220px] truncate"
            />
            {isLive ? (
              <Badge variant="live" size="sm" className="font-mono flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span className="hidden xs:inline">LIVE </span>{Math.floor(liveDurationSec / 60).toString().padStart(2, '0')}:{(liveDurationSec % 60).toString().padStart(2, '0')}
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm" className="shrink-0 text-[10px] sm:text-xs">READY</Badge>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 pl-2 border-l border-white/10 shrink-0">
            <button
              onClick={() => setIsParticipantsOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors"
              title="Click to view participants"
            >
              <Users className="w-3 h-3 text-slate-400" />
              {isLive ? `${viewerCount.toLocaleString()} Viewers` : `${participants.length} in Studio`}
            </button>
            <span>•</span>
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LiveKit Connected
              </span>
            ) : isConnecting ? (
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Connecting...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400" title={livekitError || undefined}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {livekitError ? "Connection Error" : "Offline"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Pre-record Live Stream Scheduler Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSchedulerOpen(true)}
            className="h-8 rounded-full text-xs text-slate-300 hidden md:flex items-center"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Pre-record
          </Button>

          {/* Local Participant ISO Recording Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsIsoModalOpen(true)}
            className="h-8 rounded-full text-xs font-medium hidden sm:flex items-center"
          >
            <HardDrive className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            ISO
          </Button>

          {/* Cloud Record Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (isRecording ? stopRecord() : startRecord())}
            className={cn("h-8 px-2.5 sm:px-3 rounded-full text-xs font-medium transition-all", isRecording && "text-rose-400 border-rose-500/40 bg-rose-500/10")}
          >
            <CircleDot className={cn("w-3.5 h-3.5 sm:mr-1.5", isRecording && "animate-pulse fill-rose-500")} />
            <span className="hidden sm:inline">{isRecording ? "REC 00:14:32" : "Record"}</span>
          </Button>

          {/* Mobile Participants Trigger Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className="h-8 px-2 rounded-xl text-slate-300 hover:text-white lg:hidden"
            title="Participants & Green Room"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="ml-1 text-[11px] font-bold text-indigo-300">{participants.length}</span>
          </Button>

          {/* Go Live Button */}
          <Button
            variant={isLive ? "danger" : "primary"}
            size="sm"
            onClick={() => (isLive ? handleEndBroadcast() : setIsGoLiveModalOpen(true))}
            className={cn("h-8 px-3 sm:px-5 rounded-full font-bold text-xs tracking-wider shrink-0", !isLive && "shadow-lg shadow-indigo-500/20")}
          >
            {isLive ? (
              "END"
            ) : (
              <span className="flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">GO </span>LIVE
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* ─── Main Workspace ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Vertical Icon Bar */}
        <div className="w-12 sm:w-14 border-r border-white/5 bg-[#090910] flex flex-col items-center py-2 sm:py-3 gap-1.5 sm:gap-2 z-30 shrink-0">
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

        {/* Tab Slide-Out Drawer Panel (Desktop Docked / Mobile Overlay) */}
        {activeTab && (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
            onClick={() => setActiveTab(null)}
          />
        )}

        <AnimatePresence>
          {activeTab && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={cn(
                "bg-[#0b0b12] overflow-hidden flex flex-col shadow-2xl shrink-0",
                // Desktop: Docked side-by-side
                "lg:relative lg:w-80 lg:border-r lg:border-white/5 lg:z-10",
                // Mobile: Slide-over overlay modal next to the 48/56px icon bar
                "fixed inset-y-0 left-12 sm:left-14 z-50 w-80 max-w-[calc(100vw-3.25rem)] border-r border-white/10"
              )}
            >
              {/* Mobile Close Bar */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 lg:hidden bg-[#090910] shrink-0">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {activeTab === "chat" && "Studio Chat"}
                  {activeTab === "brand" && "Brand Kit"}
                  {activeTab === "media" && "Media Library"}
                  {activeTab === "layout" && "Studio Layouts"}
                </span>
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  title="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

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
        <div className="flex-1 flex flex-col bg-[#050508] p-2 sm:p-3 overflow-hidden min-w-0">
          {/* Screen Share Active Notice / PiP helper banner */}
          {lkScreen && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 backdrop-blur-md flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 shrink-0">
              <div className="flex items-center gap-2 text-xs text-indigo-200 min-w-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="truncate">
                  <strong className="text-white">Screen sharing active.</strong> Presenting in another tab? Keep studio visible with Mini Studio:
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTogglePiP}
                className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 border-0 font-medium"
              >
                <PictureInPicture className="w-3.5 h-3.5 mr-1" />
                {isPiPActive ? "Docked" : "Float Mini Studio"}
              </Button>
            </div>
          )}

          {/* Video Stage Canvas */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <StagePreview />
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="h-14 sm:h-16 mt-2 sm:mt-3 rounded-xl sm:rounded-2xl bg-[#0c0c14]/95 border border-white/10 backdrop-blur-xl flex items-center justify-between px-2 sm:px-6 shrink-0 shadow-2xl overflow-x-auto custom-scrollbar">
            {/* Device Toggles */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant={lkMic ? "secondary" : "danger"}
                size="sm"
                onClick={toggleMicrophone}
                className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl font-medium text-xs sm:text-sm"
              >
                {lkMic ? <Mic className="w-4 h-4 sm:mr-2 text-emerald-400" /> : <MicOff className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">{lkMic ? "Mute" : "Unmute"}</span>
              </Button>

              <Button
                variant={lkCam ? "secondary" : "danger"}
                size="sm"
                onClick={toggleCamera}
                className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl font-medium text-xs sm:text-sm"
              >
                {lkCam ? <Video className="w-4 h-4 sm:mr-2 text-indigo-400" /> : <VideoOff className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">{lkCam ? "Stop Cam" : "Start Cam"}</span>
              </Button>

              {/* Mobile Phone Front / Rear Camera Flip */}
              <Button
                variant="secondary"
                size="sm"
                onClick={flipCamera}
                className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl font-medium text-xs text-slate-300 hover:text-white"
                title="Flip Front/Rear Camera (for smartphones)"
              >
                <RefreshCw className="w-4 h-4 sm:mr-1.5 text-cyan-400" />
                <span className="hidden md:inline">Flip Cam</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={toggleScreenShare}
                className={cn("h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl font-medium text-xs sm:text-sm transition-all hidden md:inline-flex", lkScreen && "border-indigo-500 bg-indigo-500/20 text-indigo-300")}
              >
                <MonitorUp className="w-4 h-4 mr-2" />
                {lkScreen ? "Stop Sharing" : "Share Screen"}
              </Button>

              {/* Picture-in-Picture Floating Mini Studio Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTogglePiP}
                className={cn(
                  "h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl font-medium text-xs sm:text-sm transition-all hidden sm:inline-flex",
                  isPiPActive ? "border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-500/20" : "text-slate-300 hover:text-white"
                )}
                title="Float Mini Studio (always-on-top window while presenting)"
              >
                <PictureInPicture className="w-4 h-4 sm:mr-1.5 text-cyan-400" />
                <span className="hidden lg:inline">{isPiPActive ? "Close Mini" : "Mini Studio"}</span>
              </Button>
            </div>

            {/* Quick Layout, Guests & Settings */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Mobile Guests Drawer Trigger */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
                className="h-9 sm:h-10 px-2.5 rounded-xl text-xs text-slate-300 hover:text-white lg:hidden"
                title="View Participants"
              >
                <Users className="w-4 h-4 text-indigo-400 sm:mr-1.5" />
                <span className="hidden sm:inline">Guests</span>
                <span className="text-[10px] font-bold text-indigo-300 ml-1">({participants.length})</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(activeTab === "layout" ? null : "layout")}
                className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl text-xs text-slate-300"
              >
                <LayoutGrid className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Layouts</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl text-xs text-slate-300"
              >
                <Settings2 className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Cam/Mic</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                title="Exit Studio"
              >
                <PhoneOff className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Exit</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Right Sidebar: Participants & Green Room (Desktop Docked) ───────── */}
        <div className="hidden lg:flex w-72 border-l border-white/5 bg-[#0a0a10] flex-col z-20 shrink-0">
          {renderParticipantsList()}
        </div>

        {/* ─── Right Sidebar: Participants & Green Room (Mobile Slide-Over Modal) ───────── */}
        {isParticipantsOpen && (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsParticipantsOpen(false)}
          />
        )}
        {isParticipantsOpen && (
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-[#0c0c14] border-l border-white/10 shadow-2xl flex flex-col lg:hidden animate-in slide-in-from-right duration-200">
            {renderParticipantsList()}
          </div>
        )}
      </div>

      {/* Device Settings Modal */}
      <DeviceSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Local Participant ISO Recording Manager Modal */}
      <LocalRecordingManager isOpen={isIsoModalOpen} onClose={() => setIsIsoModalOpen(false)} />

      {/* Pre-recorded Live Broadcast Scheduler Modal */}
      <PreRecordedSchedulerModal isOpen={isSchedulerOpen} onClose={() => setIsSchedulerOpen(false)} />

      {/* Go Live Streaming Destinations Modal */}
      <GoLiveModal
        isOpen={isGoLiveModalOpen}
        onClose={() => setIsGoLiveModalOpen(false)}
        broadcastTitle={broadcastTitle}
        onGoLive={handleGoLive}
      />
    </div>
  );
}

