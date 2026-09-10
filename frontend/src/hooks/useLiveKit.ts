"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  LocalParticipant,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalTrackPublication,
  LocalVideoTrack,
  LocalAudioTrack,
} from "livekit-client";
import { Participant } from "@/types";

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
  const roomRef = useRef<Room | null>(null);

  // Helper to re-map all LiveKit participants into our Participant state
  const syncParticipants = useCallback((currentRoom: Room) => {
    const list: Participant[] = [];

    // Local Participant
    const local = currentRoom.localParticipant;
    let localCamTrack: LocalVideoTrack | null = null;
    let localMicTrack: LocalAudioTrack | null = null;
    let localScrTrack: LocalVideoTrack | null = null;

    local.videoTrackPublications.forEach((pub) => {
      if (pub.source === Track.Source.ScreenShare) {
        localScrTrack = (pub.track as LocalVideoTrack) || null;
      } else {
        localCamTrack = (pub.track as LocalVideoTrack) || null;
      }
    });

    local.audioTrackPublications.forEach((pub) => {
      localMicTrack = (pub.track as LocalAudioTrack) || null;
    });

    setLocalVideoTrack(localCamTrack);
    setLocalAudioTrack(localMicTrack);
    setScreenTrack(localScrTrack);

    list.push({
      id: local.identity,
      name: local.name || participantName,
      role: role.toLowerCase() as any,
      status: "ON_STAGE",
      micOn: local.isMicrophoneEnabled,
      camOn: local.isCameraEnabled,
      isSpeaking: local.isSpeaking,
      isLocal: true,
      videoTrack: localCamTrack,
      audioTrack: localMicTrack,
      connectionQuality: "EXCELLENT",
    });

    // Remote Participants
    currentRoom.remoteParticipants.forEach((remote: RemoteParticipant) => {
      let remoteVideo: any = null;
      let remoteAudio: any = null;

      remote.videoTrackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.isSubscribed && pub.track) {
          remoteVideo = pub.track;
        }
      });

      remote.audioTrackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.isSubscribed && pub.track) {
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

      list.push({
        id: remote.identity,
        name: remote.name || `Guest (${remote.identity.slice(0, 5)})`,
        role: parsedRole as any,
        status: "ON_STAGE",
        micOn: remote.isMicrophoneEnabled,
        camOn: remote.isCameraEnabled,
        isSpeaking: remote.isSpeaking,
        isLocal: false,
        videoTrack: remoteVideo,
        audioTrack: remoteAudio,
        connectionQuality: "GOOD",
      });
    });

    setLiveParticipants(list);
  }, [participantName, role]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
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
      const livekitWsUrl = `${protocol}//${window.location.host}/livekit`;

      // 3. Create LiveKit Room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      roomRef.current = newRoom;
      setRoom(newRoom);

      // Event Listeners
      newRoom
        .on(RoomEvent.Connected, () => {
          setIsConnected(true);
          setIsConnecting(false);
          syncParticipants(newRoom);
        })
        .on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setLiveParticipants([]);
        })
        .on(RoomEvent.ParticipantConnected, () => syncParticipants(newRoom))
        .on(RoomEvent.ParticipantDisconnected, () => syncParticipants(newRoom))
        .on(RoomEvent.TrackSubscribed, () => syncParticipants(newRoom))
        .on(RoomEvent.TrackUnsubscribed, () => syncParticipants(newRoom))
        .on(RoomEvent.TrackMuted, () => syncParticipants(newRoom))
        .on(RoomEvent.TrackUnmuted, () => syncParticipants(newRoom))
        .on(RoomEvent.ActiveSpeakersChanged, () => syncParticipants(newRoom))
        .on(RoomEvent.LocalTrackPublished, () => syncParticipants(newRoom))
        .on(RoomEvent.LocalTrackUnpublished, () => syncParticipants(newRoom));

      // 4. Connect to Room with timeout
      await Promise.race([
        newRoom.connect(livekitWsUrl, token),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout: LiveKit server did not respond within 15s")), 15000)
        ),
      ]);

      // 5. Enable Local Camera & Microphone by default
      try {
        await newRoom.localParticipant.enableCameraAndMicrophone();
        setCamEnabled(true);
        setMicEnabled(true);
      } catch (mediaErr) {
        console.warn("Camera/mic access warning:", mediaErr);
      }

      syncParticipants(newRoom);
    } catch (err: unknown) {
      console.error("LiveKit connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      setIsConnecting(false);
      setIsConnected(false);
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    }
  }, [roomName, participantName, role, isConnecting, isConnected, syncParticipants]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setLiveParticipants([]);
    }
  }, []);

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
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState);
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

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    camEnabled,
    micEnabled,
    screenEnabled,
    localVideoTrack,
    localAudioTrack,
    screenTrack,
    liveParticipants,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    connect,
    disconnect,
  };
}
