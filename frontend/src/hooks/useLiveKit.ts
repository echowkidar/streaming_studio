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
  identity?: string;
  serverUrl?: string;
  role?: "HOST" | "GUEST" | "CO_HOST";
  autoConnect?: boolean;
  inviteToken?: string;
}

export function useLiveKit({
  roomName,
  participantName,
  identity,
  serverUrl: customServerUrl,
  role = "GUEST",
  autoConnect = true,
  inviteToken,
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
        if (pub.trackName === "stage_composite_video") return;
        if (pub.source === Track.Source.ScreenShare) {
          localScrTrack = (pub.track as LocalVideoTrack) || (pub.videoTrack as LocalVideoTrack) || null;
        } else {
          localCamTrack = (pub.track as LocalVideoTrack) || (pub.videoTrack as LocalVideoTrack) || null;
        }
      });

      local.audioTrackPublications.forEach((pub) => {
        if (pub.trackName === "stage_composite_audio") return;
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
      let localStoreStatus: Participant["status"] | undefined = undefined;
      if (typeof window !== "undefined") {
        try {
          const stP = useStudioStore.getState().participants.find((p) => String(p.id) === local.identity);
          if (stP) localStoreStatus = stP.status;
        } catch {}
      }
      const existingLocal = participantsRef.current.find((p) => p.id === local.identity);
      const localStatus = localStoreStatus || (existingLocal ? existingLocal.status : (role === "HOST" ? "ON_STAGE" : "BACKSTAGE"));

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
        if (pub.trackName === "stage_composite_video") return;
        if (pub.source === Track.Source.ScreenShare) {
          remoteScrTrack = pub.track || (pub.videoTrack as any) || null;
        } else {
          remoteCamTrack = pub.track || (pub.videoTrack as any) || null;
        }
      });

      if (!remoteScrTrack) {
        const scrPub = remote.getTrackPublication(Track.Source.ScreenShare);
        if (scrPub && scrPub.trackName !== "stage_composite_video") {
          remoteScrTrack = scrPub.track || (scrPub.videoTrack as any) || null;
        }
      }
      if (!remoteCamTrack) {
        const camPub = remote.getTrackPublication(Track.Source.Camera);
        if (camPub && camPub.trackName !== "stage_composite_video") {
          remoteCamTrack = camPub.track || (camPub.videoTrack as any) || null;
        }
      }

      remote.audioTrackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.trackName === "stage_composite_audio") return;
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

      // StreamYard rule: preserve existing status if host placed them ON_STAGE/BACKSTAGE,
      // otherwise check studio store, then default new guests to BACKSTAGE
      let storeStatus: Participant["status"] | undefined = undefined;
      let storeMicOn: boolean | undefined = undefined;
      if (typeof window !== "undefined") {
        try {
          const stP = useStudioStore.getState().participants.find((p) => String(p.id) === remote.identity);
          if (stP) {
            storeStatus = stP.status;
            storeMicOn = stP.micOn;
          }
        } catch {}
      }
      const existing = participantsRef.current.find((p) => p.id === remote.identity);
      const isHostRole = parsedRole === "host" || parsedRole === "co_host";
      const remoteStatus = storeStatus || (existing ? existing.status : (isHostRole ? "ON_STAGE" : "BACKSTAGE"));

      const camPub = remote.getTrackPublication(Track.Source.Camera);
      const micPub = remote.getTrackPublication(Track.Source.Microphone);

      const isRemoteCamActive =
        remote.isCameraEnabled && !!remoteCamTrack && !camPub?.isMuted;

      // LiveKit's real hardware/publication state is the primary source of truth!
      const isRemoteMicActive = micPub
        ? !micPub.isMuted && remote.isMicrophoneEnabled !== false
        : Boolean(remote.isMicrophoneEnabled && remoteAudio);

      // Keep studioStore in sync when remote guest mutes/unmutes from their own phone
      if (typeof window !== "undefined") {
        try {
          const stP = useStudioStore.getState().participants.find((p) => String(p.id) === remote.identity);
          if (stP && (stP.micOn !== isRemoteMicActive || stP.camOn !== isRemoteCamActive)) {
            useStudioStore.getState().updateParticipant(remote.identity, {
              micOn: isRemoteMicActive,
              camOn: isRemoteCamActive,
            });
          }
        } catch {}
      }

      // DOM audio element silence sync: mute or unmute attached audio tags directly
      remote.audioTrackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.audioTrack && Array.isArray((pub.audioTrack as any).attachedElements)) {
          (pub.audioTrack as any).attachedElements.forEach((el: HTMLMediaElement) => {
            el.muted = !isRemoteMicActive;
          });
        }
      });

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
          identity,
          role,
          inviteToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.data?.token) {
        throw new Error(data.error || "Failed to obtain LiveKit token");
      }

      const token = data.data.token;

      // 2. Resolve WebSocket URL for LiveKit (Cloud URL or self-hosted)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const defaultLocalWs = `${protocol}//${window.location.host}/livekit/`;
      const livekitWsUrl =
        customServerUrl ||
        data.data?.serverUrl ||
        process.env.NEXT_PUBLIC_LIVEKIT_URL ||
        process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ||
        defaultLocalWs;

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
                      mediaSlotIndex: currentStore.mediaSlotIndex ?? 0,
                      participantBounds: currentStore.participantBounds || {},
                      activeMedia: currentStore.activeMedia || null,
                      tileTransforms: currentStore.tileTransforms || {},
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
                  if (typeof data.mediaSlotIndex === "number") {
                    useStudioStore.getState().setMediaSlotIndex(data.mediaSlotIndex);
                  }
                  if (Array.isArray(data.stageParticipantIds)) {
                    const stageIds = data.stageParticipantIds.map(String);
                    useStudioStore.getState().setStageParticipants(stageIds);
                    const stageSet = new Set(stageIds);
                    participantsRef.current = participantsRef.current.map((p) => {
                      const isHost = p.role === "HOST" || p.role === "host" || p.role === "CO_HOST";
                      const onStage = stageSet.has(String(p.id)) || (isHost && stageSet.size === 0);
                      return {
                        ...p,
                        status: onStage ? "ON_STAGE" : "BACKSTAGE",
                      };
                    });
                    setLiveParticipants([...participantsRef.current]);
                  }
                  if (data.participantBounds && typeof data.participantBounds === "object") {
                    useStudioStore.getState().setAllParticipantBounds(data.participantBounds);
                  }
                  if (data.activeMedia !== undefined) {
                    useStudioStore.getState().setActiveMedia(data.activeMedia);
                  }
                  if (data.tileTransforms && typeof data.tileTransforms === "object") {
                    Object.entries(data.tileTransforms).forEach(([tid, trans]: [string, any]) => {
                      useStudioStore.getState().setTileTransform(tid, trans);
                    });
                  }
                } catch {
                  // ignore
                }
              }
            }

            if (data.type === "PRIVATE_CHAT" && data.message) {
              if (data.senderId && newRoom.localParticipant && data.senderId === newRoom.localParticipant.identity) {
                return;
              }
              useStudioStore.getState().addPrivateMessage(data.message, false);
              return;
            }

            if (data.type === "REMOTE_MUTE") {
              const targetId = String(data.targetId || "");
              const shouldMicBeOn = Boolean(data.micOn);

              // Agar ye command is user (Guest) ke liye hai, toh apna local mic mute/unmute karein
              if (newRoom.localParticipant && String(newRoom.localParticipant.identity) === targetId) {
                newRoom.localParticipant.setMicrophoneEnabled(shouldMicBeOn).catch(() => {});
                setMicEnabled(shouldMicBeOn);
              }

              // Remote participant ke audio elements ko mute/unmute karein
              const remoteP = newRoom.remoteParticipants.get(targetId);
              if (remoteP) {
                remoteP.audioTrackPublications.forEach((pub) => {
                  if (pub.audioTrack && Array.isArray((pub.audioTrack as any).attachedElements)) {
                    (pub.audioTrack as any).attachedElements.forEach((el: HTMLMediaElement) => {
                      el.muted = !shouldMicBeOn;
                    });
                  }
                });
              }

              // Sabhi participants ke UI aur store me mic status update karein
              participantsRef.current = participantsRef.current.map((p) =>
                String(p.id) === targetId ? { ...p, micOn: shouldMicBeOn } : p
              );
              setLiveParticipants([...participantsRef.current]);
              useStudioStore.getState().updateParticipant(targetId, { micOn: shouldMicBeOn });
              return;
            }
          } catch (e) {
            console.warn("Failed to parse LiveKit data message:", e);
          }
        })
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication?: RemoteTrackPublication, participant?: RemoteParticipant) => {
          // Auto-play remote audio through browser speaker by appending hidden <audio> to document.body
          if (track.kind === Track.Kind.Audio && typeof (track as RemoteAudioTrack).attach === "function") {
            try {
              const el = (track as RemoteAudioTrack).attach();
              el.autoplay = true;
              (el as any).playsInline = true;
              el.style.display = "none";
              if (typeof document !== "undefined" && !el.parentElement) {
                document.body.appendChild(el);
              }
              const targetId = participant ? participant.identity : "";
              if (targetId && el) {
                const pInStore = useStudioStore.getState().participants.find((p) => String(p.id) === targetId);
                if (pInStore && pInStore.micOn === false) {
                  el.muted = true;
                }
              }
              newRoom.startAudio().catch(() => {});
            } catch (e) {
              console.warn("Audio attach error:", e);
            }
          }
          syncParticipants(newRoom);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio && typeof (track as RemoteAudioTrack).detach === "function") {
            try {
              const els = (track as RemoteAudioTrack).detach();
              els.forEach((el) => el.remove());
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

      // 5. Enable Microphone & Camera independently (If Camera fails or is absent, Mic still works 100%!)
      let micStarted = false;
      let camStarted = false;

      try {
        await newRoom.localParticipant.setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        micStarted = newRoom.localParticipant.isMicrophoneEnabled;
      } catch (micErr) {
        console.warn("Microphone access warning:", micErr);
        micStarted = false;
      }

      try {
        await newRoom.localParticipant.setCameraEnabled(true);
        camStarted = newRoom.localParticipant.isCameraEnabled;
      } catch (camErr) {
        console.warn("Camera access warning (Continuing in Audio-Only / Avatar mode):", camErr);
        camStarted = false;
      }

      setMicEnabled(micStarted);
      setCamEnabled(camStarted);
      newRoom.startAudio().catch(() => {});

      syncParticipants(newRoom);
    } catch (err: unknown) {
      console.error("LiveKit connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      isConnectingRef.current = false;
      isConnectedRef.current = false;
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [roomName, participantName, role, identity, inviteToken, syncParticipants]);

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
    const currentActualMic = roomRef.current.localParticipant.isMicrophoneEnabled;
    const nextState = !currentActualMic;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      setMicEnabled(nextState);
      syncParticipants(roomRef.current);

      // Broadcast mic status change to Host & all participants via DataChannel for 0ms instant UI sync
      if (roomRef.current.state === "connected") {
        const localId = roomRef.current.localParticipant.identity;
        useStudioStore.getState().updateParticipant(localId, { micOn: nextState });
        const payload = JSON.stringify({
          type: "REMOTE_MUTE",
          targetId: localId,
          micOn: nextState,
        });
        roomRef.current.localParticipant
          .publishData(new TextEncoder().encode(payload), { reliable: true })
          .catch(() => {});
      }
      return nextState;
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
      return currentActualMic;
    }
  }, [syncParticipants]);

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

  // Listen for participant mic toggle events (Host or local UI toggling any participant's mic)
  useEffect(() => {
    const handleToggleParticipantMic = (e: Event) => {
      const customEvent = e as CustomEvent<{ participantId: string; micOn: boolean; isLocal: boolean }>;
      const { participantId, micOn, isLocal } = customEvent.detail || {};
      if (!participantId) return;

      const currentRoom = roomRef.current;
      if (!currentRoom) return;

      // 1. Agar local participant hai
      const isActuallyLocal =
        isLocal ||
        (currentRoom.localParticipant && String(currentRoom.localParticipant.identity) === participantId);

      if (isActuallyLocal) {
        currentRoom.localParticipant.setMicrophoneEnabled(micOn).catch((err) => {
          console.warn("Failed to set local microphone enabled:", err);
        });
        setMicEnabled(micOn);
      } else {
        // 2. Agar remote participant hai (Host muting a guest)
        // A. Host ke browser me guest ke audio element ko turant mute/unmute karein
        const remoteP = currentRoom.remoteParticipants.get(participantId);
        if (remoteP) {
          remoteP.audioTrackPublications.forEach((pub) => {
            if (pub.audioTrack && Array.isArray((pub.audioTrack as any).attachedElements)) {
              (pub.audioTrack as any).attachedElements.forEach((el: HTMLMediaElement) => {
                el.muted = !micOn;
              });
            }
          });
        }

        // B. Guest ko LiveKit DataChannel se signal bhejein taaki guest ka local mic hardware/client side band ho jaye
        if (currentRoom.localParticipant && currentRoom.state === "connected") {
          try {
            const payload = JSON.stringify({
              type: "REMOTE_MUTE",
              targetId: participantId,
              micOn,
            });
            currentRoom.localParticipant
              .publishData(new TextEncoder().encode(payload), { reliable: true })
              .catch((err) => console.warn("Failed to publish REMOTE_MUTE:", err));
          } catch (err) {
            console.warn("REMOTE_MUTE publish error:", err);
          }
        }
      }

      // Live participants state aur ref update karein
      participantsRef.current = participantsRef.current.map((p) =>
        String(p.id) === participantId ? { ...p, micOn } : p
      );
      setLiveParticipants([...participantsRef.current]);
    };

    window.addEventListener("livestudio-toggle-participant-mic", handleToggleParticipantMic);
    return () => {
      window.removeEventListener("livestudio-toggle-participant-mic", handleToggleParticipantMic);
    };
  }, []);

  // Listen for private chat dispatch from studio store
  useEffect(() => {
    const handleSendPrivateChat = (e: Event) => {
      try {
        const customEvent = e as CustomEvent;
        const detail = customEvent.detail;
        if (!detail || !roomRef.current?.localParticipant || roomRef.current.state !== "connected") return;
        const payload = JSON.stringify({
          type: "PRIVATE_CHAT",
          senderId: roomRef.current.localParticipant.identity,
          message: detail,
        });
        roomRef.current.localParticipant
          .publishData(new TextEncoder().encode(payload), { reliable: true })
          .catch((err) => console.warn("Failed to publish private chat data:", err));
      } catch (err) {
        console.warn("Error sending private chat:", err);
      }
    };

    window.addEventListener("livestudio-send-private-chat", handleSendPrivateChat);
    return () => {
      window.removeEventListener("livestudio-send-private-chat", handleSendPrivateChat);
    };
  }, []);

  // Broadcast stage sync across room
  const publishStageSync = useCallback(
    async (
      stageParticipantIds: (string | number)[],
      layout?: string,
      splitRatio?: number,
      bounds?: Record<string, any>,
      media?: any,
      slotIndex?: number
    ) => {
      if (!roomRef.current?.localParticipant || roomRef.current.state !== "connected") return;
      try {
        let activeL = layout;
        let splitR = splitRatio;
        let pBounds = bounds;
        let activeM = media;
        let mSlotIndex = slotIndex;
        let tTransforms = undefined;
        if (typeof window !== "undefined") {
          try {
            const st = useStudioStore.getState();
            if (!activeL) activeL = st.activeLayout;
            if (splitR === undefined) splitR = st.layoutSplitRatio;
            if (!pBounds) pBounds = st.participantBounds;
            if (activeM === undefined) activeM = st.activeMedia;
            if (mSlotIndex === undefined) mSlotIndex = st.mediaSlotIndex;
            tTransforms = st.tileTransforms;
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
          mediaSlotIndex: mSlotIndex ?? 0,
          participantBounds: pBounds || {},
          activeMedia: activeM || null,
          tileTransforms: tTransforms || {},
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

  // Explicit stage status updater for host
  const setParticipantStageStatus = useCallback((id: string | number, status: "ON_STAGE" | "BACKSTAGE") => {
    const key = String(id);
    participantsRef.current = participantsRef.current.map((p) =>
      String(p.id) === key ? { ...p, status } : p
    );
    setLiveParticipants((prev) =>
      prev.map((p) => (String(p.id) === key ? { ...p, status } : p))
    );
  }, []);

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
    setParticipantStageStatus,
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
