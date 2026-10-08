import { create } from "zustand";
import { Participant, LowerThirdBanner, ChatMessage, Destination, StageOverlayAsset } from "@/types";

export type StudioLayout = 
  | "solo" 
  | "side-by-side" 
  | "fit"
  | "cropped"
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
  | "stacked"
  | "cinema"
  | "custom";

export type CustomCompositionMode =
  | "grid"
  | "hero-side"
  | "hero-bottom"
  | "pip"
  | "cinema"
  | "solo"
  | "side-by-side"
  | "fit"
  | "cropped"
  | "stacked"
  | "three-equal"
  | "six-grid"
  | "podcast";

export interface CustomLayoutConfig {
  mode: CustomCompositionMode;
  columns: 1 | 2 | 3 | 4;
  gap: number; // 0, 8, 12, 20
  borderRadius: number; // 0, 8, 16, 24
  heroParticipantId: string | number | null;
  pipPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pipSize: "small" | "medium" | "large";
  highlightColor: string;
  showSpeakerBorder: boolean;
}

export interface MediaFileItem {
  id: string;
  name: string;
  type: "video" | "audio" | "image" | "pdf";
  url: string;
  duration?: string;
  durationSeconds?: number;
  thumbnail?: string;
  loop?: boolean;
  isUploaded?: boolean;
  desc?: string;
  isMuted?: boolean;
  volume?: number;
}

export type ActiveMedia = MediaFileItem;

export interface StudioScene {
  id: string;
  name: string;
  layout: StudioLayout;
  splitRatio?: number;
  onStageParticipantIds?: (string | number)[];
  activeMedia?: MediaFileItem | null;
  backgroundUrl?: string | null;
  backgroundType?: "image" | "video";
  overlayUrl?: string | null;
  stageOverlay?: StageOverlayAsset | null;
  banner?: LowerThirdBanner | null;
  heroParticipantId?: string | number | null;
  thumbnailColor?: string;
}

export interface CommentConfig {
  position: "bottom" | "top";
  theme: "default" | "minimal" | "classic" | "bubble";
  showAvatar: boolean;
  fontSize: "small" | "medium" | "large";
}

export type DrawingTool = "pen" | "highlighter" | "arrow" | "rect" | "circle" | "text" | "eraser";

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
  isRecordPaused: boolean;
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
  activeMedia: MediaFileItem | null;
  setActiveMedia: (media: MediaFileItem | null) => void;
  toggleMediaMute: () => void;
  setMediaMuted: (muted: boolean) => void;
  setMediaVolume: (volume: number) => void;

  // Unified Media Library
  mediaLibrary: MediaFileItem[];
  addMediaLibraryItem: (item: MediaFileItem) => void;
  removeMediaLibraryItem: (id: string) => void;

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

  // Telestrator & On-Screen Drawing Tool
  isDrawingMode: boolean;
  setIsDrawingMode: (enabled: boolean) => void;
  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  drawingWidth: number;
  setDrawingWidth: (width: number) => void;
  isDrawingVisible: boolean;
  setIsDrawingVisible: (visible: boolean) => void;

  // Actions
  startLive: () => void;
  endLive: () => void;
  startRecord: () => void;
  stopRecord: () => void;
  pauseRecord: () => void;
  resumeRecord: () => void;

  // StreamYard Scenes System
  scenes: StudioScene[];
  activeSceneId: string | null;
  isScenesPanelOpen: boolean;
  setScenesPanelOpen: (open: boolean) => void;
  toggleScenesPanel: () => void;
  addScene: (scene?: Partial<StudioScene>) => StudioScene;
  updateScene: (id: string, updates: Partial<StudioScene>) => void;
  deleteScene: (id: string) => void;
  duplicateScene: (id: string) => void;
  reorderScenes: (fromIdx: number, toIdx: number) => void;
  switchScene: (id: string) => void;
  saveCurrentStageToScene: (id: string) => void;
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

export const DEFAULT_STUDIO_SCENES: StudioScene[] = [
  {
    id: "scene-flyer",
    name: "Show Flyer",
    layout: "cinema",
    splitRatio: 50,
    backgroundUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
    backgroundType: "image",
    activeMedia: null,
    thumbnailColor: "#6366f1",
  },
  {
    id: "scene-host",
    name: "Host Only",
    layout: "solo",
    splitRatio: 50,
    activeMedia: null,
    thumbnailColor: "#3b82f6",
  },
  {
    id: "scene-intro",
    name: "Intro Video",
    layout: "cinema",
    splitRatio: 50,
    activeMedia: {
      id: "media-intro-1",
      name: "Intro Video.mp4",
      type: "video",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      loop: true,
    },
    thumbnailColor: "#ec4899",
  },
  {
    id: "scene-interview",
    name: "Interview Split",
    layout: "cropped",
    splitRatio: 50,
    activeMedia: null,
    thumbnailColor: "#10b981",
  },
  {
    id: "scene-speaker",
    name: "Speaker View",
    layout: "speaker-large",
    splitRatio: 65,
    activeMedia: null,
    thumbnailColor: "#8b5cf6",
  },
  {
    id: "scene-slide",
    name: "Presentation Deck",
    layout: "presentation",
    splitRatio: 68,
    activeMedia: {
      id: "media-slides",
      name: "Product_Architecture_2026.pdf",
      type: "pdf",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
    },
    thumbnailColor: "#06b6d4",
  },
];

export const DEFAULT_STUDIO_MEDIA: MediaFileItem[] = [
  {
    id: "media-slides",
    name: "Product_Architecture_2026.pdf",
    type: "pdf",
    desc: "Presentation Deck (18 slides)",
    duration: "18 slides",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "media-countdown",
    name: "Intro_Countdown_30s.mp4",
    type: "video",
    desc: "Countdown Video (00:30)",
    duration: "00:30",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=400&q=80",
    loop: true,
  },
  {
    id: "media-keynote-clip",
    name: "Product_Demo_Highlights.mp4",
    type: "video",
    desc: "Demo Highlights Clip (01:15)",
    duration: "01:15",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
    loop: true,
  },
  {
    id: "media-lofi",
    name: "Background_Lofi_Stream.mp3",
    type: "audio",
    desc: "Audio Stream (03:45)",
    duration: "03:45",
    url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg",
    loop: true,
  },
];

const STUDIO_LAYOUT_STORAGE_KEY = "livestudio_saved_studio_layout";
const STUDIO_MEDIA_STORAGE_KEY = "livestudio_media_library";

function loadSavedMediaLibrary(): MediaFileItem[] {
  if (typeof window === "undefined") return DEFAULT_STUDIO_MEDIA;
  try {
    const raw = localStorage.getItem(STUDIO_MEDIA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const defaultIds = new Set(DEFAULT_STUDIO_MEDIA.map((m) => m.id));
        const custom = parsed.filter((m: MediaFileItem) => !defaultIds.has(m.id));
        return [...custom, ...DEFAULT_STUDIO_MEDIA];
      }
    }
  } catch {}
  return DEFAULT_STUDIO_MEDIA;
}

function persistMediaLibrary(items: MediaFileItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STUDIO_MEDIA_STORAGE_KEY, JSON.stringify(items.slice(0, 25)));
  } catch (err) {
    console.warn("Failed to persist media library to localStorage:", err);
  }
}

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
  scenes?: StudioScene[];
  activeSceneId?: string | null;
  isScenesPanelOpen?: boolean;
  activeMedia?: MediaFileItem | null;
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

export const useStudioStore = create<StudioState>((set, get) => ({
  broadcastTitle: "Product Launch & Live Q&A Keynote",
  isLive: false,
  isRecording: false,
  isRecordPaused: false,
  recordDuration: 0,
  liveDuration: 0,
  viewerCount: 1420,
  connectionQuality: "EXCELLENT",

  activeLayout: savedLayout.activeLayout || "speaker-large",
  setLayout: (layout) => {
    const defaultSplit =
      layout === "three-equal"
        ? 33
        : layout === "speaker-large" || layout === "presentation"
        ? 65
        : 50;

    const currentTransforms = { ...get().tileTransforms };
    let hasTransformChanges = false;
    if (layout === "cropped" || layout === "podcast") {
      get().participants.forEach((p) => {
        if (!p.isScreen) {
          currentTransforms[p.id] = {
            ...(currentTransforms[p.id] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
            fitMode: "cover",
          };
          hasTransformChanges = true;
        }
      });
    } else if (layout === "side-by-side" || layout === "fit") {
      get().participants.forEach((p) => {
        currentTransforms[p.id] = {
          ...(currentTransforms[p.id] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
          fitMode: "contain",
        };
        hasTransformChanges = true;
      });
    }

    persistStudioLayout({
      activeLayout: layout,
      layoutSplitRatio: defaultSplit,
      participantBounds: {},
      ...(hasTransformChanges ? { tileTransforms: currentTransforms } : {}),
    });
    set({
      activeLayout: layout,
      layoutSplitRatio: defaultSplit,
      participantBounds: {},
      selectedParticipantId: null,
      ...(hasTransformChanges ? { tileTransforms: currentTransforms } : {}),
    });
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

  // StreamYard Parity: activeMedia restored from saved layout or current scene on refresh
  activeMedia:
    savedLayout.activeMedia !== undefined
      ? savedLayout.activeMedia
      : (savedLayout.activeSceneId
          ? (savedLayout.scenes || DEFAULT_STUDIO_SCENES).find((s) => s.id === savedLayout.activeSceneId)?.activeMedia
          : null) || null,
  setActiveMedia: (media) => {
    persistStudioLayout({ activeMedia: media });
    set({ activeMedia: media });
  },
  toggleMediaMute: () => {
    const current = get().activeMedia;
    if (!current) return;
    const nextMuted = !(current.isMuted ?? false);
    const updated = { ...current, isMuted: nextMuted };
    persistStudioLayout({ activeMedia: updated });
    const activeSceneId = get().activeSceneId;
    const scenes = get().scenes.map((s) => {
      if (s.id === activeSceneId && s.activeMedia?.id === current.id) {
        return { ...s, activeMedia: updated };
      }
      return s;
    });
    set({ activeMedia: updated, scenes });
  },
  setMediaMuted: (muted: boolean) => {
    const current = get().activeMedia;
    if (!current) return;
    const updated = { ...current, isMuted: muted };
    persistStudioLayout({ activeMedia: updated });
    const activeSceneId = get().activeSceneId;
    const scenes = get().scenes.map((s) => {
      if (s.id === activeSceneId && s.activeMedia?.id === current.id) {
        return { ...s, activeMedia: updated };
      }
      return s;
    });
    set({ activeMedia: updated, scenes });
  },
  setMediaVolume: (volume: number) => {
    const current = get().activeMedia;
    if (!current) return;
    const updated = { ...current, volume };
    persistStudioLayout({ activeMedia: updated });
    const activeSceneId = get().activeSceneId;
    const scenes = get().scenes.map((s) => {
      if (s.id === activeSceneId && s.activeMedia?.id === current.id) {
        return { ...s, activeMedia: updated };
      }
      return s;
    });
    set({ activeMedia: updated, scenes });
  },

  mediaLibrary: loadSavedMediaLibrary(),
  addMediaLibraryItem: (item) => {
    const current = get().mediaLibrary;
    const filtered = current.filter((m) => m.id !== item.id && m.url !== item.url);
    const next = [item, ...filtered];
    persistMediaLibrary(next);
    set({ mediaLibrary: next });
  },
  removeMediaLibraryItem: (id) => {
    const current = get().mediaLibrary;
    const next = current.filter((m) => m.id !== id);
    persistMediaLibrary(next);
    set({ mediaLibrary: next });
  },

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
  startRecord: () => set({ isRecording: true, isRecordPaused: false }),
  stopRecord: () => set({ isRecording: false, isRecordPaused: false }),
  pauseRecord: () => set({ isRecordPaused: true }),
  resumeRecord: () => set({ isRecordPaused: false }),
  setTitle: (title) => set({ broadcastTitle: title }),

  // Telestrator & On-Screen Drawing Tool
  isDrawingMode: false,
  setIsDrawingMode: (enabled) => set({ isDrawingMode: enabled }),
  drawingTool: "pen",
  setDrawingTool: (tool) => set({ drawingTool: tool }),
  drawingColor: "#ef4444", // Neon Red default
  setDrawingColor: (color) => set({ drawingColor: color }),
  drawingWidth: 4,
  setDrawingWidth: (width) => set({ drawingWidth: width }),
  isDrawingVisible: true,
  setIsDrawingVisible: (visible) => set({ isDrawingVisible: visible }),

  // StreamYard Scenes System
  scenes: savedLayout.scenes && savedLayout.scenes.length > 0 ? savedLayout.scenes : DEFAULT_STUDIO_SCENES,
  activeSceneId: savedLayout.activeSceneId || "scene-host",
  isScenesPanelOpen: savedLayout.isScenesPanelOpen !== undefined ? savedLayout.isScenesPanelOpen : true,
  setScenesPanelOpen: (open) => {
    persistStudioLayout({ isScenesPanelOpen: open });
    set({ isScenesPanelOpen: open });
  },
  toggleScenesPanel: () =>
    set((s) => {
      const next = !s.isScenesPanelOpen;
      persistStudioLayout({ isScenesPanelOpen: next });
      return { isScenesPanelOpen: next };
    }),
  addScene: (custom) => {
    const state = get();
    const count = state.scenes.length + 1;
    const onStageIds = state.participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
    const newScene: StudioScene = {
      id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: custom?.name || `Scene ${count}`,
      layout: custom?.layout || state.activeLayout || "solo",
      splitRatio: custom?.splitRatio || state.layoutSplitRatio || 50,
      onStageParticipantIds: custom?.onStageParticipantIds || onStageIds,
      activeMedia: custom?.activeMedia !== undefined ? custom?.activeMedia : state.activeMedia,
      backgroundUrl: custom?.backgroundUrl !== undefined ? custom?.backgroundUrl : state.activeBackgroundUrl,
      backgroundType: custom?.backgroundType || state.activeBackgroundType,
      stageOverlay: custom?.stageOverlay !== undefined ? custom?.stageOverlay : state.activeStageOverlay,
      banner: custom?.banner !== undefined ? custom?.banner : state.activeBanner,
      thumbnailColor: custom?.thumbnailColor || "#6366f1",
      ...custom,
    };
    const nextScenes = [...state.scenes, newScene];
    persistStudioLayout({ scenes: nextScenes, activeSceneId: newScene.id });
    set({ scenes: nextScenes, activeSceneId: newScene.id });
    return newScene;
  },
  updateScene: (id, updates) => {
    const next = get().scenes.map((s) => (s.id === id ? { ...s, ...updates } : s));
    const isTargetActive = get().activeSceneId === id;
    if (isTargetActive && updates.activeMedia !== undefined) {
      persistStudioLayout({ scenes: next, activeMedia: updates.activeMedia });
      set({ scenes: next, activeMedia: updates.activeMedia });
    } else {
      persistStudioLayout({ scenes: next });
      set({ scenes: next });
    }
  },
  deleteScene: (id) => {
    const current = get().scenes;
    if (current.length <= 1) return;
    const next = current.filter((s) => s.id !== id);
    const nextActive = get().activeSceneId === id ? next[0].id : get().activeSceneId;
    persistStudioLayout({ scenes: next, activeSceneId: nextActive });
    set({ scenes: next, activeSceneId: nextActive });
  },
  duplicateScene: (id) => {
    const scene = get().scenes.find((s) => s.id === id);
    if (!scene) return;
    const copy: StudioScene = {
      ...scene,
      id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${scene.name} (Copy)`,
    };
    const next = [...get().scenes, copy];
    persistStudioLayout({ scenes: next });
    set({ scenes: next });
  },
  reorderScenes: (fromIdx, toIdx) => {
    const list = [...get().scenes];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    persistStudioLayout({ scenes: list });
    set({ scenes: list });
  },
  switchScene: (id) => {
    const scene = get().scenes.find((s) => s.id === id);
    if (!scene) return;

    persistStudioLayout({ activeSceneId: id });
    set({ activeSceneId: id });

    // 1. Layout
    get().setLayout(scene.layout);
    if (scene.splitRatio) {
      get().setLayoutSplitRatio(scene.splitRatio);
    }

    // 2. Onstage Participants
    if (scene.onStageParticipantIds && scene.onStageParticipantIds.length > 0) {
      const targetIds = new Set(scene.onStageParticipantIds.map(String));
      const nextParticipants = get().participants.map((p) => ({
        ...p,
        status: (targetIds.has(String(p.id)) ? "ON_STAGE" : "BACKSTAGE") as any,
      }));
      set({ participants: nextParticipants });
    }

    // 3. Active Media (StreamYard parity: always set to scene.activeMedia or null to clear previous scene's media)
    get().setActiveMedia(scene.activeMedia || null);

    // 4. Background
    if (scene.backgroundUrl !== undefined) {
      get().setBackground(scene.backgroundUrl || null, scene.backgroundType || "image");
    }

    // 5. Overlay
    if (scene.stageOverlay !== undefined) {
      get().setStageOverlay(scene.stageOverlay || null);
    } else if (scene.overlayUrl !== undefined) {
      get().setOverlay(scene.overlayUrl || null);
    }

    // 6. Banner
    if (scene.banner !== undefined) {
      get().setBanner(scene.banner || null);
    }

    // 7. Spotlight
    get().setCustomLayoutConfig({ heroParticipantId: scene.heroParticipantId || undefined });
  },
  saveCurrentStageToScene: (id) => {
    const state = get();
    const onStageIds = state.participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
    get().updateScene(id, {
      layout: state.activeLayout,
      splitRatio: state.layoutSplitRatio,
      onStageParticipantIds: onStageIds,
      activeMedia: state.activeMedia || null,
      backgroundUrl: state.activeBackgroundUrl || null,
      backgroundType: state.activeBackgroundType,
      stageOverlay: state.activeStageOverlay || null,
      banner: state.activeBanner || null,
      heroParticipantId: state.customLayoutConfig?.heroParticipantId || null,
    });
  },
}));
