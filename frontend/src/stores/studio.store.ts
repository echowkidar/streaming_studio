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

export interface CommentConfig {
  position: "bottom" | "top";
  theme: "default" | "minimal" | "classic" | "bubble";
  showAvatar: boolean;
  fontSize: "small" | "medium" | "large";
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

export interface TickerConfig {
  text: string;
  textColor: string;
  bgColor: string;
  badgeBgColor: string;
  badgeText: string;
  fontSize: "small" | "medium" | "large" | "xlarge";
  speed: "slow" | "normal" | "fast";
}

export interface LogoConfig {
  text: string;
  textColor: string;
  bgColor: string;
  bgOpacity: number;
  isTransparentBg: boolean;
  fontSize: "small" | "medium" | "large";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export interface ChromaKeyConfig {
  enabled: boolean;
  keyColor: string; // e.g. '#00b140' or '#0047bb'
  tolerance: number; // 0.1 to 0.8
  smoothness: number; // 0.0 to 0.4
  spill: number; // 0.0 to 1.0
  backdropType: "stage" | "blur" | "image";
  backdropUrl?: string;
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
  activeBackgroundType: "image" | "video";
  activeThemeColor: string;
  activeBanner: LowerThirdBanner | null;
  tickerText: string;
  showTicker: boolean;
  tickerConfig: TickerConfig;
  setTickerConfig: (config: Partial<TickerConfig>) => void;
  logoConfig: LogoConfig;
  setLogoConfig: (config: Partial<LogoConfig>) => void;
  chromaKeyConfig: ChromaKeyConfig;
  setChromaKeyConfig: (config: Partial<ChromaKeyConfig>) => void;
  isLeftSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  toggleLeftSidebar: () => void;

  setLogo: (url: string, show?: boolean) => void;
  setLogoPosition: (pos: "top-left" | "top-right" | "bottom-left" | "bottom-right") => void;
  setOverlay: (url: string | null) => void;
  setBackground: (url: string | null, type?: "image" | "video") => void;
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
    loop?: boolean;
  } | null;
  setActiveMedia: (
    media: {
      id: string;
      name: string;
      type: "video" | "audio" | "image" | "pdf";
      url: string;
      loop?: boolean;
    } | null
  ) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  pinnedMessage: ChatMessage | null;
  pinMessage: (msg: ChatMessage | null) => void;
  commentConfig: CommentConfig;
  setCommentConfig: (config: Partial<CommentConfig>) => void;

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

const STUDIO_LAYOUT_STORAGE_KEY = "livestudio_saved_studio_layout";

interface SavedStudioLayoutState {
  activeLayout?: StudioLayout;
  layoutSplitRatio?: number;
  participantBounds?: Record<string, ParticipantBounds>;
  customLayoutConfig?: CustomLayoutConfig;
  isFreeformMode?: boolean;
  tileTransforms?: Record<string, TileTransform>;
  activeBackgroundUrl?: string | null;
  activeBackgroundType?: "image" | "video";
  activeThemeColor?: string;
  tickerText?: string;
  showTicker?: boolean;
  tickerConfig?: TickerConfig;
  logoConfig?: LogoConfig;
  showLogo?: boolean;
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  activeBanner?: LowerThirdBanner | null;
  chromaKeyConfig?: ChromaKeyConfig;
  activeStageOverlay?: StageOverlayAsset | null;
  activeOverlayUrl?: string | null;
  commentConfig?: CommentConfig;
}

function loadSavedStudioLayout(): SavedStudioLayoutState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STUDIO_LAYOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistStudioLayout(updates: Partial<SavedStudioLayoutState>) {
  if (typeof window === "undefined") return;
  try {
    const current = loadSavedStudioLayout();
    const next = { ...current, ...updates };
    localStorage.setItem(STUDIO_LAYOUT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const savedLayout = loadSavedStudioLayout();

export const useStudioStore = create<StudioState>((set) => ({
  broadcastTitle: "Product Launch & Live Q&A Keynote",
  isLive: false,
  isRecording: false,
  recordDuration: 0,
  liveDuration: 0,
  viewerCount: 1420,
  connectionQuality: "EXCELLENT",

  activeLayout: savedLayout.activeLayout || "speaker-large",
  setLayout: (layout) => {
    persistStudioLayout({ activeLayout: layout, participantBounds: {} });
    set({ activeLayout: layout, participantBounds: {}, selectedParticipantId: null });
  },
  layoutSplitRatio: savedLayout.layoutSplitRatio !== undefined ? savedLayout.layoutSplitRatio : 50,
  setLayoutSplitRatio: (ratio) => {
    const clamped = Math.max(20, Math.min(80, ratio));
    persistStudioLayout({ layoutSplitRatio: clamped });
    set({ layoutSplitRatio: clamped });
  },

  // Freeform Window Bounds & Selection Tool (StreamYard parity)
  participantBounds: savedLayout.participantBounds || {},
  selectedParticipantId: null,
  isFreeformMode: savedLayout.isFreeformMode !== undefined ? savedLayout.isFreeformMode : false,
  setSelectedParticipantId: (id) => set({ selectedParticipantId: id !== null ? String(id) : null }),
  setIsFreeformMode: (enabled) => {
    persistStudioLayout({ isFreeformMode: enabled });
    set({ isFreeformMode: enabled });
  },
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
      const nextBounds = {
        ...s.participantBounds,
        [key]: merged,
      };

      // Also persist under stable alias keys so positions remain valid across refreshes
      const p = s.participants.find((item) => String(item.id) === key);
      if (p?.isLocal || key.includes("host") || key.includes("local")) {
        nextBounds["local-host"] = merged;
      }
      if (p?.isScreen || key.includes("screen")) {
        nextBounds["screen-share"] = merged;
      }
      const onStageIndex = s.participants
        .filter((item) => item.status === "ON_STAGE")
        .findIndex((item) => String(item.id) === key);
      if (onStageIndex >= 0) {
        nextBounds[`slot-${onStageIndex}`] = merged;
      }

      persistStudioLayout({ participantBounds: nextBounds });
      return {
        participantBounds: nextBounds,
      };
    }),
  resetParticipantBounds: (id) =>
    set((s) => {
      const key = String(id);
      const next = { ...s.participantBounds };
      delete next[key];
      const p = s.participants.find((item) => String(item.id) === key);
      if (p?.isLocal || key.includes("host") || key.includes("local")) {
        delete next["local-host"];
      }
      if (p?.isScreen || key.includes("screen")) {
        delete next["screen-share"];
      }
      const onStageIndex = s.participants
        .filter((item) => item.status === "ON_STAGE")
        .findIndex((item) => String(item.id) === key);
      if (onStageIndex >= 0) {
        delete next[`slot-${onStageIndex}`];
      }
      persistStudioLayout({ participantBounds: next });
      return { participantBounds: next };
    }),
  resetAllParticipantBounds: () => {
    persistStudioLayout({ participantBounds: {} });
    set({ participantBounds: {}, selectedParticipantId: null });
  },
  setAllParticipantBounds: (allBounds) => {
    const safeBounds = allBounds || {};
    persistStudioLayout({ participantBounds: safeBounds });
    set({ participantBounds: safeBounds });
  },
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
    ...(savedLayout.customLayoutConfig || {}),
  },
  setCustomLayoutConfig: (config) =>
    set((s) => {
      const nextConfig = { ...s.customLayoutConfig, ...config };
      persistStudioLayout({ customLayoutConfig: nextConfig, participantBounds: {} });
      return { customLayoutConfig: nextConfig, participantBounds: {} };
    }),

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

  showLogo: savedLayout.showLogo !== undefined ? savedLayout.showLogo : true,
  logoPosition: savedLayout.logoPosition || "top-right",
  logoUrl: savedLayout.logoConfig?.text || "LiveStudio",
  activeOverlayUrl: savedLayout.activeOverlayUrl !== undefined ? savedLayout.activeOverlayUrl : null,
  activeBackgroundUrl:
    savedLayout.activeBackgroundUrl !== undefined
      ? savedLayout.activeBackgroundUrl
      : "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80",
  activeBackgroundType: savedLayout.activeBackgroundType || "image",
  activeThemeColor: savedLayout.activeThemeColor || "#6366f1",
  activeBanner: savedLayout.activeBanner !== undefined ? savedLayout.activeBanner : null,
  tickerText:
    savedLayout.tickerText ||
    "🔥 Welcome to LiveStudio 2.0 • Ask your questions in the live chat! • Streaming to YouTube",
  showTicker: savedLayout.showTicker !== undefined ? savedLayout.showTicker : false,

  tileTransforms: savedLayout.tileTransforms || {},
  setTileTransform: (id, updates) =>
    set((s) => {
      const key = String(id);
      const isScreen = key.includes("screen");
      const current: TileTransform = s.tileTransforms[key] || {
        fitMode: (isScreen ? "contain" : "cover") as "contain" | "cover",
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
      };
      const nextTransforms: Record<string, TileTransform> = {
        ...s.tileTransforms,
        [key]: { ...current, ...updates },
      };
      persistStudioLayout({ tileTransforms: nextTransforms });
      return {
        tileTransforms: nextTransforms,
      };
    }),
  resetTileTransform: (id) =>
    set((s) => {
      const key = String(id);
      const isScreen = key.includes("screen");
      const defaultTransform: TileTransform = {
        fitMode: (isScreen ? "contain" : "cover") as "contain" | "cover",
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
      };
      const nextTransforms: Record<string, TileTransform> = {
        ...s.tileTransforms,
        [key]: defaultTransform,
      };
      persistStudioLayout({ tileTransforms: nextTransforms });
      return {
        tileTransforms: nextTransforms,
      };
    }),

  tickerConfig: {
    text: "🔥 Welcome to LiveStudio 2.0 • Ask your questions in the live chat! • Streaming to YouTube",
    textColor: "#ffffff",
    bgColor: "#050508",
    badgeBgColor: "#e11d48",
    badgeText: "LIVE UPDATES",
    fontSize: "medium",
    speed: "normal",
    ...(savedLayout.tickerConfig || {}),
  },
  setTickerConfig: (updates) =>
    set((s) => {
      const next = { ...s.tickerConfig, ...updates };
      persistStudioLayout({ tickerConfig: next, tickerText: next.text });
      return {
        tickerConfig: next,
        tickerText: next.text,
      };
    }),

  logoConfig: {
    text: "LiveStudio",
    textColor: "#ffffff",
    bgColor: "#000000",
    bgOpacity: 75,
    isTransparentBg: false,
    fontSize: "medium",
    ...(savedLayout.logoConfig || {}),
  },
  setLogoConfig: (updates) =>
    set((s) => {
      const next = { ...s.logoConfig, ...updates };
      persistStudioLayout({ logoConfig: next });
      return {
        logoConfig: next,
        logoUrl: next.text,
      };
    }),

  chromaKeyConfig: {
    enabled: false,
    keyColor: "#00b140",
    tolerance: 0.38,
    smoothness: 0.12,
    spill: 0.35,
    backdropType: "image",
    backdropUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
    ...(savedLayout.chromaKeyConfig || {}),
  },
  setChromaKeyConfig: (updates) =>
    set((s) => {
      const next = { ...s.chromaKeyConfig, ...updates };
      persistStudioLayout({ chromaKeyConfig: next });
      return { chromaKeyConfig: next };
    }),

  isLeftSidebarCollapsed: false,
  setLeftSidebarCollapsed: (collapsed) => set({ isLeftSidebarCollapsed: collapsed }),
  toggleLeftSidebar: () => set((s) => ({ isLeftSidebarCollapsed: !s.isLeftSidebarCollapsed })),

  setLogo: (url, show) =>
    set((s) => {
      const nextShow = show !== undefined ? show : s.showLogo;
      const nextConfig = { ...s.logoConfig, text: url };
      persistStudioLayout({ showLogo: nextShow, logoConfig: nextConfig });
      return {
        logoUrl: url,
        showLogo: nextShow,
        logoConfig: nextConfig,
      };
    }),
  setLogoPosition: (pos) => {
    persistStudioLayout({ logoPosition: pos });
    set({ logoPosition: pos });
  },
  setOverlay: (url) => {
    persistStudioLayout({ activeOverlayUrl: url });
    set({ activeOverlayUrl: url });
  },
  setBackground: (url, type) => {
    const resolvedType =
      type ||
      (url &&
      (url.endsWith(".mp4") ||
        url.endsWith(".webm") ||
        url.includes("mixkit") ||
        url.includes("video"))
        ? "video"
        : "image");
    persistStudioLayout({ activeBackgroundUrl: url, activeBackgroundType: resolvedType });
    set({
      activeBackgroundUrl: url,
      activeBackgroundType: resolvedType,
    });
  },
  setThemeColor: (color) => {
    persistStudioLayout({ activeThemeColor: color });
    set((s) => ({
      activeThemeColor: color,
      activeBanner: s.activeBanner ? { ...s.activeBanner, themeColor: color } : null,
      customLayoutConfig: {
        ...s.customLayoutConfig,
        highlightColor: color,
      },
    }));
  },
  setBanner: (banner) => {
    persistStudioLayout({ activeBanner: banner });
    set({ activeBanner: banner });
  },
  setTicker: (text, show) => {
    persistStudioLayout({ tickerText: text, showTicker: show });
    set((s) => ({
      tickerText: text,
      showTicker: show,
      tickerConfig: { ...s.tickerConfig, text },
    }));
  },

  activeStageOverlay: savedLayout.activeStageOverlay !== undefined ? savedLayout.activeStageOverlay : null,
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
  setStageOverlay: (overlay) => {
    persistStudioLayout({ activeStageOverlay: overlay });
    set({ activeStageOverlay: overlay });
  },
  toggleStageOverlay: (overlay) =>
    set((s) => {
      const next = s.activeStageOverlay?.id === overlay.id ? null : overlay;
      persistStudioLayout({ activeStageOverlay: next });
      return { activeStageOverlay: next };
    }),
  updateStageOverlay: (updates) =>
    set((s) => {
      if (!s.activeStageOverlay) return {};
      const updated = { ...s.activeStageOverlay, ...updates };
      persistStudioLayout({ activeStageOverlay: updated });
      return {
        activeStageOverlay: updated,
        overlayHistory: s.overlayHistory.map((item) => (item.id === updated.id ? updated : item)),
      };
    }),
  toggleStageOverlayVisibility: () =>
    set((s) => {
      if (!s.activeStageOverlay) return {};
      const updated = { ...s.activeStageOverlay, isShowing: !s.activeStageOverlay.isShowing };
      persistStudioLayout({ activeStageOverlay: updated });
      return {
        activeStageOverlay: updated,
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
  commentConfig: {
    position: "bottom", // StreamYard broadcast standard: LOWER-THIRD!
    theme: "default",
    showAvatar: true,
    fontSize: "medium",
    ...(savedLayout.commentConfig || {}),
  },
  setCommentConfig: (config) =>
    set((s) => {
      const nextConfig = { ...s.commentConfig, ...config };
      persistStudioLayout({ commentConfig: nextConfig });
      return { commentConfig: nextConfig };
    }),

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
