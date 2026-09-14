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
  PictureInPicture,
  ChevronLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
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
import { stageBroadcaster } from "@/lib/stageBroadcaster";
import { HardDrive, Calendar, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit";
import { useAuthStore } from "@/stores/auth.store";
import { StreamMonitor } from "@/components/studio/StreamMonitor";
import { Track } from "livekit-client";

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
  const hostIdentity = user?.id ? `host-${user.id}` : `host-${cleanStudioId}`;
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
    setParticipantStageStatus,
    connect,
    disconnect,
  } = useLiveKit({
    roomName,
    participantName: hostName,
    identity: hostIdentity,
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
    activeMedia,
  } = useStudioStore();

  const compositeVideoPubRef = React.useRef<any>(null);
  const compositeAudioPubRef = React.useRef<any>(null);

  const handleMoveToStage = (id: string | number) => {
    moveToStage(id);
    setParticipantStageStatus(id, "ON_STAGE");
    const nextOnStage = Array.from(
      new Set([...participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id), id])
    );
    publishStageSync(nextOnStage, activeLayout, layoutSplitRatio, participantBounds, activeMedia);
  };

  const handleMoveToBackstage = (id: string | number) => {
    moveToBackstage(id);
    setParticipantStageStatus(id, "BACKSTAGE");
    const nextOnStage = participants
      .filter((p) => p.status === "ON_STAGE" && String(p.id) !== String(id))
      .map((p) => p.id);
    publishStageSync(nextOnStage, activeLayout, layoutSplitRatio, participantBounds, activeMedia);
  };

  // Sync layout, freeform bounds, and active media changes to all guests
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const onStageIds = participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
        publishStageSync(onStageIds, activeLayout, layoutSplitRatio, participantBounds, activeMedia);
      } catch (err) {
        console.warn("Stage sync broadcast error:", err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [activeLayout, layoutSplitRatio, participantBounds, participants, activeMedia, publishStageSync]);

  const [activeTab, setActiveTab] = useState<"chat" | "brand" | "media" | "layout" | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIsoModalOpen, setIsIsoModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState(false);
  const [liveDurationSec, setLiveDurationSec] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteToken, setInviteToken] = useState<string>("");
  const [isRegeneratingInvite, setIsRegeneratingInvite] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(false);

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

  // 1. Session Reconnection Recovery: Check if broadcast is already LIVE on backend upon host mount/reboot
  const [reconnectAlert, setReconnectAlert] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkActiveBroadcast = async () => {
      try {
        const [statusRes, broadcastRes] = await Promise.all([
          fetch(`/api/broadcasts/${params.id}/stream/status`).catch(() => null),
          fetch(`/api/broadcasts/${params.id}`).catch(() => null),
        ]);

        if (!isMounted) return;

        const statusData = statusRes ? await statusRes.json().catch(() => null) : null;
        const broadcastData = broadcastRes ? await broadcastRes.json().catch(() => null) : null;

        const bSettings = (broadcastData?.data?.settings || {}) as Record<string, any>;
        if (bSettings?.inviteToken) {
          setInviteToken(bSettings.inviteToken);
        } else {
          // Auto-fetch or generate token for this room (handles on-demand studios like studio-superadmin)
          fetch("/api/livekit/regenerate-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ broadcastId: params.id, roomName }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.inviteToken && isMounted) {
                setInviteToken(res.inviteToken);
              }
            })
            .catch((err) => console.warn("[Studio] Auto-init invite token warning:", err));
        }

        const isStreamActive =
          Boolean(statusData?.active) ||
          Boolean(statusData?.data?.active) ||
          broadcastData?.data?.status === "LIVE";

        if (isStreamActive) {
          console.log("[Studio Reconnect] Active stream detected on backend, re-attaching host to session!");
          startLive();
          setShowMonitor(true);

          // Calculate elapsed duration if startedAt is available
          const startedAtStr = broadcastData?.data?.startedAt || statusData?.data?.startedAt;
          if (startedAtStr) {
            const elapsed = Math.floor((Date.now() - new Date(startedAtStr).getTime()) / 1000);
            if (elapsed > 0) setLiveDurationSec(elapsed);
          }

          // Resume stage canvas capture if element is ready
          setTimeout(async () => {
            const stageEl = document.getElementById("livestudio-stage-container");
            if (stageEl && !stageBroadcaster.isStreaming()) {
              stageBroadcaster.ensureAudioContext();
              await stageBroadcaster.start(stageEl, params.id);
            }
          }, 1200);

          setReconnectAlert("✅ Reconnected to Active Live Broadcast! You have resumed studio control.");
          setTimeout(() => setReconnectAlert(null), 8000);
        }
      } catch (err) {
        console.warn("[Studio Reconnect] Error checking active stream status:", err);
      }
    };

    checkActiveBroadcast();
    return () => {
      isMounted = false;
    };
  }, [params.id, startLive]);

  // 2. Pre-Live Inactivity Protection (5-minute countdown if not live)
  const [idleSeconds, setIdleSeconds] = useState(300);
  const [isIdleDisconnected, setIsIdleDisconnected] = useState(false);

  useEffect(() => {
    if (isLive || isIdleDisconnected) return;

    const interval = setInterval(() => {
      setIdleSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          disconnect();
          setIsIdleDisconnected(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, isIdleDisconnected, disconnect]);

  const handleExtendIdleTime = () => {
    setIdleSeconds((prev) => prev + 300);
  };

  const handleReconnectIdle = () => {
    setIsIdleDisconnected(false);
    setIdleSeconds(300);
    connect();
  };

  // 3. Post-Stream Wrap-Up / Debrief Timer
  const [wrapUpSeconds, setWrapUpSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (wrapUpSeconds === null) return;
    if (wrapUpSeconds <= 0) {
      disconnect();
      setWrapUpSeconds(null);
      return;
    }
    const timer = setInterval(() => {
      setWrapUpSeconds((s) => (s !== null ? s - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [wrapUpSeconds, disconnect]);

  const handleCloseStudioNow = () => {
    disconnect();
    setWrapUpSeconds(null);
    router.push("/dashboard");
  };

  // 4. Disconnection Protection: If host closes tab while LIVE and ALONE -> stop stream immediately!
  useEffect(() => {
    const handleBeforeUnload = () => {
      const isCurrentlyLive = useStudioStore.getState().isLive;
      const remoteParticipants = liveParticipants.filter((p) => !p.isLocal);

      if (isCurrentlyLive && remoteParticipants.length === 0) {
        // Host was alone! Stop stream immediately to save resources
        navigator.sendBeacon(`/api/broadcasts/${params.id}/stream/stop`);
      }
      // If remoteParticipants.length > 0, do NOT stop stream! 5-minute grace period protects the broadcast!
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [liveParticipants, params.id]);

  // Picture-in-Picture Floating Mini Studio
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);

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
    if (isLive || stageBroadcaster.isStreaming()) {
      console.warn("[Studio] Already live, ignoring duplicate Go Live request");
      return;
    }

    // 0. Immediately activate Web Audio context on user gesture
    stageBroadcaster.ensureAudioContext();

    try {
      // 1. Gather any direct destinations from local custom storage
      let directDestinations: Array<{ rtmpUrl: string; streamKey?: string }> = [];
      if (typeof window !== "undefined") {
        try {
          const localSaved = localStorage.getItem("livestudio_custom_destinations");
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
              directDestinations = parsed
                .filter((d: { id: string }) => destinationIds.includes(d.id))
                .map((d: { rtmpUrl: string; streamKey?: string }) => ({
                  rtmpUrl: d.rtmpUrl,
                  streamKey: d.streamKey,
                }));
            }
          }
        } catch {
          // ignore
        }
      }

      // 2. Start FFmpeg RTMP broadcast session on backend
      const res = await fetch(`/api/broadcasts/${params.id}/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationIds,
          roomName,
          directDestinations,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        console.error("Failed to start RTMP stream:", result.error);
        alert(
          `❌ Live Stream Error: ${result.error || "Could not connect to RTMP destination. Please verify your YouTube Stream Key."}`
        );
        return;
      }

      // 3. Start stage canvas recording & chunk streaming directly to backend
      const stageEl = document.getElementById("livestudio-stage-container");
      const started = await stageBroadcaster.start(stageEl, params.id);
      if (!started) {
        console.warn("[Studio GoLive] Canvas broadcaster failed to start, stopping backend session");
        await fetch(`/api/broadcasts/${params.id}/stream/stop`, { method: "POST" });
        alert("❌ Failed to capture studio screen for live stream.");
        return;
      }

      setShowMonitor(true);
      startLive();
    } catch (e) {
      console.error("Failed to start RTMP stream:", e);
      alert(
        `❌ Connection Error: ${e instanceof Error ? e.message : "Could not reach streaming server."}`
      );
    }
  };

  const handleEndBroadcast = async () => {
    if (!confirm("Are you sure you want to end this live broadcast?")) return;
    try {
      // 1. Stop stage canvas recording & chunk upload
      stageBroadcaster.stop();
      setShowMonitor(false);

      // 2. Stop backend FFmpeg RTMP session
      await fetch(`/api/broadcasts/${params.id}/stream/stop`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to stop stream:", e);
    } finally {
      endLive();
      setWrapUpSeconds(60);
    }
  };

  // Sync LiveKit participants to studio store and refresh broadcast audio mix
  useEffect(() => {
    if (liveParticipants.length > 0) {
      useStudioStore.getState().setParticipants(liveParticipants);
      if (stageBroadcaster.isStreaming()) {
        stageBroadcaster.refreshAudioConnections();
      }
    }
  }, [liveParticipants]);

  // Refresh broadcast audio when active media (video/audio) is played or stopped
  useEffect(() => {
    if (stageBroadcaster.isStreaming()) {
      const t = setTimeout(() => {
        stageBroadcaster.refreshAudioConnections();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [activeMedia]);


  const onStageParticipants = participants.filter((p) => p.status === "ON_STAGE");
  const backstageParticipants = participants.filter((p) => p.status === "BACKSTAGE");
  const greenRoomParticipants = participants.filter((p) => p.status === "GREEN_ROOM");

  const handleRegenerateInvite = async () => {
    setIsRegeneratingInvite(true);
    try {
      const res = await fetch("/api/livekit/regenerate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcastId: params.id, roomName }),
      });
      const data = await res.json();
      if (data.success && data.inviteToken) {
        setInviteToken(data.inviteToken);
        const newUrl = `${window.location.origin}/join/${roomName}?token=${data.inviteToken}`;
        navigator.clipboard.writeText(newUrl);
        setCopiedLink(true);
        setResetSuccessMessage(true);
        setTimeout(() => {
          setCopiedLink(false);
          setResetSuccessMessage(false);
        }, 3000);
      }
    } catch (err) {
      console.error("Failed to regenerate invite link:", err);
    } finally {
      setIsRegeneratingInvite(false);
    }
  };

  const handleCopyInvite = () => {
    let currentToken = inviteToken;
    if (!currentToken) {
      currentToken = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
      setInviteToken(currentToken);
      fetch("/api/livekit/regenerate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcastId: params.id, roomName, forceToken: currentToken }),
      }).catch((e) => console.warn("Failed to register invite token:", e));
    }
    const inviteUrl = `${window.location.origin}/join/${roomName}?token=${currentToken}`;
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyInvite}
            className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300"
            title="Copy guest invite link"
          >
            <Share2 className="w-3 h-3 mr-1" />
            {copiedLink ? (resetSuccessMessage ? "Reset & Copied!" : "Copied!") : "Invite"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerateInvite}
            disabled={isRegeneratingInvite}
            className="h-7 px-2 text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 border border-white/5 hover:border-amber-500/30"
            title="Reset invite link (invalidates older links)"
          >
            <RefreshCw className={cn("w-3 h-3", isRegeneratingInvite && "animate-spin text-amber-400")} />
            <span className="hidden sm:inline">Reset</span>
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

      {resetSuccessMessage && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-300 flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>New invite link generated & copied! Old links are now invalid.</span>
        </div>
      )}

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

            {!isLive && isConnected && (
              <button
                type="button"
                onClick={handleExtendIdleTime}
                className="hidden lg:flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-300 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md border border-white/5 transition-colors shrink-0"
                title="Cloud Minute Saver: Studio auto-disconnects if idle for 5 minutes. Click to add +5m"
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Idle: {Math.floor(idleSeconds / 60)}:{(idleSeconds % 60).toString().padStart(2, "0")}</span>
              </button>
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

      {/* ─── Notification & Lifecycle Banners ───────────────────── */}
      {reconnectAlert && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between shrink-0 animate-in fade-in z-40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{reconnectAlert}</span>
          </div>
          <button onClick={() => setReconnectAlert(null)} className="p-1 text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {wrapUpSeconds !== null && (
        <div className="bg-indigo-500/20 border-b border-indigo-500/40 px-4 py-2 text-xs text-indigo-200 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Broadcast Ended.</strong> Post-stream debrief: Studio will auto-disconnect in{" "}
              <strong className="font-mono text-white underline">
                {Math.floor(wrapUpSeconds / 60)}:{(wrapUpSeconds % 60).toString().padStart(2, "0")}
              </strong>{" "}
              to preserve cloud resources.
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={handleCloseStudioNow} className="h-6 px-2.5 text-[11px]">
            Close Studio Now
          </Button>
        </div>
      )}

      {!isLive && isConnected && idleSeconds <= 120 && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center justify-between shrink-0 z-40 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Inactivity Warning:</strong> Studio is not live yet. Disconnecting in{" "}
              <strong className="font-mono text-white underline">
                {Math.floor(idleSeconds / 60)}:{(idleSeconds % 60).toString().padStart(2, "0")}
              </strong>{" "}
              to save LiveKit Cloud minutes.
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExtendIdleTime} className="h-6 px-2.5 text-[11px] border-amber-400/40 text-amber-300">
            +5m Keep Studio Open
          </Button>
        </div>
      )}

      {/* ─── Main Workspace ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Idle Disconnected Overlay */}
        {isIdleDisconnected && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Studio Disconnected (Idle Protection)</h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              To save your LiveKit Cloud resources, the studio was automatically paused after 5 minutes of inactivity without going live.
            </p>
            <Button variant="primary" size="default" onClick={handleReconnectIdle} className="px-5 shadow-lg shadow-indigo-500/20">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconnect Studio
            </Button>
          </div>
        )}
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

        {/* Tab Drawer Panel: Docked flex child on desktop so it dynamically resizes stage preview without overlapping */}
        <AnimatePresence initial={false}>
          {activeTab && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "20rem", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="hidden md:flex flex-col w-80 max-w-[28vw] shrink-0 border-r border-white/10 bg-[#0b0b12] z-20 h-full overflow-hidden"
            >
              <div className="w-80 max-w-[28vw] h-full flex flex-col min-w-0">
                {/* Persistent Header with Panel Title & 1-Click Collapse Button */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-[#090910] shrink-0">
                  <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                    {activeTab === "chat" && "Studio Chat"}
                    {activeTab === "brand" && "Brand Kit & Overlays"}
                    {activeTab === "media" && "Media Library"}
                    {activeTab === "layout" && "Studio Layouts"}
                  </span>
                  <button
                    onClick={() => setActiveTab(null)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Collapse panel"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Collapse</span>
                    <X className="w-3 h-3 ml-0.5 opacity-60" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  {activeTab === "chat" && <ChatPanel />}
                  {activeTab === "brand" && <BrandPanel />}
                  {activeTab === "media" && <MediaPanel />}
                  {activeTab === "layout" && (
                    <div className="p-4 h-full overflow-y-auto custom-scrollbar">
                      <LayoutSelector />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Slide-Over Overlay (only for mobile screens < md) */}
        {activeTab && (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
            onClick={() => setActiveTab(null)}
          />
        )}
        <AnimatePresence>
          {activeTab && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="fixed inset-y-0 left-12 z-50 w-80 max-w-[calc(100vw-3.25rem)] border-r border-white/10 bg-[#0b0b12] flex flex-col md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-[#090910] shrink-0">
                <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                  {activeTab === "chat" && "Studio Chat"}
                  {activeTab === "brand" && "Brand Kit & Overlays"}
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
              <div className="flex-1 overflow-hidden">
                {activeTab === "chat" && <ChatPanel />}
                {activeTab === "brand" && <BrandPanel />}
                {activeTab === "media" && <MediaPanel />}
                {activeTab === "layout" && (
                  <div className="p-4 h-full overflow-y-auto custom-scrollbar">
                    <LayoutSelector />
                  </div>
                )}
              </div>
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

              {/* Live Program Stream Monitor Button */}
              <Button
                variant={showMonitor ? "primary" : "secondary"}
                size="sm"
                onClick={() => setShowMonitor(!showMonitor)}
                className={cn(
                  "h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl font-medium text-xs sm:text-sm transition-all hidden sm:inline-flex",
                  showMonitor ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md shadow-indigo-500/20" : "text-slate-300 hover:text-white"
                )}
                title="Live Stream Program Monitor (Preview exact feed going to YouTube)"
              >
                <Tv className="w-4 h-4 sm:mr-1.5 text-indigo-400" />
                <span className="hidden lg:inline">{showMonitor ? "Hide Monitor" : "Monitor"}</span>
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

      {/* Live Stream Program Output Monitor */}
      <StreamMonitor
        isOpen={showMonitor}
        onClose={() => setShowMonitor(false)}
        isLive={isLive}
        broadcastId={params.id}
      />
    </div>
  );
}

