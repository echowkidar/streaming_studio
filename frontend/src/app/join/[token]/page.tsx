"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
  MonitorUp,
  PhoneOff,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useLiveKit } from "@/hooks/useLiveKit";
import { VideoTrackView } from "@/components/studio/VideoTrackView";
import { cn } from "@/lib/utils";

export default function GuestJoinPage({ params }: { params: { token: string } }) {
  const [displayName, setDisplayName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [step, setStep] = useState<"setup" | "stage">("setup");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Normalize room name from token parameter
  const roomName = params.token.startsWith("studio-")
    ? params.token
    : `studio-${params.token.replace("guest-invite-token-", "")}`;

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

    // Stop local preview tracks so LiveKit can acquire them cleanly
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }

    setStep("stage");
  };

  const handleLeave = () => {
    disconnect();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen w-screen bg-[#07070b] flex flex-col text-slate-200 select-none overflow-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {step === "setup" ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xl space-y-6">
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
                You've been invited as a guest speaker to <span className="text-indigo-400 font-mono font-semibold">{roomName}</span>. Test your camera and audio below.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0e0e17]/80 backdrop-blur-xl p-6 shadow-2xl space-y-5">
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
                    <span className="text-xs">Camera is off</span>
                  </div>
                )}

                {/* Floating Camera / Mic Toggles */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-10">
                  <Button
                    variant={micOn ? "secondary" : "danger"}
                    size="icon"
                    className="rounded-full shadow-lg h-10 w-10"
                    onClick={togglePreviewMic}
                    type="button"
                    title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant={camOn ? "secondary" : "danger"}
                    size="icon"
                    className="rounded-full shadow-lg h-10 w-10"
                    onClick={togglePreviewCam}
                    type="button"
                    title={camOn ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    {camOn ? <Video className="w-4 h-4 text-indigo-400" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="absolute top-3 left-3">
                  <Badge variant="neutral" size="sm" className="bg-black/60 backdrop-blur-md">
                    Live Camera Test
                  </Badge>
                </div>
              </div>

              {mediaError && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center">
                  {mediaError}
                </p>
              )}

              {/* Join Form */}
              <form onSubmit={handleJoin} className="space-y-4">
                <Input
                  label="Your Display Name"
                  placeholder="e.g. Elena (Guest Speaker)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                />

                <Button variant="primary" size="lg" className="w-full" type="submit">
                  Enter Studio Stage
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Step 2: Full Live Studio Stage View for Guest */
        <div className="h-screen w-screen flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0c0c14]/90 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-white text-xs">
                L
              </div>
              <div>
                <span className="font-semibold text-xs text-white">LiveStudio Guest</span>
                <span className="text-[10px] text-slate-400 ml-2 font-mono">({roomName})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isConnected ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Connected
                </span>
              ) : isConnecting ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
                  {lkError || "Disconnected"}
                </span>
              )}

              <Button variant="ghost" size="sm" onClick={handleLeave} className="text-xs text-rose-400 hover:text-rose-300">
                <PhoneOff className="w-4 h-4 mr-1.5" />
                Leave
              </Button>
            </div>
          </header>

          {/* Main Video Stage */}
          <div className="flex-1 p-4 bg-[#050508] overflow-hidden flex flex-col justify-center">
            {liveParticipants.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Connecting to studio stream...</p>
              </div>
            ) : (
              <div
                className={cn(
                  "w-full h-full grid gap-4 items-center justify-center",
                  liveParticipants.length === 1 && "grid-cols-1 max-w-4xl mx-auto",
                  liveParticipants.length === 2 && "grid-cols-1 sm:grid-cols-2",
                  liveParticipants.length >= 3 && "grid-cols-2 sm:grid-cols-3"
                )}
              >
                {liveParticipants.map((p) => (
                  <div key={p.id} className="w-full h-full min-h-[220px] max-h-[500px]">
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
                ))}
              </div>
            )}
          </div>

          {/* Guest Floating Control Bar */}
          <footer className="h-16 border-t border-white/5 bg-[#0c0c14]/90 backdrop-blur-md flex items-center justify-center gap-3 px-6 shrink-0 z-30">
            <Button
              variant={lkMic ? "secondary" : "danger"}
              size="sm"
              onClick={toggleMicrophone}
              className="h-10 px-4 rounded-xl"
            >
              {lkMic ? <Mic className="w-4 h-4 mr-2 text-emerald-400" /> : <MicOff className="w-4 h-4 mr-2" />}
              {lkMic ? "Mute" : "Unmute"}
            </Button>

            <Button
              variant={lkCam ? "secondary" : "danger"}
              size="sm"
              onClick={toggleCamera}
              className="h-10 px-4 rounded-xl"
            >
              {lkCam ? <Video className="w-4 h-4 mr-2 text-indigo-400" /> : <VideoOff className="w-4 h-4 mr-2" />}
              {lkCam ? "Stop Video" : "Start Video"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={toggleScreenShare}
              className={cn("h-10 px-4 rounded-xl", lkScreen && "border-indigo-500 bg-indigo-500/20 text-indigo-300")}
            >
              <MonitorUp className="w-4 h-4 mr-2" />
              {lkScreen ? "Stop Sharing" : "Share Screen"}
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={handleLeave}
              className="h-10 px-4 rounded-xl ml-4"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave Studio
            </Button>
          </footer>
        </div>
      )}
    </div>
  );
}
