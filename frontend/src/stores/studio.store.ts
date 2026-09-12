import { create } from "zustand";
import { Participant, LowerThirdBanner, ChatMessage, Destination, StageOverlayAsset } from "@/types";

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
  | "interview"
  | "custom";

export interface CustomLayoutConfig {
  mode: "grid" | "hero-side" | "hero-bottom" | "pip" | "cinema";
  columns: 1 | 2 | 3 | 4;
  gap: number; // 0, 8, 12, 16, 24
  borderRadius: number; // 0, 8, 16, 24
  heroParticipantId: string | number | null;
  pipPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pipSize: "small" | "medium" | "large";
  highlightColor: string;
  showSpeakerBorder: boolean;
}

export interface TileTransform {
  fitMode: "contain" | "cover";
  zoom: number; // 1 to 2.5
  panX: number; // % offset (-50 to 50)
  panY: number; // % offset (-50 to 50)
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
}

export interface ParticipantBounds {
  x: number; // percentage left: 0 to 100
  y: number; // percentage top: 0 to 100
  width: number; // percentage width: 10 to 100
  height: number; // percentage height: 10 to 100
  zIndex: number;
  isLockedRatio?: boolean;
}

interface StudioState {
  broadcastTitle: string;
  setTitle: (title: string) => void;
  tileTransforms: Record<string, TileTransform>;
  setTileTransform: (id: string | number, updates: Partial<TileTransform>) => void;
  resetTileTransform: (id: string | number) => void;
  isLive: boolean;
  isRecording: boolean;
  recordDuration: number;
  liveDuration: number;
  viewerCount: number;
  connectionQuality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  
  // Layout
  activeLayout: StudioLayout;
  setLayout: (layout: StudioLayout) => void;
  layoutSplitRatio: number; // 20 to 80 (default 50)
  setLayoutSplitRatio: (ratio: number) => void;
  customLayoutConfig: CustomLayoutConfig;
  setCustomLayoutConfig: (config: Partial<CustomLayoutConfig>) => void;

  // Freeform Window Bounds & Selection Tool (StreamYard parity)
  participantBounds: Record<string, ParticipantBounds>;
  setParticipantBounds: (id: string | number, bounds: Partial<ParticipantBounds>) => void;
  resetParticipantBounds: (id: string | number) => void;
  resetAllParticipantBounds: () => void;
  setAllParticipantBounds: (allBounds: Record<string, ParticipantBounds>) => void;
  selectedParticipantId: string | number | null;
  setSelectedParticipantId: (id: string | number | null) => void;
  isFreeformMode: boolean;
  setIsFreeformMode: (enabled: boolean) => void;
  bringToFront: (id: string | number) => void;
  sendToBack: (id: string | number) => void;

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
  setStageParticipants: (stageIds: (string | number)[]) => void;

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
  setLogoPosition: (pos: "top-left" | "top-right" | "bottom-left" | "bottom-right") => void;
  setOverlay: (url: string | null) => void;
  setBackground: (url: string | null) => void;
  setThemeColor: (color: string) => void;
  setBanner: (banner: LowerThirdBanner | null) => void;
  setTicker: (text: string, show: boolean) => void;

  // Stage Live Overlay & Floating Assets (StreamYard parity)
  activeStageOverlay: StageOverlayAsset | null;
  overlayHistory: StageOverlayAsset[];
  setStageOverlay: (overlay: StageOverlayAsset | null) => void;
  toggleStageOverlay: (overlay: StageOverlayAsset) => void;
  updateStageOverlay: (updates: Partial<StageOverlayAsset>) => void;
  toggleStageOverlayVisibility: () => void;
  saveToOverlayHistory: (overlay: StageOverlayAsset) => void;
  updateOverlayInHistory: (id: string, updates: Partial<StageOverlayAsset>) => void;
  removeFromOverlayHistory: (id: string) => void;
  restoreDefaultOverlays: () => void;

  // Media playback on stage
  activeMedia: {
    id: string;
    name: string;
    type: "video" | "audio" | "image" | "pdf";
    url: string;
  } | null;
  setActiveMedia: (
    media: {
      id: string;
      name: string;
      type: "video" | "audio" | "image" | "pdf";
      url: string;
    } | null
  ) => void;

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
}

export const DEFAULT_STUDIO_OVERLAYS: StageOverlayAsset[] = [
  {
    id: "preset-badge",
    name: "Round Speaker Badge",
    type: "image",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    position: "bottom-right",
    scale: 22,
    cropMode: "circle",
    borderRadius: 9999,
    opacity: 100,
    isShowing: true,
    isMuted: true,
    isLooping: true,
    showBackdrop: false,
  },
  {
    id: "preset-sponsor",
    name: "Sponsor Spotlight",
    type: "image",
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
    position: "top-right",
    scale: 28,
    cropMode: "cover",
    borderRadius: 16,
    opacity: 100,
    isShowing: true,
    isMuted: true,
    isLooping: true,
    showBackdrop: false,
  },
  {
    id: "sample-qa-graphic",
    name: "Live Q&A Box",
    type: "image",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    position: "bottom-left",
    scale: 30,
    cropMode: "cover",
    borderRadius: 12,
    opacity: 95,
    isShowing: true,
    showBackdrop: false,
  },
  {
    id: "preset-breaking",
    name: "Breaking Alert Graphic",
    type: "image",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    position: "top-left",
    scale: 32,
    cropMode: "cover",
    borderRadius: 12,
    opacity: 100,
    isShowing: true,
    isMuted: true,
    isLooping: true,
    showBackdrop: false,
  },
  {
    id: "preset-video-clip",
    name: "Video Showcase Clip",
    type: "video",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    position: "bottom-left",
    scale: 35,
    cropMode: "cover",
    borderRadius: 16,
    opacity: 100,
    isShowing: true,
    isMuted: true,
    isLooping: true,
    showBackdrop: false,
  },
  {
    id: "sample-sponsor-badge",
    name: "Sponsor Brand Card",
    type: "image",
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80",
    position: "top-right",
    scale: 28,
    cropMode: "cover",
    borderRadius: 16,
    opacity: 100,
    isShowing: true,
    showBackdrop: false,
  },
];

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
  layoutSplitRatio: 50,
  setLayoutSplitRatio: (ratio) => set({ layoutSplitRatio: Math.max(20, Math.min(80, ratio)) }),

  // Freeform Window Bounds & Selection Tool (StreamYard parity)
  participantBounds: {},
  selectedParticipantId: null,
  isFreeformMode: false,
  setSelectedParticipantId: (id) => set({ selectedParticipantId: id !== null ? String(id) : null }),
  setIsFreeformMode: (enabled) => set({ isFreeformMode: enabled }),
  setParticipantBounds: (id, updates) =>
    set((s) => {
      const key = String(id);
      const existing = s.participantBounds[key] || {
        x: 10,
        y: 10,
        width: 45,
        height: 45,
        zIndex: 10,
        isLockedRatio: true,
      };
      const merged = { ...existing, ...updates };
      // Clamp bounds safely within stage
      merged.width = Math.max(10, Math.min(100, merged.width));
      merged.height = Math.max(8, Math.min(100, merged.height));
      merged.x = Math.max(0, Math.min(100 - merged.width, merged.x));
      merged.y = Math.max(0, Math.min(100 - merged.height, merged.y));
      return {
        participantBounds: {
          ...s.participantBounds,
          [key]: merged,
        },
      };
    }),
  resetParticipantBounds: (id) =>
    set((s) => {
      const key = String(id);
      const next = { ...s.participantBounds };
      delete next[key];
      return { participantBounds: next };
    }),
  resetAllParticipantBounds: () => set({ participantBounds: {}, selectedParticipantId: null }),
  setAllParticipantBounds: (allBounds) => set({ participantBounds: allBounds || {} }),
  bringToFront: (id) =>
    set((s) => {
      const key = String(id);
      const boundsList = Object.values(s.participantBounds);
      const maxZ = boundsList.length > 0 ? Math.max(10, ...boundsList.map((b) => b.zIndex || 10)) : 10;
      const current = s.participantBounds[key];
      if (!current) return s;
      return {
        participantBounds: {
          ...s.participantBounds,
          [key]: { ...current, zIndex: maxZ + 1 },
        },
      };
    }),
  sendToBack: (id) =>
    set((s) => {
      const key = String(id);
      const boundsList = Object.values(s.participantBounds);
      const minZ = boundsList.length > 0 ? Math.min(10, ...boundsList.map((b) => b.zIndex || 10)) : 10;
      const current = s.participantBounds[key];
      if (!current) return s;
      return {
        participantBounds: {
          ...s.participantBounds,
          [key]: { ...current, zIndex: Math.max(1, minZ - 1) },
        },
      };
    }),

  customLayoutConfig: {
    mode: "hero-side",
    columns: 2,
    gap: 12,
    borderRadius: 16,
    heroParticipantId: null,
    pipPosition: "bottom-right",
    pipSize: "medium",
    highlightColor: "#6366f1",
    showSpeakerBorder: true,
  },
  setCustomLayoutConfig: (config) =>
    set((s) => ({
      customLayoutConfig: { ...s.customLayoutConfig, ...config },
    })),

  micEnabled: true,
  camEnabled: true,
  screenShareEnabled: false,
  toggleMic: () => set((s) => ({ micEnabled: !s.micEnabled })),
  toggleCam: () => set((s) => ({ camEnabled: !s.camEnabled })),
  toggleScreenShare: () => set((s) => ({ screenShareEnabled: !s.screenShareEnabled })),

  participants: [],
  setParticipants: (newParticipants) =>
    set((s) => {
      const existingStatusMap = new Map(s.participants.map((p) => [String(p.id), p.status]));
      const merged = newParticipants.map((p) => {
        const existingStatus = existingStatusMap.get(String(p.id));
        return {
          ...p,
          status: existingStatus || p.status || (p.role === "host" || p.isLocal || p.isScreen ? "ON_STAGE" : "BACKSTAGE"),
        };
      });
      return { participants: merged };
    }),
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
  setStageParticipants: (stageIds) =>
    set((s) => {
      const stageSet = new Set(stageIds.map(String));
      return {
        participants: s.participants.map((p) => ({
          ...p,
          status: stageSet.has(String(p.id)) ? "ON_STAGE" : "BACKSTAGE",
        })),
      };
    }),

  showLogo: true,
  logoPosition: "top-right",
  logoUrl: "LiveStudio",
  activeOverlayUrl: null,
  activeBackgroundUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80",
  activeThemeColor: "#6366f1",
  activeBanner: null,
  tickerText: "🔥 Welcome to LiveStudio 2.0 • Ask your questions in the live chat! • Streaming to YouTube",
  showTicker: false,

  tileTransforms: {},
  setTileTransform: (id, updates) =>
    set((s) => {
      const key = String(id);
      const isScreen = key.includes("screen");
      const current = s.tileTransforms[key] || {
        fitMode: isScreen ? "contain" : "cover",
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
      };
      return {
        tileTransforms: {
          ...s.tileTransforms,
          [key]: { ...current, ...updates },
        },
      };
    }),
  resetTileTransform: (id) =>
    set((s) => {
      const key = String(id);
      const isScreen = key.includes("screen");
      return {
        tileTransforms: {
          ...s.tileTransforms,
          [key]: {
            fitMode: isScreen ? "contain" : "cover",
            zoom: 1,
            panX: 0,
            panY: 0,
            rotation: 0,
            flipH: false,
            flipV: false,
          },
        },
      };
    }),

  setLogo: (url, show) => set((s) => ({ logoUrl: url, showLogo: show !== undefined ? show : s.showLogo })),
  setLogoPosition: (pos) => set({ logoPosition: pos }),
  setOverlay: (url) => set({ activeOverlayUrl: url }),
  setBackground: (url) => set({ activeBackgroundUrl: url }),
  setThemeColor: (color) =>
    set((s) => ({
      activeThemeColor: color,
      activeBanner: s.activeBanner ? { ...s.activeBanner, themeColor: color } : null,
      customLayoutConfig: {
        ...s.customLayoutConfig,
        highlightColor: color,
      },
    })),
  setBanner: (banner) => set({ activeBanner: banner }),
  setTicker: (text, show) => set({ tickerText: text, showTicker: show }),

  activeStageOverlay: null,
  overlayHistory: (() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("livestudio_custom_overlays");
        if (saved) {
          const parsed: StageOverlayAsset[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const existingIds = new Set(parsed.map((item) => item.id));
            const missingDefaults = DEFAULT_STUDIO_OVERLAYS.filter((d) => !existingIds.has(d.id));
            return [...parsed, ...missingDefaults];
          }
        }
      } catch (e) {
        console.warn("Failed to load saved overlays:", e);
      }
    }
    return DEFAULT_STUDIO_OVERLAYS;
  })(),
  setStageOverlay: (overlay) => set({ activeStageOverlay: overlay }),
  toggleStageOverlay: (overlay) =>
    set((s) => {
      if (s.activeStageOverlay?.id === overlay.id) {
        return { activeStageOverlay: null };
      }
      return { activeStageOverlay: overlay };
    }),
  updateStageOverlay: (updates) =>
    set((s) => {
      if (!s.activeStageOverlay) return {};
      const updated = { ...s.activeStageOverlay, ...updates };
      return {
        activeStageOverlay: updated,
        overlayHistory: s.overlayHistory.map((item) => (item.id === updated.id ? updated : item)),
      };
    }),
  toggleStageOverlayVisibility: () =>
    set((s) => {
      if (!s.activeStageOverlay) return {};
      return {
        activeStageOverlay: { ...s.activeStageOverlay, isShowing: !s.activeStageOverlay.isShowing },
      };
    }),
  saveToOverlayHistory: (overlay) =>
    set((s) => {
      const filtered = s.overlayHistory.filter((item) => item.id !== overlay.id);
      const newHistory = [overlay, ...filtered.slice(0, 15)];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("livestudio_custom_overlays", JSON.stringify(newHistory));
        } catch {
          // ignore
        }
      }
      return { overlayHistory: newHistory };
    }),
  updateOverlayInHistory: (id, updates) =>
    set((s) => {
      const newHistory = s.overlayHistory.map((item) => (item.id === id ? { ...item, ...updates } : item));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("livestudio_custom_overlays", JSON.stringify(newHistory));
        } catch {
          // ignore
        }
      }
      return {
        overlayHistory: newHistory,
        activeStageOverlay: s.activeStageOverlay?.id === id ? { ...s.activeStageOverlay, ...updates } : s.activeStageOverlay,
      };
    }),
  removeFromOverlayHistory: (id) =>
    set((s) => {
      const newHistory = s.overlayHistory.filter((item) => item.id !== id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("livestudio_custom_overlays", JSON.stringify(newHistory));
        } catch {
          // ignore
        }
      }
      return {
        overlayHistory: newHistory,
        activeStageOverlay: s.activeStageOverlay?.id === id ? null : s.activeStageOverlay,
      };
    }),
  restoreDefaultOverlays: () =>
    set(() => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("livestudio_custom_overlays", JSON.stringify(DEFAULT_STUDIO_OVERLAYS));
        } catch {
          // ignore
        }
      }
      return { overlayHistory: DEFAULT_STUDIO_OVERLAYS };
    }),

  activeMedia: null,
  setActiveMedia: (media) => set({ activeMedia: media }),

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
