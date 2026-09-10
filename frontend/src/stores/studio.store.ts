import { create } from "zustand";
import { Participant, LowerThirdBanner, ChatMessage, Destination } from "@/types";

export type StudioLayout = 
  | "solo" 
  | "side-by-side" 
  | "speaker-large" 
  | "three-equal" 
  | "four-grid" 
  | "five-grid" 
  | "six-grid" 
  | "nine-grid" 
  | "pip" 
  | "screen-speaker" 
  | "screen-full" 
  | "presentation" 
  | "podcast" 
  | "interview";

interface StudioState {
  broadcastTitle: string;
  isLive: boolean;
  isRecording: boolean;
  recordDuration: number;
  liveDuration: number;
  viewerCount: number;
  connectionQuality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  
  // Layout
  activeLayout: StudioLayout;
  setLayout: (layout: StudioLayout) => void;

  // Audio / Video device states for local user
  micEnabled: boolean;
  camEnabled: boolean;
  screenShareEnabled: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;

  // Participants
  participants: Participant[];
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string | number) => void;
  updateParticipant: (id: string | number, updates: Partial<Participant>) => void;
  moveToStage: (id: string | number) => void;
  moveToBackstage: (id: string | number) => void;

  // Branding & Overlays
  showLogo: boolean;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoUrl: string;
  activeOverlayUrl: string | null;
  activeBackgroundUrl: string | null;
  activeThemeColor: string;
  activeBanner: LowerThirdBanner | null;
  tickerText: string;
  showTicker: boolean;

  setLogo: (url: string, show?: boolean) => void;
  setOverlay: (url: string | null) => void;
  setBackground: (url: string | null) => void;
  setThemeColor: (color: string) => void;
  setBanner: (banner: LowerThirdBanner | null) => void;
  setTicker: (text: string, show: boolean) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  pinnedMessage: ChatMessage | null;
  pinMessage: (msg: ChatMessage | null) => void;

  // Destinations
  destinations: Destination[];
  toggleDestination: (id: string) => void;

  // Actions
  startLive: () => void;
  endLive: () => void;
  startRecord: () => void;
  stopRecord: () => void;
  setTitle: (title: string) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  broadcastTitle: "Product Launch & Live Q&A Keynote",
  isLive: false,
  isRecording: false,
  recordDuration: 0,
  liveDuration: 0,
  viewerCount: 1420,
  connectionQuality: "EXCELLENT",

  activeLayout: "speaker-large",
  setLayout: (layout) => set({ activeLayout: layout }),

  micEnabled: true,
  camEnabled: true,
  screenShareEnabled: false,
  toggleMic: () => set((s) => ({ micEnabled: !s.micEnabled })),
  toggleCam: () => set((s) => ({ camEnabled: !s.camEnabled })),
  toggleScreenShare: () => set((s) => ({ screenShareEnabled: !s.screenShareEnabled })),

  participants: [],
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((s) => ({ participants: [...s.participants, participant] })),
  removeParticipant: (id) =>
    set((s) => ({ participants: s.participants.filter((p) => p.id !== id) })),
  updateParticipant: (id, updates) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  moveToStage: (id) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === id ? { ...p, status: "ON_STAGE" } : p)),
    })),
  moveToBackstage: (id) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === id ? { ...p, status: "BACKSTAGE" } : p)),
    })),

  showLogo: true,
  logoPosition: "top-right",
  logoUrl: "LiveStudio",
  activeOverlayUrl: null,
  activeBackgroundUrl: null,
  activeThemeColor: "#6366f1",
  activeBanner: {
    id: "banner-1",
    title: "Salar Khan",
    subtitle: "Founder & Lead Architect",
    themeColor: "#6366f1",
    isShowing: true,
  },
  tickerText: "🔥 Welcome to LiveStudio 2.0 • Ask your questions in the live chat! • Streaming to YouTube, Twitch & Custom RTMP",
  showTicker: false,

  setLogo: (url, show) => set((s) => ({ logoUrl: url, showLogo: show !== undefined ? show : s.showLogo })),
  setOverlay: (url) => set({ activeOverlayUrl: url }),
  setBackground: (url) => set({ activeBackgroundUrl: url }),
  setThemeColor: (color) => set({ activeThemeColor: color }),
  setBanner: (banner) => set({ activeBanner: banner }),
  setTicker: (text, show) => set({ tickerText: text, showTicker: show }),

  messages: [
    {
      id: "msg-1",
      platform: "youtube",
      author: "TechGeek24",
      message: "The new UI looks breathtaking! Is this fully self-hosted?",
      timestamp: "12:04 PM",
    },
    {
      id: "msg-2",
      platform: "twitch",
      author: "StreamMaster",
      message: "Can we multistream to 5 destinations at once with zero lag?",
      timestamp: "12:05 PM",
      isHighlighted: true,
    },
    {
      id: "msg-3",
      platform: "webinar",
      author: "Dr. Ayesha",
      message: "Will this support automatic transcripts and AI clips?",
      timestamp: "12:06 PM",
    }
  ],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  pinnedMessage: null,
  pinMessage: (msg) => set({ pinnedMessage: msg }),

  destinations: [
    {
      id: "dest-1",
      name: "YouTube Live - Main Channel",
      platform: "YOUTUBE",
      rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
      status: "LIVE",
      enabled: true,
    },
    {
      id: "dest-2",
      name: "Twitch.tv/TechStream",
      platform: "TWITCH",
      rtmpUrl: "rtmp://live.twitch.tv/app",
      status: "LIVE",
      enabled: true,
    },
    {
      id: "dest-3",
      name: "Facebook Live Page",
      platform: "FACEBOOK",
      rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp",
      status: "DISCONNECTED",
      enabled: false,
    },
    {
      id: "dest-4",
      name: "Custom RTMP CDN",
      platform: "CUSTOM_RTMP",
      rtmpUrl: "rtmp://stream.cdn.example.com/app",
      status: "LIVE",
      enabled: true,
    }
  ],
  toggleDestination: (id) =>
    set((s) => ({
      destinations: s.destinations.map((d) =>
        d.id === id ? { ...d, enabled: !d.enabled } : d
      ),
    })),

  startLive: () => set({ isLive: true }),
  endLive: () => set({ isLive: false }),
  startRecord: () => set({ isRecording: true }),
  stopRecord: () => set({ isRecording: false }),
  setTitle: (title) => set({ broadcastTitle: title }),
}));
