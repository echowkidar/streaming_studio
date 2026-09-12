"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
  ArrowLeft,
  MonitorUp,
  PhoneOff,
  Users,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Send,
  X,
  Radio,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useLiveKit } from "@/hooks/useLiveKit";
import { VideoTrackView } from "@/components/studio/VideoTrackView";
import { AudioMeter } from "@/components/studio/AudioMeter";
import { cn } from "@/lib/utils";

export default function GuestJoinPage({ params }: { params: { token: string } }) {
  const [displayName, setDisplayName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [step, setStep] = useState<"setup" | "stage">("setup");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "LiveStudio", text: "Welcome to the studio! You can privately chat with the host here.", time: "Now" }
  ]);
  const [chatInput, setChatInput] = useState("");

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Normalize room name cleanly (strips any redundant repeated studio- prefixes)
  const cleanTokenId = params.token.replace(/^(studio-)+/, "").replace(/^guest-invite-token-/, "");
  const roomName = `studio-${cleanTokenId}`;

  // LiveKit hook activated when guest enters stage
  const {
    isConnected,
    isConnecting,
    error: lkError,
    camEnabled: lkCam,
    micEnabled: lkMic,
    screenEnabled: lkScreen,
    liveParticipants,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    flipCamera,
    disconnect,
  } = useLiveKit({
    roomName,
    participantName: displayName || "Guest",
    role: "GUEST",
    autoConnect: step === "stage",
  });

  // Step 1: Request real browser camera/mic for local hardware test
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (step === "setup") {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          setLocalStream(s);
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn("Could not access camera/mic for preview:", err);
          setMediaError("Please allow Camera & Microphone access to test your devices.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);

  const togglePreviewCam = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !camOn;
      });
      setCamOn(!camOn);
    }
  };

  const togglePreviewMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }

    setStep("stage");
  };

  const handleLeave = () => {
    disconnect();
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: displayName || "You",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  };

  // Participant resolution
  const localParticipant = liveParticipants.find((p) => p.isLocal);
  const isGuestOnStage = localParticipant?.status === "ON_STAGE";
  const onStageParticipants = liveParticipants.filter((p) => p.status === "ON_STAGE");
  const backstageParticipants = liveParticipants.filter((p) => p.status === "BACKSTAGE");

  return (
    <div className="min-h-screen w-screen bg-[#07070b] flex flex-col text-slate-200 select-none overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {step === "setup" ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg space-y-5">
            {/* Back Button & Header */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = "/";
                  }
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 h-8 px-2.5 rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                LiveStudio Green Room
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Guest Studio Check-In
              </h1>
              <p className="text-xs text-slate-400">
                You're entering as a guest speaker. Test your camera and audio before joining backstage.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0e0e17]/90 backdrop-blur-xl p-5 shadow-2xl space-y-4">
              {/* Real Video Preview Box */}
              <div className="aspect-video w-full rounded-xl bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover scale-x-[-1] transition-opacity duration-300",
                    camOn && localStream ? "opacity-100" : "opacity-0 absolute pointer-events-none"
                  )}
                />

                {(!camOn || !localStream) && (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <VideoOff className="w-10 h-10 text-slate-600" />
                    <span className="text-xs">Camera is turned off</span>
                  </div>
                )}

                {/* Floating Camera / Mic Toggles */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-10">
                  <Button
                    variant={micOn ? "secondary" : "danger"}
                    size="icon"
                    className="rounded-full shadow-lg h-9 w-9"
                    onClick={togglePreviewMic}
                    type="button"
                    title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant={camOn ? "secondary" : "danger"}
                    size="icon"
                    className="rounded-full shadow-lg h-9 w-9"
                    onClick={togglePreviewCam}
                    type="button"
                    title={camOn ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    {camOn ? <Video className="w-4 h-4 text-indigo-400" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="absolute top-3 left-3">
                  <Badge variant="neutral" size="sm" className="bg-black/70 backdrop-blur-md">
                    Device Test
                  </Badge>
                </div>
              </div>

              {/* Mic Level Meter */}
              {localStream && (
                <div className="p-2.5 rounded-xl bg-surface border border-white/5 flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-slate-400 shrink-0">Mic Level:</span>
                  <AudioMeter stream={localStream} className="flex-1" />
                </div>
              )}

              {mediaError && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center">
                  {mediaError}
                </p>
              )}

              {/* Join Form */}
              <form onSubmit={handleJoin} className="space-y-3">
                <Input
                  label="Your Display Name"
                  placeholder="e.g. Salar (Guest Speaker)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                />

                <Button variant="primary" size="lg" className="w-full h-11" type="submit">
                  Enter Backstage
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Step 2: StreamYard-Grade Live Studio Guest View */
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#07070b]">
          {/* Top Bar */}
          <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-[#0c0c14]/95 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-white text-xs shrink-0">
                L
              </div>
              <div className="truncate">
                <span className="font-semibold text-xs text-white">LiveStudio Guest</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-mono hidden sm:inline">({roomName})</span>
              </div>
            </div>

            {/* Stage Status Pill (Backstage vs On Stage) */}
            <div className="flex items-center gap-2">
              {isGuestOnStage ? (
                <div className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="hidden xs:inline">YOU ARE </span>LIVE ON STAGE
                </div>
              ) : (
                <div className="px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  BACKSTAGE
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="h-8 text-xs text-slate-300 relative"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:mr-1 text-indigo-400" />
                <span className="hidden xs:inline">Chat</span>
              </Button>

              <Button variant="danger" size="sm" onClick={handleLeave} className="h-8 px-2 sm:px-3 text-xs">
                <PhoneOff className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden xs:inline">Leave</span>
              </Button>
            </div>
          </header>

          {/* Backstage Advisory Banner if guest is not on stage */}
          {!isGuestOnStage && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 sm:py-2 text-center text-[11px] sm:text-xs text-amber-300/90 flex items-center justify-center gap-2 shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                You are in <strong>Backstage</strong>. The host will bring you onto the live stage shortly.
              </span>
            </div>
          )}

          {/* Main Stage & Layout Area */}
          <div className="flex-1 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative min-h-0">
            {/* Fixed 16:9 Broadcast Stage Container */}
            <div className="w-full aspect-video max-w-6xl max-h-full rounded-2xl bg-black border border-white/10 overflow-hidden relative shadow-2xl flex flex-col justify-center mx-auto my-auto">
              {liveParticipants.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Connecting to live studio stream...</p>
                </div>
              ) : (
                <div className="w-full h-full p-2 grid gap-2 items-center justify-center h-full">
                  {/* Render all on-stage participants in fixed slots */}
                  <div
                    className={cn(
                      "w-full h-full grid gap-2.5 items-center justify-center",
                      onStageParticipants.length === 0 && "grid-cols-1",
                      onStageParticipants.length === 1 && "grid-cols-1",
                      onStageParticipants.length === 2 && "grid-cols-2",
                      onStageParticipants.length >= 3 && "grid-cols-2 sm:grid-cols-3"
                    )}
                  >
                    {onStageParticipants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
                        <Radio className="w-8 h-8 text-slate-600 animate-pulse" />
                        <p className="text-sm font-semibold text-slate-400">Stage is Preparing</p>
                        <p className="text-xs text-slate-600">The host has not brought any participants on stage yet.</p>
                      </div>
                    ) : (
                      onStageParticipants.map((p) => (
                        <div key={p.id} className="w-full h-full min-h-0 min-w-0">
                          <VideoTrackView
                            track={p.videoTrack}
                            audioTrack={p.audioTrack}
                            name={p.name}
                            isSpeaking={p.isSpeaking}
                            micOn={p.micOn}
                            camOn={p.camOn}
                            isLocal={p.isLocal}
                            role={p.role}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Guest Self-View Picture-In-Picture when Backstage */}
              {!isGuestOnStage && localParticipant && (
                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-20 w-28 xs:w-36 sm:w-52 aspect-video rounded-lg sm:rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-black">
                  <VideoTrackView
                    track={localParticipant.videoTrack}
                    audioTrack={localParticipant.audioTrack}
                    name={`${displayName} (You)`}
                    isSpeaking={localParticipant.isSpeaking}
                    micOn={lkMic}
                    camOn={lkCam}
                    isLocal={true}
                    role="Guest"
                  />
                </div>
              )}
            </div>

            {/* Slide-out Private Chat Drawer */}
            {isChatOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 sm:hidden"
                  onClick={() => setIsChatOpen(false)}
                />
                <div className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-[#0c0c16]/98 border-l border-white/10 z-40 flex flex-col shadow-2xl backdrop-blur-xl">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      Studio Private Chat
                    </h3>
                    <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs custom-scrollbar">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-surface border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-indigo-300">{msg.sender}</span>
                          <span className="text-slate-500 font-mono">{msg.time}</span>
                        </div>
                        <p className="text-slate-200">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChat} className="p-2.5 border-t border-white/10 flex items-center gap-2 bg-[#09090f]">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Message host & backstage..."
                      className="flex-1 h-8 px-3 text-xs rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                    />
                    <Button type="submit" variant="primary" size="icon" className="h-8 w-8 shrink-0 rounded-xl">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>

          {/* Guest Bottom Floating Control Bar */}
          <footer className="h-14 sm:h-16 border-t border-white/5 bg-[#0c0c14]/95 backdrop-blur-md flex items-center justify-center gap-1.5 sm:gap-3 px-3 sm:px-4 shrink-0 z-30">
            {/* Mic Toggle */}
            <Button
              variant={lkMic ? "secondary" : "danger"}
              size="sm"
              onClick={toggleMicrophone}
              className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl font-medium text-xs sm:text-sm"
            >
              {lkMic ? <Mic className="w-4 h-4 sm:mr-2 text-emerald-400" /> : <MicOff className="w-4 h-4 sm:mr-2" />}
              <span className="hidden sm:inline">{lkMic ? "Mute" : "Unmute"}</span>
            </Button>

            {/* Camera Toggle */}
            <Button
              variant={lkCam ? "secondary" : "danger"}
              size="sm"
              onClick={toggleCamera}
              className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl font-medium text-xs sm:text-sm"
            >
              {lkCam ? <Video className="w-4 h-4 sm:mr-2 text-indigo-400" /> : <VideoOff className="w-4 h-4 sm:mr-2" />}
              <span className="hidden sm:inline">{lkCam ? "Stop Cam" : "Start Cam"}</span>
            </Button>

            {/* Mobile Phone Front / Back Camera Switcher */}
            <Button
              variant="secondary"
              size="sm"
              onClick={flipCamera}
              className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl font-medium text-xs text-slate-300 hover:text-white"
              title="Flip Front/Rear Camera (for mobile devices)"
            >
              <RefreshCw className="w-4 h-4 sm:mr-1.5 text-cyan-400" />
              <span className="hidden sm:inline">Flip Cam</span>
            </Button>

            {/* Screen Share (if on desktop) */}
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleScreenShare}
              className={cn("h-9 sm:h-10 px-3 sm:px-4 rounded-xl font-medium hidden md:inline-flex", lkScreen && "border-indigo-500 bg-indigo-500/20 text-indigo-300")}
            >
              <MonitorUp className="w-4 h-4 mr-2" />
              {lkScreen ? "Stop Sharing" : "Share Screen"}
            </Button>

            {/* Leave Studio Button */}
            <Button
              variant="danger"
              size="sm"
              onClick={handleLeave}
              className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl ml-1 sm:ml-2 font-medium text-xs sm:text-sm"
            >
              <PhoneOff className="w-4 h-4 sm:mr-1.5" />
              <span>Leave</span>
            </Button>
          </footer>
        </div>
      )}
    </div>
  );
}
