"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteAudioTrack,
  RemoteTrack,
} from "livekit-client";
import { Participant } from "@/types";
import { useStudioStore } from "@/stores/studio.store";

interface UseLiveKitOptions {
  roomName: string;
  participantName: string;
  role?: "HOST" | "GUEST" | "CO_HOST";
  autoConnect?: boolean;
}

export function useLiveKit({
  roomName,
  participantName,
  role = "GUEST",
  autoConnect = true,
}: UseLiveKitOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenEnabled, setScreenEnabled] = useState(false);

  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [screenTrack, setScreenTrack] = useState<LocalVideoTrack | null>(null);

  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
  const roomRef = useRef<Room | null>(null);
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const participantsRef = useRef<Participant[]>([]);

  // Helper to re-map all LiveKit participants into a stable, deterministic order
  const syncParticipants = useCallback((currentRoom: Room) => {
    if (!currentRoom) return;
    const list: Participant[] = [];

    // Local Participant
    const local = currentRoom.localParticipant;
    let localCamTrack: LocalVideoTrack | null = null;
    let localMicTrack: LocalAudioTrack | null = null;
    let localScrTrack: LocalVideoTrack | null = null;

    if (local) {
      local.videoTrackPublications.forEach((pub) => {
        if (pub.source === Track.Source.ScreenShare) {
          localScrTrack = (pub.track as LocalVideoTrack) || (pub.videoTrack as LocalVideoTrack) || null;
        } else {
          localCamTrack = (pub.track as LocalVideoTrack) || (pub.videoTrack as LocalVideoTrack) || null;
        }
      });

      local.audioTrackPublications.forEach((pub) => {
        localMicTrack = (pub.track as LocalAudioTrack) || (pub.audioTrack as LocalAudioTrack) || null;
      });

      if (!localCamTrack) {
        const camPub = local.getTrackPublication(Track.Source.Camera);
        if (camPub) {
          localCamTrack = (camPub.track as LocalVideoTrack) || (camPub.videoTrack as LocalVideoTrack) || null;
        }
      }
      if (!localScrTrack) {
        const scrPub = local.getTrackPublication(Track.Source.ScreenShare);
        if (scrPub) {
          localScrTrack = (scrPub.track as LocalVideoTrack) || (scrPub.videoTrack as LocalVideoTrack) || null;
        }
      }
      if (!localMicTrack) {
        const micPub = local.getTrackPublication(Track.Source.Microphone);
        if (micPub) {
          localMicTrack = (micPub.track as LocalAudioTrack) || (micPub.audioTrack as LocalAudioTrack) || null;
        }
      }

      setLocalVideoTrack(localCamTrack);
      setLocalAudioTrack(localMicTrack);
      setScreenTrack(localScrTrack);

      const isCamActive = local.isCameraEnabled || !!localCamTrack;
      const isMicActive = local.isMicrophoneEnabled || !!localMicTrack;

      // Local participant stage status: HOST starts on stage, GUEST starts in Green Room / Backstage
      const existingLocal = participantsRef.current.find((p) => p.id === local.identity);
      const localStatus = existingLocal ? existingLocal.status : (role === "HOST" ? "ON_STAGE" : "BACKSTAGE");

      // 1. Local Participant Camera / Avatar Tile
      list.push({
        id: local.identity,
        name: local.name || participantName,
        role: role.toLowerCase() as any,
        status: localStatus,
        micOn: isMicActive,
        camOn: isCamActive,
        isSpeaking: local.isSpeaking,
        isLocal: true,
        videoTrack: localCamTrack,
        audioTrack: localMicTrack,
        connectionQuality: "EXCELLENT",
      });

      // 2. Local Participant Screen Share Tile (if sharing screen)
      if (localScrTrack) {
        if (localScrTrack.mediaStreamTrack) {
          localScrTrack.mediaStreamTrack.onended = () => {
            setScreenEnabled(false);
            if (roomRef.current) {
              syncParticipants(roomRef.current);
            }
          };
        }

        const screenId = `${local.identity}-screen`;
        const existingScreen = participantsRef.current.find((p) => p.id === screenId);
        const screenStatus = existingScreen ? existingScreen.status : "ON_STAGE";

        list.push({
          id: screenId,
          name: `${local.name || participantName}'s Screen`,
          role: "screen",
          status: screenStatus,
          micOn: false,
          camOn: true,
          isSpeaking: false,
          isScreen: true,
          isLocal: true,
          videoTrack: localScrTrack,
          audioTrack: null,
          connectionQuality: "EXCELLENT",
        });
      }
    }

    // Remote Participants sorted stably by identity so their tiles NEVER swap
    const sortedRemotes = Array.from(currentRoom.remoteParticipants.values()).sort((a, b) =>
      a.identity.localeCompare(b.identity)
    );

    sortedRemotes.forEach((remote: RemoteParticipant) => {
      let remoteCamTrack: any = null;
      let remoteScrTrack: any = null;
      let remoteAudio: any = null;

      remote.videoTrackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.source === Track.Source.ScreenShare) {
          remoteScrTrack = pub.track || (pub.videoTrack as any) || null;
        } else {
          remoteCamTrack = pub.track || (pub.videoTrack as any) || null;
        }
      });

      if (!remoteScrTrack) {
        const scrPub = remote.getTrackPublication(Track.Source.ScreenShare);
        if (scrPub) {
          remoteScrTrack = scrPub.track || (scrPub.videoTrack as any) || null;
        }
      }
      if (!remoteCamTrack) {
        const camPub = remote.getTrackPublication(Track.Source.Camera);
        if (camPub) {
          remoteCamTrack = camPub.track || (camPub.videoTrack as any) || null;
        }
      }

      remote.audioTrackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.track) {
          remoteAudio = pub.track;
        }
      });

      let parsedRole = "guest";
      try {
        if (remote.metadata) {
          const meta = JSON.parse(remote.metadata);
          if (meta.role) parsedRole = meta.role.toLowerCase();
        }
      } catch {
        // ignore
      }

      const isRemoteCamActive = remote.isCameraEnabled || !!remoteCamTrack;
      const isRemoteMicActive = remote.isMicrophoneEnabled || !!remoteAudio;

      // StreamYard rule: preserve existing status if host placed them ON_STAGE/BACKSTAGE,
      // otherwise new guests default to BACKSTAGE!
      const existing = participantsRef.current.find((p) => p.id === remote.identity);
      const isHostRole = parsedRole === "host" || parsedRole === "co_host";
      const remoteStatus = existing ? existing.status : (isHostRole ? "ON_STAGE" : "BACKSTAGE");

      // Remote Participant Camera Tile
      list.push({
        id: remote.identity,
        name: remote.name || `Guest (${remote.identity.slice(0, 5)})`,
        role: parsedRole as any,
        status: remoteStatus,
        micOn: isRemoteMicActive,
        camOn: isRemoteCamActive,
        isSpeaking: remote.isSpeaking,
        isLocal: false,
        videoTrack: remoteCamTrack,
        audioTrack: remoteAudio,
        connectionQuality: "GOOD",
      });

      // Remote Participant Screen Share Tile (if sharing screen)
      if (remoteScrTrack) {
        const remoteScreenId = `${remote.identity}-screen`;
        const existingRemoteScreen = participantsRef.current.find((p) => p.id === remoteScreenId);
        const remoteScreenStatus = existingRemoteScreen ? existingRemoteScreen.status : "ON_STAGE";

        list.push({
          id: remoteScreenId,
          name: `${remote.name || `Guest (${remote.identity.slice(0, 5)})`}'s Screen`,
          role: "screen",
          status: remoteScreenStatus,
          micOn: false,
          camOn: true,
          isSpeaking: false,
          isScreen: true,
          isLocal: false,
          videoTrack: remoteScrTrack,
          audioTrack: null,
          connectionQuality: "GOOD",
        });
      }
    });

    participantsRef.current = list;
    setLiveParticipants(list);
  }, [participantName, role]);

  const disconnect = useCallback(() => {
    isConnectingRef.current = false;
    isConnectedRef.current = false;
    if (roomRef.current) {
      try {
        roomRef.current.remoteParticipants.forEach((p) => {
          p.audioTrackPublications.forEach((pub) => {
            if (pub.track && typeof (pub.track as RemoteAudioTrack).detach === "function") {
              try {
                (pub.track as RemoteAudioTrack).detach();
              } catch {
                // ignore
              }
            }
          });
        });
        roomRef.current.disconnect();
      } catch (e) {
        console.warn("Disconnect error:", e);
      }
      roomRef.current = null;
    }
    setRoom(null);
    setIsConnected(false);
    setIsConnecting(false);
    setLiveParticipants([]);
  }, []);

  const connect = useCallback(async () => {
    if (isConnectingRef.current || isConnectedRef.current) return;
    isConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // 1. Fetch LiveKit Token from API
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          participantName,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.data?.token) {
        throw new Error(data.error || "Failed to obtain LiveKit token");
      }

      const token = data.data.token;

      // 2. Resolve WebSocket URL for LiveKit
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const livekitWsUrl = `${protocol}//${window.location.host}/livekit/`;

      // 3. Create LiveKit Room with resilient config & echo cancellation
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      roomRef.current = newRoom;
      setRoom(newRoom);

      // Event Listeners
      newRoom
        .on(RoomEvent.SignalConnected, () => {
          syncParticipants(newRoom);
        })
        .on(RoomEvent.Connected, () => {
          isConnectedRef.current = true;
          isConnectingRef.current = false;
          setIsConnected(true);
          setIsConnecting(false);
          syncParticipants(newRoom);
        })
        .on(RoomEvent.ConnectionStateChanged, (state) => {
          if (state === "connected") {
            isConnectedRef.current = true;
            isConnectingRef.current = false;
            setIsConnected(true);
            setIsConnecting(false);
          } else if (state === "disconnected") {
            isConnectedRef.current = false;
            isConnectingRef.current = false;
            setIsConnected(false);
            setIsConnecting(false);
          }
          syncParticipants(newRoom);
        })
        .on(RoomEvent.Disconnected, () => {
          isConnectedRef.current = false;
          isConnectingRef.current = false;
          setIsConnected(false);
          setIsConnecting(false);
          setLiveParticipants([]);
        })
        .on(RoomEvent.ParticipantConnected, () => {
          syncParticipants(newRoom);
          if (role === "HOST" && typeof window !== "undefined") {
            try {
              const currentStore = useStudioStore.getState();
              const onStageIds = currentStore.participants
                .filter((p: any) => p.status === "ON_STAGE")
                .map((p: any) => p.id);
              setTimeout(() => {
                try {
                  if (newRoom.localParticipant && newRoom.state === "connected") {
                    const payload = JSON.stringify({
                      type: "STAGE_SYNC",
                      senderId: newRoom.localParticipant.identity,
                      stageParticipantIds: onStageIds.map(String),
                      activeLayout: currentStore.activeLayout,
                      layoutSplitRatio: currentStore.layoutSplitRatio,
                    });
                    newRoom.localParticipant
                      .publishData(new TextEncoder().encode(payload), { reliable: true })
                      .catch((err) => {
                        console.warn("ParticipantConnected publishData error:", err);
                      });
                  }
                } catch (timeoutErr) {
                  console.warn("ParticipantConnected timeout sync error:", timeoutErr);
                }
              }, 600);
            } catch {
              // ignore
            }
          }
        })
        .on(RoomEvent.ParticipantDisconnected, () => syncParticipants(newRoom))
        .on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
          try {
            const str = new TextDecoder().decode(payload);
            const data = JSON.parse(str);
            if (data.type === "STAGE_SYNC") {
              // Ignore loopback messages from self
              if (data.senderId && newRoom.localParticipant && data.senderId === newRoom.localParticipant.identity) {
                return;
              }

              const stageSet = new Set((data.stageParticipantIds || []).map(String));
              setLiveParticipants((prev) => {
                let hasChange = false;
                for (const p of prev) {
                  const expectedStatus = stageSet.has(String(p.id)) ? "ON_STAGE" : "BACKSTAGE";
                  if (p.status !== expectedStatus) {
                    hasChange = true;
                    break;
                  }
                }
                if (!hasChange) return prev;

                const updated: Participant[] = prev.map((p) => ({
                  ...p,
                  status: (stageSet.has(String(p.id)) ? "ON_STAGE" : "BACKSTAGE") as Participant["status"],
                }));
                participantsRef.current = updated;
                return updated;
              });

              // HOST is the master controller of studio layout, split ratio, and stage.
              // Only GUEST/CO_HOST/PRODUCER sync their local store from incoming host broadcasts!
              if (role !== "HOST" && typeof window !== "undefined") {
                try {
                  if (data.activeLayout) {
                    useStudioStore.getState().setLayout(data.activeLayout);
                  }
                  if (typeof data.layoutSplitRatio === "number") {
                    useStudioStore.getState().setLayoutSplitRatio(data.layoutSplitRatio);
                  }
                  if (Array.isArray(data.stageParticipantIds)) {
                    useStudioStore.getState().setStageParticipants(data.stageParticipantIds);
                  }
                } catch {
                  // ignore
                }
              }
            }
          } catch (e) {
            console.warn("Failed to parse LiveKit data message:", e);
          }
        })
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          // Auto-play remote audio through browser speaker
          if (track.kind === Track.Kind.Audio && typeof (track as RemoteAudioTrack).attach === "function") {
            try {
              (track as RemoteAudioTrack).attach();
            } catch (e) {
              console.warn("Audio attach error:", e);
            }
          }
          syncParticipants(newRoom);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio && typeof (track as RemoteAudioTrack).detach === "function") {
            try {
              (track as RemoteAudioTrack).detach();
            } catch (e) {
              console.warn("Audio detach error:", e);
            }
          }
          syncParticipants(newRoom);
        })
        .on(RoomEvent.TrackMuted, () => syncParticipants(newRoom))
        .on(RoomEvent.TrackUnmuted, () => syncParticipants(newRoom))
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const speakerIds = new Set(speakers.map((s) => s.identity));
          setLiveParticipants((prev) => {
            const updated = prev.map((p) => {
              const isSp = speakerIds.has(String(p.id));
              if (p.isSpeaking === isSp) return p;
              return { ...p, isSpeaking: isSp };
            });
            participantsRef.current = updated;
            return updated;
          });
        })
        .on(RoomEvent.LocalTrackPublished, () => syncParticipants(newRoom))
        .on(RoomEvent.LocalTrackUnpublished, () => syncParticipants(newRoom));

      // 4. Connect to Room naturally without artificial timeout
      await newRoom.connect(livekitWsUrl, token, { autoSubscribe: true });

      // 5. Automatically enable Local Camera & Microphone
      try {
        await newRoom.localParticipant.setCameraEnabled(true);
        await newRoom.localParticipant.setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        setCamEnabled(true);
        setMicEnabled(true);
      } catch (mediaErr) {
        console.warn("Camera/mic access warning:", mediaErr);
      }

      syncParticipants(newRoom);
    } catch (err: unknown) {
      console.error("LiveKit connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      isConnectingRef.current = false;
      isConnectedRef.current = false;
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [roomName, participantName, role, syncParticipants]);

  const toggleCamera = useCallback(async () => {
    if (!roomRef.current) return false;
    const nextState = !camEnabled;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(nextState);
      setCamEnabled(nextState);
      syncParticipants(roomRef.current);
      return nextState;
    } catch (err) {
      console.error("Failed to toggle camera:", err);
      return camEnabled;
    }
  }, [camEnabled, syncParticipants]);

  const toggleMicrophone = useCallback(async () => {
    if (!roomRef.current) return false;
    const nextState = !micEnabled;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      setMicEnabled(nextState);
      syncParticipants(roomRef.current);
      return nextState;
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
      return micEnabled;
    }
  }, [micEnabled, syncParticipants]);

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return false;
    const nextState = !screenEnabled;
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(nextState);
      setScreenEnabled(nextState);
      syncParticipants(roomRef.current);
      return nextState;
    } catch (err) {
      console.error("Failed to toggle screen share:", err);
      return screenEnabled;
    }
  }, [screenEnabled, syncParticipants]);

  // Mobile front/back camera switch
  const flipCamera = useCallback(async () => {
    if (!roomRef.current) return;
    const nextFacing = facingMode === "user" ? "environment" : "user";
    try {
      await roomRef.current.localParticipant.setCameraEnabled(false);
      await roomRef.current.localParticipant.setCameraEnabled(true, {
        facingMode: nextFacing,
      });
      setFacingMode(nextFacing);
      syncParticipants(roomRef.current);
    } catch (err) {
      console.warn("Failed to switch camera:", err);
    }
  }, [facingMode, syncParticipants]);

  // Device switcher callbacks
  const setAudioDevice = useCallback(async (deviceId: string) => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.switchActiveDevice("audioinput", deviceId);
    } catch (e) {
      console.warn("Failed to switch audio device:", e);
    }
  }, []);

  const setVideoDevice = useCallback(async (deviceId: string) => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.switchActiveDevice("videoinput", deviceId);
    } catch (e) {
      console.warn("Failed to switch video device:", e);
    }
  }, []);

  // Connect on mount / when room parameters change
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [roomName, participantName, role, autoConnect]);

  // Broadcast stage sync across room
  const publishStageSync = useCallback(
    async (stageParticipantIds: (string | number)[], layout?: string, splitRatio?: number) => {
      if (!roomRef.current?.localParticipant || roomRef.current.state !== "connected") return;
      try {
        let activeL = layout;
        let splitR = splitRatio;
        if (typeof window !== "undefined" && (!activeL || splitR === undefined)) {
          try {
            const st = useStudioStore.getState();
            if (!activeL) activeL = st.activeLayout;
            if (splitR === undefined) splitR = st.layoutSplitRatio;
          } catch {
            // ignore
          }
        }
        const payload = JSON.stringify({
          type: "STAGE_SYNC",
          senderId: roomRef.current.localParticipant.identity,
          stageParticipantIds: stageParticipantIds.map(String),
          activeLayout: activeL,
          layoutSplitRatio: splitR ?? 50,
        });
        await roomRef.current.localParticipant
          .publishData(new TextEncoder().encode(payload), { reliable: true })
          .catch((err) => {
            console.warn("publishStageSync publishData error:", err);
          });
      } catch (err) {
        console.warn("Failed to broadcast stage sync:", err);
      }
    },
    []
  );

  return {
    room,
    isConnected,
    isConnecting,
    error,
    camEnabled,
    cameraEnabled: camEnabled,
    micEnabled,
    screenEnabled,
    facingMode,
    localVideoTrack,
    localAudioTrack,
    screenTrack,
    liveParticipants,
    participants: liveParticipants,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    flipCamera,
    setAudioDevice,
    setVideoDevice,
    publishStageSync,
    connect,
    disconnect,
  };
}
