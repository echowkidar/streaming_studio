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
  /** StreamYard Paid Plan: Multi-page Slide Deck URLs & Speaker Notes */
  slides?: string[];
  currentSlideIndex?: number;
  speakerNotes?: Record<number, string>;
}

export type ActiveMedia = MediaFileItem;

export interface SceneTextCard {
  enabled: boolean;
  heading: string;
  subheading?: string;
  textColor?: string;
  bgColor?: string;
  bgOpacity?: number;
  position?: "center" | "top" | "bottom-right" | "top-left";
  fontSize?: "small" | "medium" | "large" | "xlarge";
}

export interface FairUseConfig {
  enabled: boolean;
  /** Forces host camera in corner PiP when playing full-screen videos */
  enforceReactionPiP: boolean;
  /** Automatically lowers media volume when host/guest speaks */
  autoAudioDucking: boolean;
  /** Target media volume (0-100) while someone is speaking */
  duckingVolumePct: number;
  /** Applies subtle scale/contrast/frame transform to avoid raw visual hash match */
  visualTransformFilter: boolean;
  /** Mirrors video horizontally in canvas output */
  mirrorMediaVideo: boolean;
  /** Adjusts video playback speed (e.g., 1.04) to bypass audio fingerprinting */
  playbackRate: number;
  /** Auto-pauses video every X seconds (0 = disabled, 8 = Random 8-12s interval, 10 = 10s, 15 = 15s) */
  autoPauseIntervalSec: number;
  /** "jerk-skip" = skips 0.28s frames + 180ms jerk, "micro-pause" = 350ms pause, "pause" = 2.2s pause */
  antiMatchMode?: "jerk-skip" | "micro-pause" | "pause";
  /** Displays Fair-Use Commentary watermark badge over media */
  showFairUseBadge: boolean;
  badgeText: string;
  /** Dynamic procedural film-grain / micro-noise layer mutating pixel hashes */
  filmGrainOverlay: boolean;
  /** Purani movies jaisi random bareek vertical scratches & traveling lines */
  vintageLinesOverlay?: boolean;
  vintageLinesIntensity?: "light" | "medium" | "strong";
  /** Switches back to host scene if host mic & cam are off for too long during media playback */
  idleMediaGuardSec: number;
}

export interface StudioScene {
  id: string;
  name: string;
  layout: StudioLayout;
  splitRatio?: number;
  /** Universal Full-Bleed Cropped Mode: true = 100% top-to-bottom edge-to-edge fill in ANY layout (2, 3, 4, 6 grid) */
  isStageCropped?: boolean;
  /** Media kis slot me dikhega: 0 = Left/Top-Left/Hero, 1 = Right/Middle/Top-Right, 2 = Right/Bottom-Left, 3 = Bottom-Right */
  mediaSlotIndex?: number;
  /** Per-Scene saved Zoom, Pan, Fit/Cover, Flip & Transparent card states */
  tileTransforms?: Record<string, TileTransform>;
  /** Per-Scene saved Freeform / PiP bounds */
  participantBounds?: Record<string, ParticipantBounds>;
  /** Per-Scene saved Custom Layout Config */
  customLayoutConfig?: CustomLayoutConfig;
  onStageParticipantIds?: (string | number)[];
  /** Fixed seat assignments: slotIndex -> participantId */
  slotAssignments?: Record<number, string | number>;
  /** StreamYard Pre-Booked Guest Slots (e.g. 1, 2, 3) when no guest is connected yet */
  expectedGuestSlots?: number;
  /** Automatically promote connecting guests into this scene's open guest slots */
  autoAddGuestsToStage?: boolean;
  /** Jab Guest connect ho to 2-window/media scene me Host ki jagah Guest aa jaye */
  replaceHostOnGuestJoin?: boolean;
  activeMedia?: MediaFileItem | null;
  /** StreamYard Paid Plan: Auto-switch to another scene when video ends */
  nextSceneIdOnMediaEnd?: string | null;
  /** Scene Transition effect when switching into this scene */
  transitionType?: "cut" | "fade" | "wipe" | "stinger";
  stingerVideoUrl?: string | null;
  /** StreamYard Paid Plan: Extra / Secondary Camera Device ID bound to this scene */
  extraCameraDeviceId?: string | null;
  /** Rich Text / Title Card inside Scene */
  textCard?: SceneTextCard | null;
  isTransparentMedia?: boolean;
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
  isTransparentBg?: boolean;
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
  isStageCropped: boolean;
  setIsStageCropped: (cropped: boolean) => void;
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

  // Participants & StreamYard Pre-Booked Guest Slots
  participants: Participant[];
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string | number) => void;
  updateParticipant: (id: string | number, updates: Partial<Participant>) => void;
  toggleParticipantMic: (id: string | number) => void;
  moveToStage: (id: string | number) => void;
  moveToBackstage: (id: string | number) => void;
  setStageParticipants: (stageIds: (string | number)[]) => void;
  preAddGuestSlotToScene: (sceneId?: string) => void;
  removeGuestSlotFromScene: (sceneId?: string) => void;
  setAutoAddGuestsToStage: (enabled: boolean, sceneId?: string) => void;
  setReplaceHostOnGuestJoin: (enabled: boolean, sceneId?: string) => void;
  assignParticipantToSlot: (slotIndex: number, participantId: string | number | null, sceneId?: string) => void;

  // Branding & Overlays
  showLogo: boolean;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoUrl: string;
  activeOverlayUrl: string | null;
  activeBackgroundUrl: string | null;
  activeBackgroundType: "image" | "video";
  activeThemeColor: string;
  activeBanner: LowerThirdBanner | null;
  activeTextCard: SceneTextCard | null;
  setSceneTextCard: (card: Partial<SceneTextCard> | null) => void;
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
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  triggerMediaEnded: () => void;

  // YouTube Fair-Use & Anti-Reused Content Protection
  fairUseConfig: FairUseConfig;
  setFairUseConfig: (updates: Partial<FairUseConfig>) => void;

  // Scene Transition State
  isSceneTransitioning: boolean;
  activeTransitionType: "cut" | "fade" | "wipe" | "stinger";

  // StreamYard Extra Camera Scene Binding
  activeExtraCameraDeviceId: string | null;
  setActiveExtraCameraDeviceId: (id: string | null) => void;

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

  // Private Backstage Chat (Host <-> Guests)
  privateMessages: Array<{ id: string; sender: string; role: string; text: string; timestamp: string }>;
  addPrivateMessage: (msg: { id?: string; sender: string; role?: string; text: string; timestamp?: string }, broadcast?: boolean) => void;

  // Media Slot Position & Participant Reordering
  mediaSlotIndex: number;
  setMediaSlotIndex: (slotIndex: number) => void;
  moveParticipantOrder: (id: string | number, direction: "left" | "right") => void;

  // 1-Click Solo / Spotlight Memory State
  soloTargetId: string | number | null;
  preSoloSnapshot: { layout: StudioLayout; onStageIds: (string | number)[] } | null;
  toggleSoloParticipant: (id: string | number) => void;

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

  // Studio Scoping & Isolation
  currentStudioId: string | null;
  initStudio: (studioId: string) => void;
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
    onStageParticipantIds: [],
    expectedGuestSlots: 0,
    autoAddGuestsToStage: false,
    transitionType: "fade",
    textCard: {
      enabled: true,
      heading: "STARTING SOON",
      subheading: "Grab a coffee! We go live in a few moments.",
      textColor: "#ffffff",
      bgColor: "#0f172a",
      bgOpacity: 85,
      position: "center",
      fontSize: "xlarge",
    },
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
    expectedGuestSlots: 0,
    autoAddGuestsToStage: false,
    transitionType: "fade",
    activeMedia: null,
    thumbnailColor: "#3b82f6",
  },
  {
    id: "scene-intro",
    name: "Intro Video (Auto-Advance)",
    layout: "cinema",
    splitRatio: 50,
    onStageParticipantIds: [],
    expectedGuestSlots: 0,
    autoAddGuestsToStage: false,
    nextSceneIdOnMediaEnd: "scene-interview",
    transitionType: "fade",
    activeMedia: {
      id: "media-intro-1",
      name: "Intro Video.mp4",
      type: "video",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      loop: false,
    },
    thumbnailColor: "#ec4899",
  },
  {
    id: "scene-interview",
    name: "Interview Split (Auto-Guest)",
    layout: "cropped",
    splitRatio: 50,
    expectedGuestSlots: 1,
    autoAddGuestsToStage: true,
    transitionType: "fade",
    activeMedia: null,
    thumbnailColor: "#10b981",
  },
  {
    id: "scene-speaker",
    name: "Speaker View",
    layout: "speaker-large",
    splitRatio: 65,
    expectedGuestSlots: 2,
    autoAddGuestsToStage: true,
    transitionType: "fade",
    activeMedia: null,
    thumbnailColor: "#8b5cf6",
  },
  {
    id: "scene-slide",
    name: "Presentation Deck (Multi-Slide)",
    layout: "presentation",
    splitRatio: 68,
    expectedGuestSlots: 1,
    autoAddGuestsToStage: true,
    transitionType: "fade",
    activeMedia: {
      id: "media-slides",
      name: "Product_Architecture_2026.pdf",
      type: "pdf",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
      currentSlideIndex: 0,
      slides: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1600&q=80",
      ],
      speakerNotes: {
        0: "Welcome everyone to the 2026 Architecture Overview.",
        1: "Slide 2 covers real-time metrics and WebRTC scaling.",
        2: "Slide 3: Q&A and open floor discussion.",
      },
    },
    thumbnailColor: "#06b6d4",
  },
];

export const DEFAULT_STUDIO_MEDIA: MediaFileItem[] = [
  {
    id: "media-slides",
    name: "Product_Architecture_2026.pdf",
    type: "pdf",
    desc: "Presentation Deck (3 slides)",
    duration: "3 slides",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
    currentSlideIndex: 0,
    slides: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    id: "media-countdown",
    name: "Intro_Countdown_30s.mp4",
    type: "video",
    desc: "Countdown Video (00:30)",
    duration: "00:30",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=400&q=80",
    loop: false,
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
        // Filter out expired browser blob: URLs so only persistent server URLs or data URLs are restored
        const custom = parsed.filter(
          (m: MediaFileItem) => !defaultIds.has(m.id) && m.url && !m.url.startsWith("blob:")
        );
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

export interface SavedStudioLayoutState {
  broadcastTitle?: string;
  activeLayout?: StudioLayout;
  isStageCropped?: boolean;
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
  activeTextCard?: SceneTextCard | null;
  fairUseConfig?: FairUseConfig;
  chromaKeyConfig?: ChromaKeyConfig;
  activeStageOverlay?: StageOverlayAsset | null;
  activeOverlayUrl?: string | null;
  commentConfig?: CommentConfig;
  scenes?: StudioScene[];
  activeSceneId?: string | null;
  isScenesPanelOpen?: boolean;
  activeMedia?: MediaFileItem | null;
}

let activeStudioId: string | null = null;

export function getStudioStorageKey(studioId?: string | null): string {
  const id = studioId || activeStudioId;
  return id ? `livestudio_studio_${id}` : STUDIO_LAYOUT_STORAGE_KEY;
}

export function loadSavedStudioLayout(studioId?: string | null): SavedStudioLayoutState {
  if (typeof window === "undefined") return {};
  try {
    const key = getStudioStorageKey(studioId);
    let raw = localStorage.getItem(key);
    // Backward compatibility: fallback to global key if studio-specific key not yet saved
    if (!raw && (!studioId || studioId.includes("main"))) {
      raw = localStorage.getItem(STUDIO_LAYOUT_STORAGE_KEY);
    }
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let persistCloudTimeout: any = null;

export function persistStudioLayout(updates: Partial<SavedStudioLayoutState>) {
  if (typeof window === "undefined") return;
  try {
    const targetStudioId = activeStudioId;
    const key = getStudioStorageKey(targetStudioId);
    const current = loadSavedStudioLayout(targetStudioId);
    const next = { ...current, ...updates };
    localStorage.setItem(key, JSON.stringify(next));

    // Debounced sync to Backend Database for Cross-Device & Cross-Browser Persistence
    if (targetStudioId) {
      if (persistCloudTimeout) clearTimeout(persistCloudTimeout);
      persistCloudTimeout = setTimeout(() => {
        import("@/lib/api").then(({ apiRequest }) => {
          apiRequest(`/api/studios/${targetStudioId}`, {
            method: "PUT",
            data: {
              settings: next,
              defaultLayout: next.activeLayout || "solo",
              name: next.broadcastTitle,
            },
          }).catch(() => {});
        });
      }, 1200);
    }
  } catch {
    // ignore
  }
}

const savedLayout = loadSavedStudioLayout();

const initialScenes: StudioScene[] =
  savedLayout.scenes && savedLayout.scenes.length > 0 ? savedLayout.scenes : DEFAULT_STUDIO_SCENES;

const initialActiveSceneId: string | null =
  savedLayout.activeSceneId && initialScenes.some((s) => s.id === savedLayout.activeSceneId)
    ? savedLayout.activeSceneId
    : initialScenes[0]?.id || null;

/**
 * Helper: Reconciles connecting/existing participants with StreamYard Scene rules.
 * If a scene has `expectedGuestSlots > 0` and `autoAddGuestsToStage !== false`,
 * newly connected guests automatically fill open stage slots!
 */
function reconcileParticipantsWithScene(
  incomingParticipants: Participant[],
  existingParticipants: Participant[],
  activeScene?: StudioScene,
  forceEvaluateBackstageGuests: boolean = false
): Participant[] {
  const existingStatusMap = new Map(existingParticipants.map((p) => [String(p.id), p.status]));
  const explicitSceneIds = activeScene?.onStageParticipantIds
    ? new Set(activeScene.onStageParticipantIds.map(String))
    : null;

  const rawExpectedGuests = activeScene?.expectedGuestSlots ?? 0;
  const shouldAutoAdd = activeScene?.autoAddGuestsToStage ?? (rawExpectedGuests > 0);
  // Agar Auto-Stage ON hai to chahe Guest Slots 0 bhi likha ho, kam se kam 1 Guest zaroor stage par aayega!
  const effectiveExpectedGuests = shouldAutoAdd
    ? Math.max(1, rawExpectedGuests)
    : rawExpectedGuests;

  const shouldReplaceHost = Boolean(activeScene?.replaceHostOnGuestJoin);

  // Count how many remote guests are already on stage
  let currentOnStageGuests = 0;
  incomingParticipants.forEach((p) => {
    const isHostOrScreen = p.role === "host" || p.role === "HOST" || p.isLocal || p.isScreen;
    const prevStatus = existingStatusMap.get(String(p.id));
    if (!isHostOrScreen && (prevStatus === "ON_STAGE" || explicitSceneIds?.has(String(p.id)))) {
      currentOnStageGuests++;
    }
  });

  const isMediaOnlyScene =
    Array.isArray(activeScene?.onStageParticipantIds) &&
    activeScene!.onStageParticipantIds!.length === 0 &&
    effectiveExpectedGuests === 0 &&
    !shouldAutoAdd;

  // Step 1: Pehle sabhi participants (Guests + Host) ka status decide karein
  const interim = incomingParticipants.map((p) => {
    const idStr = String(p.id);
    const isHostOrScreen = p.role === "host" || p.role === "HOST" || p.isLocal || p.isScreen;
    const existingStatus = existingStatusMap.get(idStr);

    // Agar naya Guest connect hua hai (ya user ne abhi Auto-Stage ON kiya hai)
    if (!isHostOrScreen) {
      if (existingStatus === "ON_STAGE" || explicitSceneIds?.has(idStr)) {
        return { ...p, status: "ON_STAGE" as const };
      }
      // Naya guest hai (!existingStatus) ya forceEvaluateBackstageGuests true hai
      if (shouldAutoAdd && (!existingStatus || forceEvaluateBackstageGuests) && currentOnStageGuests < effectiveExpectedGuests) {
        currentOnStageGuests++;
        return { ...p, status: "ON_STAGE" as const };
      }
      return { ...p, status: (existingStatus || p.status || "BACKSTAGE") as any };
    }

    // Host ya Screen Share ke liye
    if (existingStatus && !forceEvaluateBackstageGuests) {
      return { ...p, status: existingStatus };
    }
    return { ...p, status: isMediaOnlyScene ? ("BACKSTAGE" as const) : ("ON_STAGE" as const) };
  });

  // Step 2: "Guest Replaces Host" Logic
  // Agar koi Remote Guest ON_STAGE hai aur replaceHostOnGuestJoin ON hai, to Host ko BACKSTAGE karein.
  // Aur agar saare Guests chale gaye (0 guests on stage), to Host ko wapas ON_STAGE le aayein!
  const anyRemoteGuestOnStage = interim.some(
    (p) => !(p.role === "host" || p.role === "HOST" || p.isLocal || p.isScreen) && p.status === "ON_STAGE"
  );

  const reconciled = interim.map((p) => {
    const isLocalHost = (p.role === "host" || p.role === "HOST" || p.isLocal) && !p.isScreen;
    if (isLocalHost && shouldReplaceHost) {
      return {
        ...p,
        status: anyRemoteGuestOnStage ? ("BACKSTAGE" as const) : ("ON_STAGE" as const),
      };
    }
    return p;
  });

  // Step 3: Sort on-stage participants according to fixed slotAssignments if defined
  const slotMap = activeScene?.slotAssignments;
  if (slotMap && Object.keys(slotMap).length > 0) {
    const assignedSlotByParticipant = new Map<string, number>();
    Object.entries(slotMap).forEach(([slotIdx, pId]) => {
      if (pId !== null && pId !== undefined) {
        assignedSlotByParticipant.set(String(pId), Number(slotIdx));
      }
    });
    reconciled.sort((a, b) => {
      const slotA = assignedSlotByParticipant.get(String(a.id)) ?? 999;
      const slotB = assignedSlotByParticipant.get(String(b.id)) ?? 999;
      return slotA - slotB;
    });
  }

  return reconciled;
}

const initialActiveScene = initialScenes.find((s) => s.id === initialActiveSceneId);

export const useStudioStore = create<StudioState>((set, get) => ({
  currentStudioId: null,
  initStudio: (studioId: string) => {
    activeStudioId = studioId;
    const saved = loadSavedStudioLayout(studioId);
    const hasSavedScenes = Boolean(saved.scenes && saved.scenes.length > 0);

    let studioScenes: StudioScene[] = DEFAULT_STUDIO_SCENES;
    let studioLayout: StudioLayout = "speaker-large";
    let studioTitle = "Live Production Studio";
    let studioSplitRatio = 65;

    if (studioId.includes("podcast")) {
      studioTitle = "Weekly Video Podcast";
      studioLayout = "cropped";
      studioSplitRatio = 50;
      studioScenes = [
        {
          id: "podcast-intro",
          name: "Podcast Intro",
          layout: "solo",
          splitRatio: 50,
          thumbnailColor: "#3b82f6",
        },
        {
          id: "podcast-split",
          name: "Co-Host Split",
          layout: "cropped",
          splitRatio: 50,
          thumbnailColor: "#10b981",
        },
        {
          id: "podcast-sponsor",
          name: "Sponsor Graphic",
          layout: "presentation",
          splitRatio: 65,
          activeMedia: {
            id: "media-sponsor-pdf",
            name: "Sponsor_Pitch_2026.pdf",
            type: "pdf",
            url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
          },
          thumbnailColor: "#f59e0b",
        },
        {
          id: "podcast-panel",
          name: "Guest Panel",
          layout: "three-equal",
          splitRatio: 33,
          thumbnailColor: "#8b5cf6",
        },
      ];
    } else if (studioId.includes("qna") || studioId.includes("ama")) {
      studioTitle = "Community AMA & Live Q&A";
      studioLayout = "presentation";
      studioSplitRatio = 65;
      studioScenes = [
        {
          id: "qna-welcome",
          name: "AMA Welcome",
          layout: "solo",
          splitRatio: 50,
          thumbnailColor: "#6366f1",
        },
        {
          id: "qna-screen",
          name: "Q&A Screen Share",
          layout: "presentation",
          splitRatio: 65,
          thumbnailColor: "#06b6d4",
        },
        {
          id: "qna-discussion",
          name: "Audience Discussion",
          layout: "side-by-side",
          splitRatio: 50,
          thumbnailColor: "#ec4899",
        },
      ];
    } else if (studioId.includes("main")) {
      studioTitle = "Main Keynote & Townhall Studio";
      studioLayout = "speaker-large";
      studioSplitRatio = 65;
      studioScenes = DEFAULT_STUDIO_SCENES;
    } else {
      studioTitle = "Custom Studio Stage";
      studioLayout = "side-by-side";
      studioSplitRatio = 50;
      studioScenes = [
        {
          id: `custom-scene-host-${studioId}`,
          name: "Host Solo",
          layout: "solo",
          splitRatio: 50,
          thumbnailColor: "#6366f1",
        },
        {
          id: `custom-scene-split-${studioId}`,
          name: "Two Participants",
          layout: "side-by-side",
          splitRatio: 50,
          thumbnailColor: "#10b981",
        },
        {
          id: `custom-scene-screen-${studioId}`,
          name: "Screen Share",
          layout: "presentation",
          splitRatio: 65,
          thumbnailColor: "#06b6d4",
        },
      ];
    }

    const savedMediaLib = loadSavedMediaLibrary();
    const healMediaItem = (item: MediaFileItem | null | undefined): MediaFileItem | null => {
      if (!item) return null;
      if (!item.url || item.url.startsWith("blob:")) {
        const found = savedMediaLib.find(
          (m) =>
            m.url &&
            !m.url.startsWith("blob:") &&
            (m.id === item.id || m.name === item.name)
        );
        if (found) {
          return { ...item, id: found.id, url: found.url };
        }
      }
      return item;
    };

    let nextScenes = (hasSavedScenes ? saved.scenes! : studioScenes).map((sc) => ({
      ...sc,
      activeMedia: healMediaItem(sc.activeMedia),
    }));
    const nextActiveSceneId =
      saved.activeSceneId && nextScenes.some((s) => s.id === saved.activeSceneId)
        ? saved.activeSceneId
        : nextScenes[0]?.id || null;

    const nextActiveScene = nextScenes.find((s) => s.id === nextActiveSceneId);
    const nextLayout = saved.activeLayout || nextActiveScene?.layout || studioLayout;
    const nextCropped =
      saved.isStageCropped !== undefined
        ? saved.isStageCropped
        : nextActiveScene?.isStageCropped !== undefined
        ? nextActiveScene.isStageCropped
        : nextLayout === "cropped" || nextLayout === "podcast";
    const nextSplit = saved.layoutSplitRatio || nextActiveScene?.splitRatio || studioSplitRatio;
    const initialActiveMedia = healMediaItem(
      saved.activeMedia !== undefined ? saved.activeMedia : nextActiveScene?.activeMedia || null
    );

    set({
      currentStudioId: studioId,
      broadcastTitle: saved.broadcastTitle || studioTitle,
      activeLayout: nextLayout,
      isStageCropped: nextCropped,
      layoutSplitRatio: nextSplit,
      customLayoutConfig: saved.customLayoutConfig || {
        mode: "solo",
        columns: 2,
        gap: 8,
        borderRadius: 16,
        heroParticipantId: null,
        pipPosition: "bottom-right",
        pipSize: "medium",
        highlightColor: "#6366f1",
        showSpeakerBorder: true,
      },
      participantBounds: saved.participantBounds || {},
      isFreeformMode: saved.isFreeformMode ?? false,
      tileTransforms: saved.tileTransforms || {},
      activeBackgroundUrl: saved.activeBackgroundUrl ?? null,
      activeBackgroundType: saved.activeBackgroundType || "image",
      activeThemeColor: saved.activeThemeColor || "#6366f1",
      tickerText: saved.tickerText || "LIVE UPDATES • Welcome to our live broadcast!",
      showTicker: saved.showTicker ?? false,
      tickerConfig: saved.tickerConfig || {
        text: "LIVE UPDATES • Welcome to our live broadcast!",
        textColor: "#ffffff",
        bgColor: "#0f172a",
        badgeBgColor: "#ef4444",
        badgeText: "BREAKING",
        fontSize: "medium",
        speed: "normal",
      },
      logoConfig: saved.logoConfig || {
        text: "LIVESTUDIO",
        textColor: "#ffffff",
        bgColor: "rgba(0, 0, 0, 0.4)",
        bgOpacity: 40,
        isTransparentBg: false,
        fontSize: "medium",
        position: "top-right",
      },
      showLogo: saved.showLogo ?? true,
      logoPosition: saved.logoPosition || "top-right",
      activeBanner: saved.activeBanner ?? null,
      activeTextCard: saved.activeTextCard ?? nextActiveScene?.textCard ?? null,
      fairUseConfig: saved.fairUseConfig || get().fairUseConfig,
      chromaKeyConfig: saved.chromaKeyConfig || {
        enabled: false,
        keyColor: "#00b140",
        tolerance: 0.35,
        smoothness: 0.1,
        spill: 0.2,
        backdropType: "stage",
      },
      activeStageOverlay: saved.activeStageOverlay ?? null,
      activeOverlayUrl: saved.activeOverlayUrl ?? null,
      commentConfig: saved.commentConfig || {
        position: "bottom",
        theme: "default",
        showAvatar: true,
        fontSize: "medium",
      },
      scenes: nextScenes,
      activeSceneId: nextActiveSceneId,
      activeMedia: initialActiveMedia,
      isScenesPanelOpen: saved.isScenesPanelOpen ?? true,
    });

    // Background Cloud Sync & Auto-Heal Permanent Media Assets
    if (typeof window !== "undefined") {
      // 1. Fetch uploaded permanent media assets to heal any remaining blob or missing URLs
      const token = localStorage.getItem("livestudio_token");
      fetch(`/api/media?studioId=${encodeURIComponent(studioId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
            const serverAssets: any[] = json.data;
            const currentStore = get();
            let hasRepairs = false;

            const repairedScenes = currentStore.scenes.map((sc) => {
              if (!sc.activeMedia) return sc;
              if (sc.activeMedia.url?.startsWith("blob:") || !sc.activeMedia.url) {
                const target = sc.activeMedia;
                const match = serverAssets.find(
                  (a) =>
                    a.id === target.id ||
                    a.name === target.name ||
                    (target.name && a.name.includes(target.name))
                );
                if (match && match.url) {
                  hasRepairs = true;
                  return {
                    ...sc,
                    activeMedia: {
                      ...target,
                      id: match.id,
                      url: match.url,
                      name: target.name || match.name || "Media File",
                    },
                  };
                }
              }
              return sc;
            });

            let repairedActiveMedia: MediaFileItem | null = currentStore.activeMedia;
            if (repairedActiveMedia && (repairedActiveMedia.url?.startsWith("blob:") || !repairedActiveMedia.url)) {
              const target = repairedActiveMedia;
              const match = serverAssets.find(
                (a) =>
                  a.id === target.id ||
                  a.name === target.name ||
                  (target.name && a.name.includes(target.name))
              );
              if (match && match.url) {
                hasRepairs = true;
                repairedActiveMedia = {
                  ...target,
                  id: match.id,
                  url: match.url,
                  name: target.name || match.name || "Media File",
                };
              }
            }

            if (hasRepairs) {
              persistStudioLayout({
                scenes: repairedScenes,
                activeMedia: repairedActiveMedia,
              });
              set({
                scenes: repairedScenes,
                activeMedia: repairedActiveMedia,
              });
            }
          }
        })
        .catch(() => {});
      import("@/lib/api").then(({ apiRequest }) => {
        apiRequest<any>(`/api/studios/${studioId}`)
          .then((res) => {
            if (res.success && res.data?.settings && typeof res.data.settings === "object") {
              const cloud = res.data.settings as SavedStudioLayoutState;
              if (cloud.scenes && cloud.scenes.length > 0) {
                try {
                  const key = getStudioStorageKey(studioId);
                  localStorage.setItem(key, JSON.stringify(cloud));
                } catch {}

                const cloudActiveScene =
                  cloud.scenes.find((s) => s.id === cloud.activeSceneId) || cloud.scenes[0];

                set((state) => {
                  if (state.currentStudioId !== studioId) return state;
                  const resolvedLayout = cloud.activeLayout || cloudActiveScene?.layout || state.activeLayout;
                  const resolvedCropped =
                    cloud.isStageCropped !== undefined
                      ? cloud.isStageCropped
                      : cloudActiveScene?.isStageCropped !== undefined
                      ? cloudActiveScene.isStageCropped
                      : resolvedLayout === "cropped" || resolvedLayout === "podcast"
                      ? true
                      : state.isStageCropped;
                  return {
                    scenes: cloud.scenes || state.scenes,
                    activeSceneId: cloud.activeSceneId || state.activeSceneId,
                    activeLayout: resolvedLayout,
                    isStageCropped: resolvedCropped,
                    layoutSplitRatio: cloud.layoutSplitRatio || cloudActiveScene?.splitRatio || state.layoutSplitRatio,
                    broadcastTitle: cloud.broadcastTitle || res.data.name || state.broadcastTitle,
                    tickerText: cloud.tickerText || state.tickerText,
                    showTicker: cloud.showTicker !== undefined ? cloud.showTicker : state.showTicker,
                    logoConfig: cloud.logoConfig || state.logoConfig,
                    showLogo: cloud.showLogo !== undefined ? cloud.showLogo : state.showLogo,
                    activeBanner: cloud.activeBanner !== undefined ? cloud.activeBanner : state.activeBanner,
                    activeTextCard: cloud.activeTextCard !== undefined ? cloud.activeTextCard : (cloudActiveScene?.textCard ?? state.activeTextCard),
                    fairUseConfig: cloud.fairUseConfig || state.fairUseConfig,
                    activeStageOverlay: cloud.activeStageOverlay !== undefined ? cloud.activeStageOverlay : state.activeStageOverlay,
                    activeMedia: cloud.activeMedia !== undefined ? cloud.activeMedia : state.activeMedia,
                  };
                });
              }
            }
          })
          .catch(() => {});
      });
    }
  },

  broadcastTitle: "Product Launch & Live Q&A Keynote",
  isLive: false,
  isRecording: false,
  isRecordPaused: false,
  recordDuration: 0,
  liveDuration: 0,
  viewerCount: 0,
  connectionQuality: "EXCELLENT",

  isSceneTransitioning: false,
  activeTransitionType: "fade",

  fairUseConfig: {
    enabled: true,
    enforceReactionPiP: true,
    autoAudioDucking: true,
    duckingVolumePct: 18,
    visualTransformFilter: true,
    mirrorMediaVideo: false,
    playbackRate: 1.04,
    autoPauseIntervalSec: 8, // Default 8-12s Random Active!
    antiMatchMode: "jerk-skip", // Default Frame-Skip + Micro-Jerk!
    showFairUseBadge: true,
    badgeText: "LIVE COMMENTARY & REVIEW • FAIR USE",
    filmGrainOverlay: true,
    vintageLinesOverlay: true, // Default Old-Movie Bareek Lines ON!
    vintageLinesIntensity: "medium",
    idleMediaGuardSec: 60,
    ...(savedLayout.fairUseConfig || {}),
  },
  setFairUseConfig: (updates) =>
    set((s) => {
      const next = { ...s.fairUseConfig, ...updates };
      persistStudioLayout({ fairUseConfig: next });
      return { fairUseConfig: next };
    }),

  activeExtraCameraDeviceId: null,
  setActiveExtraCameraDeviceId: (id) => set({ activeExtraCameraDeviceId: id }),

  activeLayout: savedLayout.activeLayout || initialActiveScene?.layout || "speaker-large",
  isStageCropped:
    savedLayout.isStageCropped ??
    savedLayout.scenes?.find((s) => s.id === savedLayout.activeSceneId)?.isStageCropped ??
    (savedLayout.activeLayout === "cropped" || savedLayout.activeLayout === "podcast"),

  setIsStageCropped: (cropped) =>
    set((s) => {
      const currentTransforms = { ...s.tileTransforms };
      s.participants.forEach((p) => {
        if (!p.isScreen) {
          currentTransforms[p.id] = {
            ...(currentTransforms[p.id] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
            fitMode: cropped ? "cover" : "contain",
          };
        }
      });
      currentTransforms["local-host"] = {
        ...(currentTransforms["local-host"] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
        fitMode: cropped ? "cover" : "contain",
      };
      currentTransforms["active-media"] = {
        ...(currentTransforms["active-media"] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
        fitMode: cropped ? "cover" : "contain",
        panX: 0,
        panY: 0,
      };
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId
          ? { ...sc, isStageCropped: cropped, tileTransforms: currentTransforms }
          : sc
      );
      persistStudioLayout({ isStageCropped: cropped, scenes: nextScenes, tileTransforms: currentTransforms });
      return { isStageCropped: cropped, tileTransforms: currentTransforms, scenes: nextScenes };
    }),

  setLayout: (layout) => {
    const defaultSplit =
      layout === "three-equal"
        ? 33
        : layout === "speaker-large" || layout === "presentation"
        ? 65
        : 50;

    const nextCropped =
      layout === "cropped" || layout === "podcast"
        ? true
        : layout === "side-by-side" || layout === "fit"
        ? false
        : get().isStageCropped;

    const currentTransforms = { ...get().tileTransforms };
    let hasTransformChanges = false;
    if (nextCropped) {
      get().participants.forEach((p) => {
        if (!p.isScreen) {
          currentTransforms[p.id] = {
            ...(currentTransforms[p.id] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
            fitMode: "cover",
          };
          hasTransformChanges = true;
        }
      });
      currentTransforms["local-host"] = {
        ...(currentTransforms["local-host"] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
        fitMode: "cover",
      };
      currentTransforms["active-media"] = {
        ...(currentTransforms["active-media"] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
        fitMode: "cover",
      };
      hasTransformChanges = true;
    } else if (layout === "side-by-side" || layout === "fit") {
      get().participants.forEach((p) => {
        currentTransforms[p.id] = {
          ...(currentTransforms[p.id] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
          fitMode: "contain",
        };
        hasTransformChanges = true;
      });
      currentTransforms["local-host"] = {
        ...(currentTransforms["local-host"] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
        fitMode: "contain",
      };
      currentTransforms["active-media"] = {
        ...(currentTransforms["active-media"] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
        fitMode: "contain",
      };
      hasTransformChanges = true;
    }

    let activeSceneId = get().activeSceneId;
    if (!activeSceneId || !get().scenes.some((s) => s.id === activeSceneId)) {
      activeSceneId = get().scenes[0]?.id || null;
    }

    const updatedScenes = activeSceneId
      ? get().scenes.map((s) =>
          s.id === activeSceneId
            ? {
                ...s,
                layout,
                splitRatio: defaultSplit,
                isStageCropped: nextCropped,
                participantBounds: {},
                ...(hasTransformChanges ? { tileTransforms: currentTransforms } : {}),
              }
            : s
        )
      : get().scenes;

    persistStudioLayout({
      activeLayout: layout,
      isStageCropped: nextCropped,
      layoutSplitRatio: defaultSplit,
      participantBounds: {},
      scenes: updatedScenes,
      activeSceneId: activeSceneId || undefined,
      ...(hasTransformChanges ? { tileTransforms: currentTransforms } : {}),
    });
    set({
      activeLayout: layout,
      isStageCropped: nextCropped,
      layoutSplitRatio: defaultSplit,
      participantBounds: {},
      selectedParticipantId: null,
      scenes: updatedScenes,
      activeSceneId,
      ...(hasTransformChanges ? { tileTransforms: currentTransforms } : {}),
    });
  },
  layoutSplitRatio: savedLayout.layoutSplitRatio !== undefined ? savedLayout.layoutSplitRatio : 50,
  setLayoutSplitRatio: (ratio) => {
    const clamped = Math.max(20, Math.min(80, ratio));
    let activeSceneId = get().activeSceneId;
    if (!activeSceneId || !get().scenes.some((s) => s.id === activeSceneId)) {
      activeSceneId = get().scenes[0]?.id || null;
    }
    const updatedScenes = activeSceneId
      ? get().scenes.map((s) => (s.id === activeSceneId ? { ...s, splitRatio: clamped } : s))
      : get().scenes;
    persistStudioLayout({ layoutSplitRatio: clamped, scenes: updatedScenes, activeSceneId: activeSceneId || undefined });
    set({ layoutSplitRatio: clamped, scenes: updatedScenes, activeSceneId });
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

      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, participantBounds: nextBounds } : sc
      );
      persistStudioLayout({ participantBounds: nextBounds, scenes: nextScenes });
      return {
        participantBounds: nextBounds,
        scenes: nextScenes,
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
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, participantBounds: next } : sc
      );
      persistStudioLayout({ participantBounds: next, scenes: nextScenes });
      return { participantBounds: next, scenes: nextScenes };
    }),
  resetAllParticipantBounds: () => {
    const state = get();
    const nextScenes = state.scenes.map((sc) =>
      sc.id === state.activeSceneId ? { ...sc, participantBounds: {} } : sc
    );
    persistStudioLayout({ participantBounds: {}, scenes: nextScenes });
    set({ participantBounds: {}, selectedParticipantId: null, scenes: nextScenes });
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
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId
          ? { ...sc, customLayoutConfig: nextConfig, heroParticipantId: nextConfig.heroParticipantId, participantBounds: {} }
          : sc
      );
      persistStudioLayout({ customLayoutConfig: nextConfig, participantBounds: {}, scenes: nextScenes });
      return { customLayoutConfig: nextConfig, participantBounds: {}, scenes: nextScenes };
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
      const activeScene = s.scenes.find((sc) => sc.id === s.activeSceneId);
      const merged = reconcileParticipantsWithScene(newParticipants, s.participants, activeScene);
      return { participants: merged };
    }),
  addParticipant: (participant) =>
    set((s) => {
      const activeScene = s.scenes.find((sc) => sc.id === s.activeSceneId);
      const merged = reconcileParticipantsWithScene(
        [...s.participants, participant],
        s.participants,
        activeScene
      );
      return { participants: merged };
    }),
  removeParticipant: (id) =>
    set((s) => {
      const remaining = s.participants.filter((p) => p.id !== id);
      const activeScene = s.scenes.find((sc) => sc.id === s.activeSceneId);
      const nextParticipants = reconcileParticipantsWithScene(remaining, remaining, activeScene, true);
      return { participants: nextParticipants };
    }),
  updateParticipant: (id, updates) =>
    set((s) => ({
      participants: s.participants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  toggleParticipantMic: (id) =>
    set((s) => {
      const target = s.participants.find((p) => String(p.id) === String(id));
      const nextMicOn = target ? !target.micOn : false;
      const isLocalUser = target?.isLocal || String(id).includes("host") || String(id).includes("local");

      // Event dispatch karein taaki useLiveKit turant Guest ko LiveKit DataChannel se remote mute bhej de
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("livestudio-toggle-participant-mic", {
            detail: { participantId: String(id), micOn: nextMicOn, isLocal: Boolean(isLocalUser) },
          })
        );
      }

      return {
        micEnabled: isLocalUser ? nextMicOn : s.micEnabled,
        participants: s.participants.map((p) =>
          String(p.id) === String(id) ? { ...p, micOn: nextMicOn } : p
        ),
      };
    }),
  moveToStage: (id) =>
    set((s) => {
      const nextParticipants = s.participants.map((p) =>
        p.id === id ? { ...p, status: "ON_STAGE" as const } : p
      );
      const onStageIds = nextParticipants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, onStageParticipantIds: onStageIds } : sc
      );
      persistStudioLayout({ scenes: nextScenes });
      return { participants: nextParticipants, scenes: nextScenes };
    }),
  moveToBackstage: (id) =>
    set((s) => {
      const nextParticipants = s.participants.map((p) =>
        p.id === id ? { ...p, status: "BACKSTAGE" as const } : p
      );
      const onStageIds = nextParticipants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, onStageParticipantIds: onStageIds } : sc
      );
      persistStudioLayout({ scenes: nextScenes });
      return { participants: nextParticipants, scenes: nextScenes };
    }),
  setStageParticipants: (stageIds) =>
    set((s) => {
      const stageSet = new Set(stageIds.map(String));
      const nextParticipants = s.participants.map((p) => ({
        ...p,
        status: (stageSet.has(String(p.id)) ? "ON_STAGE" : "BACKSTAGE") as any,
      }));
      const onStageIds = nextParticipants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, onStageParticipantIds: onStageIds } : sc
      );
      persistStudioLayout({ scenes: nextScenes });
      return { participants: nextParticipants, scenes: nextScenes };
    }),

  // StreamYard Pre-Show Guest Slot Management
  preAddGuestSlotToScene: (sceneId) =>
    set((s) => {
      const targetId = sceneId || s.activeSceneId;
      if (!targetId) return s;
      const nextScenes = s.scenes.map((sc) => {
        if (sc.id !== targetId) return sc;
        const nextSlots = Math.min(8, (sc.expectedGuestSlots || 0) + 1);
        return { ...sc, expectedGuestSlots: nextSlots, autoAddGuestsToStage: true };
      });
      const updatedActive = nextScenes.find((sc) => sc.id === s.activeSceneId);
      const nextParticipants = reconcileParticipantsWithScene(s.participants, s.participants, updatedActive, true);
      persistStudioLayout({ scenes: nextScenes });
      return { scenes: nextScenes, participants: nextParticipants };
    }),
  removeGuestSlotFromScene: (sceneId) =>
    set((s) => {
      const targetId = sceneId || s.activeSceneId;
      if (!targetId) return s;
      const nextScenes = s.scenes.map((sc) => {
        if (sc.id !== targetId) return sc;
        const nextSlots = Math.max(0, (sc.expectedGuestSlots || 0) - 1);
        return { ...sc, expectedGuestSlots: nextSlots };
      });
      persistStudioLayout({ scenes: nextScenes });
      return { scenes: nextScenes };
    }),
  setAutoAddGuestsToStage: (enabled, sceneId) =>
    set((s) => {
      const targetId = sceneId || s.activeSceneId;
      if (!targetId) return s;
      const nextScenes = s.scenes.map((sc) => {
        if (sc.id !== targetId) return sc;
        // Jab Auto-Stage ON karein aur Guest Slots 0 ho, to automatically Guest Slots ko 1 kar dein!
        const nextSlots = enabled ? Math.max(1, sc.expectedGuestSlots || 1) : sc.expectedGuestSlots;
        return { ...sc, autoAddGuestsToStage: enabled, expectedGuestSlots: nextSlots };
      });
      const updatedActive = nextScenes.find((sc) => sc.id === s.activeSceneId);
      const nextParticipants = reconcileParticipantsWithScene(s.participants, s.participants, updatedActive, true);
      persistStudioLayout({ scenes: nextScenes });
      return { scenes: nextScenes, participants: nextParticipants };
    }),
  setReplaceHostOnGuestJoin: (enabled, sceneId) =>
    set((s) => {
      const targetId = sceneId || s.activeSceneId;
      if (!targetId) return s;
      const nextScenes = s.scenes.map((sc) =>
        sc.id === targetId
          ? {
              ...sc,
              replaceHostOnGuestJoin: enabled,
              // Replace Host ON karne par Auto-Stage aur 1 Guest Slot bhi auto-enable kar dein
              ...(enabled ? { autoAddGuestsToStage: true, expectedGuestSlots: Math.max(1, sc.expectedGuestSlots || 1) } : {}),
            }
          : sc
      );
      const updatedActive = nextScenes.find((sc) => sc.id === s.activeSceneId);
      const nextParticipants = reconcileParticipantsWithScene(s.participants, s.participants, updatedActive, true);
      persistStudioLayout({ scenes: nextScenes });
      return { scenes: nextScenes, participants: nextParticipants };
    }),
  assignParticipantToSlot: (slotIndex, participantId, sceneId) =>
    set((s) => {
      const targetId = sceneId || s.activeSceneId;
      if (!targetId) return s;
      const nextScenes = s.scenes.map((sc) => {
        if (sc.id !== targetId) return sc;
        const nextMap = { ...(sc.slotAssignments || {}) };
        if (participantId === null) {
          delete nextMap[slotIndex];
        } else {
          nextMap[slotIndex] = participantId;
        }
        return { ...sc, slotAssignments: nextMap };
      });
      const updatedActive = nextScenes.find((sc) => sc.id === s.activeSceneId);
      const nextParticipants = reconcileParticipantsWithScene(s.participants, s.participants, updatedActive);
      persistStudioLayout({ scenes: nextScenes });
      return { scenes: nextScenes, participants: nextParticipants };
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
  activeTextCard: savedLayout.activeTextCard ?? initialActiveScene?.textCard ?? null,
  setSceneTextCard: (card) =>
    set((s) => {
      const base: SceneTextCard = s.activeTextCard || {
        enabled: true,
        heading: "LIVE KEYNOTE",
        subheading: "",
        textColor: "#ffffff",
        bgColor: "#0f172a",
        bgOpacity: 85,
        position: "center",
        fontSize: "large",
      };
      const nextCard = card === null ? null : { ...base, ...card };
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, textCard: nextCard } : sc
      );
      persistStudioLayout({ activeTextCard: nextCard, scenes: nextScenes });
      return { activeTextCard: nextCard, scenes: nextScenes };
    }),
  tickerText:
    savedLayout.tickerText ||
    "🔥 Welcome to LiveStudio 2.0 • Ask your questions in the live chat! • Streaming to YouTube",
  showTicker: savedLayout.showTicker !== undefined ? savedLayout.showTicker : false,

  tileTransforms: savedLayout.tileTransforms || {},
  setTileTransform: (id, updates) =>
    set((s) => {
      const key = String(id);
      const isScreen = key.includes("screen");
      const defaultFit = isScreen ? "contain" : key === "active-media" ? (s.isStageCropped ? "cover" : "contain") : "cover";
      const current: TileTransform = s.tileTransforms[key] || {
        fitMode: defaultFit as "contain" | "cover",
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
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId
          ? {
              ...sc,
              tileTransforms: nextTransforms,
              ...(key === "active-media" && updates.isTransparentBg !== undefined
                ? { isTransparentMedia: Boolean(updates.isTransparentBg) }
                : {}),
            }
          : sc
      );
      persistStudioLayout({ tileTransforms: nextTransforms, scenes: nextScenes });
      return {
        tileTransforms: nextTransforms,
        scenes: nextScenes,
      };
    }),
  resetTileTransform: (id) =>
    set((s) => {
      const key = String(id);
      const isScreen = key.includes("screen");
      const defaultFit = isScreen ? "contain" : key === "active-media" ? (s.isStageCropped ? "cover" : "contain") : "cover";
      const defaultTransform: TileTransform = {
        fitMode: defaultFit as "contain" | "cover",
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
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, tileTransforms: nextTransforms } : sc
      );
      persistStudioLayout({ tileTransforms: nextTransforms, scenes: nextScenes });
      return {
        tileTransforms: nextTransforms,
        scenes: nextScenes,
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
  setBackground: (url, type) =>
    set((s) => {
      const resolvedType =
        type ||
        (url &&
        (url.endsWith(".mp4") ||
          url.endsWith(".webm") ||
          url.includes("mixkit") ||
          url.includes("video"))
          ? "video"
          : "image");
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId
          ? { ...sc, backgroundUrl: url, backgroundType: resolvedType }
          : sc
      );
      persistStudioLayout({
        activeBackgroundUrl: url,
        activeBackgroundType: resolvedType,
        scenes: nextScenes,
      });
      return {
        activeBackgroundUrl: url,
        activeBackgroundType: resolvedType,
        scenes: nextScenes,
      };
    }),
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
  setBanner: (banner) =>
    set((s) => {
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, banner } : sc
      );
      persistStudioLayout({ activeBanner: banner, scenes: nextScenes });
      return { activeBanner: banner, scenes: nextScenes };
    }),
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
  setStageOverlay: (overlay) =>
    set((s) => {
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, stageOverlay: overlay } : sc
      );
      persistStudioLayout({ activeStageOverlay: overlay, scenes: nextScenes });
      return { activeStageOverlay: overlay, scenes: nextScenes };
    }),
  toggleStageOverlay: (overlay) =>
    set((s) => {
      const next = s.activeStageOverlay?.id === overlay.id ? null : overlay;
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, stageOverlay: next } : sc
      );
      persistStudioLayout({ activeStageOverlay: next, scenes: nextScenes });
      return { activeStageOverlay: next, scenes: nextScenes };
    }),
  updateStageOverlay: (updates) =>
    set((s) => {
      if (!s.activeStageOverlay) return {};
      const updated = { ...s.activeStageOverlay, ...updates };
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, stageOverlay: updated } : sc
      );
      persistStudioLayout({ activeStageOverlay: updated, scenes: nextScenes });
      return {
        activeStageOverlay: updated,
        scenes: nextScenes,
        overlayHistory: s.overlayHistory.map((item) => (item.id === updated.id ? updated : item)),
      };
    }),
  toggleStageOverlayVisibility: () =>
    set((s) => {
      if (!s.activeStageOverlay) return {};
      const updated = { ...s.activeStageOverlay, isShowing: !s.activeStageOverlay.isShowing };
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, stageOverlay: updated } : sc
      );
      persistStudioLayout({ activeStageOverlay: updated, scenes: nextScenes });
      return {
        activeStageOverlay: updated,
        scenes: nextScenes,
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
  setActiveMedia: (media) =>
    set((s) => {
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, activeMedia: media } : sc
      );
      persistStudioLayout({ activeMedia: media, scenes: nextScenes });
      return { activeMedia: media, scenes: nextScenes };
    }),
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

  // Multi-Slide Presentation Controls (StreamYard Paid Plan)
  nextSlide: () => {
    const media = get().activeMedia;
    if (!media || !media.slides || media.slides.length === 0) return;
    const nextIdx = Math.min(media.slides.length - 1, (media.currentSlideIndex || 0) + 1);
    get().setActiveMedia({
      ...media,
      currentSlideIndex: nextIdx,
      url: media.slides[nextIdx],
    });
  },
  prevSlide: () => {
    const media = get().activeMedia;
    if (!media || !media.slides || media.slides.length === 0) return;
    const prevIdx = Math.max(0, (media.currentSlideIndex || 0) - 1);
    get().setActiveMedia({
      ...media,
      currentSlideIndex: prevIdx,
      url: media.slides[prevIdx],
    });
  },
  goToSlide: (index: number) => {
    const media = get().activeMedia;
    if (!media || !media.slides || !media.slides[index]) return;
    get().setActiveMedia({
      ...media,
      currentSlideIndex: index,
      url: media.slides[index],
    });
  },

  // Auto-Advance Scene when Intro/Video Media Ends
  triggerMediaEnded: () => {
    const state = get();
    const activeScene = state.scenes.find((s) => s.id === state.activeSceneId);
    if (activeScene?.nextSceneIdOnMediaEnd) {
      const targetExists = state.scenes.some((s) => s.id === activeScene.nextSceneIdOnMediaEnd);
      if (targetExists) {
        get().switchScene(activeScene.nextSceneIdOnMediaEnd);
        return;
      }
    }
    if (state.activeMedia && !state.activeMedia.loop) {
      get().setActiveMedia(null);
    }
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

  // Private Backstage Chat (Host <-> Guests)
  privateMessages: [
    {
      id: "priv-welcome",
      sender: "System",
      role: "system",
      text: "Private Backstage Chat active. Messages here are only visible to the Host and Guests.",
      timestamp: "Now",
    },
  ],
  addPrivateMessage: (msg, broadcast = true) =>
    set((s) => {
      const entry = {
        id: msg.id || `priv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: msg.sender,
        role: msg.role || "guest",
        text: msg.text,
        timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      if (s.privateMessages.some((m) => m.id === entry.id)) return s;

      if (broadcast && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("livestudio-send-private-chat", { detail: entry }));
      }
      return { privateMessages: [...s.privateMessages, entry] };
    }),

  // Media Stage Position / Slot Index (0 = Left/Top-Left/Hero, 1 = Right/Middle/Top-Right, etc.)
  mediaSlotIndex: savedLayout.scenes?.find((s) => s.id === savedLayout.activeSceneId)?.mediaSlotIndex ?? 0,
  setMediaSlotIndex: (slotIndex) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(8, slotIndex));
      const prevSlot = s.mediaSlotIndex ?? 0;

      // 2-Window Split (Cropped / Fit / Side-by-Side / Podcast / Interview) me Left <-> Right switch hone par
      // layoutSplitRatio ko mirror (100 - ratio) karein taaki Media aur Guest ka size ulta na ho!
      const isTwoColumnSplit =
        s.activeLayout === "cropped" ||
        s.activeLayout === "podcast" ||
        s.activeLayout === "interview" ||
        s.activeLayout === "side-by-side" ||
        s.activeLayout === "fit" ||
        s.activeLayout === "stacked";

      let nextSplit = s.layoutSplitRatio;
      if (isTwoColumnSplit && ((prevSlot === 0 && clamped >= 1) || (prevSlot >= 1 && clamped === 0))) {
        nextSplit = Math.max(20, Math.min(80, 100 - s.layoutSplitRatio));
      }

      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId
          ? { ...sc, mediaSlotIndex: clamped, splitRatio: nextSplit }
          : sc
      );
      persistStudioLayout({ layoutSplitRatio: nextSplit, scenes: nextScenes });
      return { mediaSlotIndex: clamped, layoutSplitRatio: nextSplit, scenes: nextScenes };
    }),

  moveParticipantOrder: (id, direction) =>
    set((s) => {
      const onStage = s.participants.filter((p) => p.status === "ON_STAGE");
      const currentIdx = onStage.findIndex((p) => String(p.id) === String(id));
      if (currentIdx === -1) return s;

      const targetIdx = direction === "left" ? currentIdx - 1 : currentIdx + 1;
      if (targetIdx < 0 || targetIdx >= onStage.length) return s;

      // Swap positions in the main participants array
      const idA = onStage[currentIdx].id;
      const idB = onStage[targetIdx].id;
      const fullList = [...s.participants];
      const fullIdxA = fullList.findIndex((p) => p.id === idA);
      const fullIdxB = fullList.findIndex((p) => p.id === idB);
      if (fullIdxA !== -1 && fullIdxB !== -1) {
        const temp = fullList[fullIdxA];
        fullList[fullIdxA] = fullList[fullIdxB];
        fullList[fullIdxB] = temp;
      }

      const nextOnStageIds = fullList.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
      const nextScenes = s.scenes.map((sc) =>
        sc.id === s.activeSceneId ? { ...sc, onStageParticipantIds: nextOnStageIds } : sc
      );
      persistStudioLayout({ scenes: nextScenes });
      return { participants: fullList, scenes: nextScenes };
    }),

  // 1-Click Solo / Spotlight Memory State
  soloTargetId: null,
  preSoloSnapshot: null,
  toggleSoloParticipant: (id) =>
    set((s) => {
      const targetStr = String(id);
      // Agar pehle se Solo hai, toh wapas purana layout aur stage participants restore karein
      if (s.soloTargetId && String(s.soloTargetId) === targetStr && s.preSoloSnapshot) {
        const prevSet = new Set(s.preSoloSnapshot.onStageIds.map(String));
        const restoredParticipants = s.participants.map((p) => ({
          ...p,
          status: (prevSet.has(String(p.id)) ? "ON_STAGE" : "BACKSTAGE") as any,
        }));
        return {
          soloTargetId: null,
          activeLayout: s.preSoloSnapshot.layout,
          participants: restoredParticipants,
          preSoloSnapshot: null,
        };
      }

      // Naya Solo activate karein: current state snapshot me save karein
      const currentOnStageIds = s.participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
      const snapshot = s.preSoloSnapshot || {
        layout: s.activeLayout,
        onStageIds: currentOnStageIds,
      };

      if (targetStr === "active-media") {
        return {
          soloTargetId: "active-media",
          preSoloSnapshot: snapshot,
          activeLayout: "cinema",
        };
      }

      const soloParticipants = s.participants.map((p) => ({
        ...p,
        status: (String(p.id) === targetStr ? "ON_STAGE" : "BACKSTAGE") as any,
      }));

      return {
        soloTargetId: id,
        preSoloSnapshot: snapshot,
        activeLayout: "solo",
        participants: soloParticipants,
      };
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
  setTitle: (title) => {
    set({ broadcastTitle: title });
    persistStudioLayout({ broadcastTitle: title });
  },

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
  scenes: initialScenes,
  activeSceneId: initialActiveSceneId,
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
      expectedGuestSlots: custom?.expectedGuestSlots ?? 1,
      autoAddGuestsToStage: custom?.autoAddGuestsToStage ?? true,
      transitionType: custom?.transitionType || "fade",
      textCard: custom?.textCard ?? null,
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
    get().switchScene(newScene.id);
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
    const wasActive = get().activeSceneId === id;
    const nextActive = wasActive ? next[0].id : get().activeSceneId;
    persistStudioLayout({ scenes: next, activeSceneId: nextActive });
    set({ scenes: next, activeSceneId: nextActive });
    if (wasActive && nextActive) {
      get().switchScene(nextActive);
    }
  },
  duplicateScene: (id) => {
    // Agar active scene duplicate ho raha hai, toh pehle stage ki har current setting usme save karein
    if (get().activeSceneId === id) {
      get().saveCurrentStageToScene(id);
    }
    const scene = get().scenes.find((s) => s.id === id);
    if (!scene) return;

    // 100% Deep Clone taaki Media position, Zoom, Pan, Crop, Guest Slots sab exact copy hon
    const deepCloned: StudioScene = JSON.parse(JSON.stringify(scene));
    const copy: StudioScene = {
      ...deepCloned,
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
    const state = get();
    const scene = state.scenes.find((s) => s.id === id);
    if (!scene) return;

    // Switch karne se pehle current active scene ka poora state auto-save karein (StreamYard standard)
    if (state.activeSceneId && state.activeSceneId !== id) {
      get().saveCurrentStageToScene(state.activeSceneId);
    }

    const transition = scene.transitionType || "fade";
    if (transition !== "cut") {
      set({ isSceneTransitioning: true, activeTransitionType: transition });
      setTimeout(() => set({ isSceneTransitioning: false }), 420);
    }

    const targetLayout = scene.layout || "solo";
    const targetCropped =
      scene.isStageCropped !== undefined
        ? scene.isStageCropped
        : targetLayout === "cropped" || targetLayout === "podcast";

    const targetSplit =
      scene.splitRatio ??
      (targetLayout === "three-equal"
        ? 33
        : targetLayout === "speaker-large" || targetLayout === "presentation"
        ? 65
        : 50);

    // StreamYard Scene Participant Reconciliation:
    // Supports Media-Only scenes, auto-promoting connected guests, and replaceHostOnGuestJoin
    const nextParticipants = reconcileParticipantsWithScene(state.participants, [], scene, true);

    // Restore scene-specific tileTransforms (Zoom, Pan, Fit/Cover, Transparent Media)
    const currentTransforms: Record<string, TileTransform> = scene.tileTransforms
      ? JSON.parse(JSON.stringify(scene.tileTransforms))
      : { ...state.tileTransforms };

    nextParticipants.forEach((p) => {
      if (!p.isScreen) {
        currentTransforms[p.id] = {
          ...(currentTransforms[p.id] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
          fitMode: targetCropped || targetLayout === "cropped" || targetLayout === "podcast" ? "cover" : (currentTransforms[p.id]?.fitMode || "cover"),
        };
      }
    });

    const savedSceneMediaFit = scene.tileTransforms?.["active-media"]?.fitMode;
    currentTransforms["active-media"] = {
      ...(currentTransforms["active-media"] || { zoom: 1, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false }),
      fitMode: targetCropped ? "cover" : (savedSceneMediaFit || "contain"),
      ...(scene.isTransparentMedia !== undefined ? { isTransparentBg: Boolean(scene.isTransparentMedia) } : {}),
    };

    const nextBgUrl = scene.backgroundUrl !== undefined ? scene.backgroundUrl : state.activeBackgroundUrl;
    const nextBgType = scene.backgroundType || state.activeBackgroundType;
    const nextStageOverlay = scene.stageOverlay !== undefined ? scene.stageOverlay : state.activeStageOverlay;
    const nextBanner = scene.banner !== undefined ? scene.banner : state.activeBanner;
    const nextTextCard = scene.textCard !== undefined ? scene.textCard : null;
    const nextMedia = scene.activeMedia !== undefined ? scene.activeMedia : null;
    const nextBounds = scene.participantBounds ? JSON.parse(JSON.stringify(scene.participantBounds)) : {};
    const nextCustomConfig = scene.customLayoutConfig
      ? { ...state.customLayoutConfig, ...scene.customLayoutConfig }
      : { ...state.customLayoutConfig, heroParticipantId: scene.heroParticipantId ?? null };

    // Single atomic state update (prevents UI flicker & layout overwrites)
    set({
      activeSceneId: id,
      activeLayout: targetLayout,
      isStageCropped: targetCropped,
      layoutSplitRatio: targetSplit,
      participantBounds: nextBounds,
      selectedParticipantId: null,
      participants: nextParticipants,
      tileTransforms: currentTransforms,
      activeMedia: nextMedia,
      activeBackgroundUrl: nextBgUrl,
      activeBackgroundType: nextBgType,
      activeStageOverlay: nextStageOverlay,
      activeBanner: nextBanner,
      activeTextCard: nextTextCard,
      activeExtraCameraDeviceId: scene.extraCameraDeviceId || null,
      mediaSlotIndex: scene.mediaSlotIndex ?? 0,
      customLayoutConfig: nextCustomConfig,
    });

    persistStudioLayout({
      activeSceneId: id,
      activeLayout: targetLayout,
      isStageCropped: targetCropped,
      layoutSplitRatio: targetSplit,
      participantBounds: nextBounds,
      tileTransforms: currentTransforms,
      activeMedia: nextMedia,
      activeBackgroundUrl: nextBgUrl,
      activeBackgroundType: nextBgType,
      activeStageOverlay: nextStageOverlay,
      activeBanner: nextBanner,
      activeTextCard: nextTextCard,
    });
  },
  saveCurrentStageToScene: (id) => {
    const state = get();
    const onStageIds = state.participants.filter((p) => p.status === "ON_STAGE").map((p) => p.id);
    const existingScene = state.scenes.find((s) => s.id === id);
    get().updateScene(id, {
      layout: state.activeLayout,
      isStageCropped: state.isStageCropped,
      splitRatio: state.layoutSplitRatio,
      mediaSlotIndex: state.mediaSlotIndex ?? 0,
      tileTransforms: JSON.parse(JSON.stringify(state.tileTransforms || {})),
      participantBounds: JSON.parse(JSON.stringify(state.participantBounds || {})),
      customLayoutConfig: JSON.parse(JSON.stringify(state.customLayoutConfig || {})),
      onStageParticipantIds: onStageIds,
      expectedGuestSlots: existingScene?.expectedGuestSlots,
      autoAddGuestsToStage: existingScene?.autoAddGuestsToStage,
      replaceHostOnGuestJoin: existingScene?.replaceHostOnGuestJoin,
      slotAssignments: existingScene?.slotAssignments,
      activeMedia: state.activeMedia ? JSON.parse(JSON.stringify(state.activeMedia)) : null,
      extraCameraDeviceId: state.activeExtraCameraDeviceId ?? existingScene?.extraCameraDeviceId ?? null,
      textCard: state.activeTextCard || null,
      isTransparentMedia: state.tileTransforms["active-media"]?.isTransparentBg ?? false,
      backgroundUrl: state.activeBackgroundUrl || null,
      backgroundType: state.activeBackgroundType,
      stageOverlay: state.activeStageOverlay || null,
      banner: state.activeBanner || null,
      heroParticipantId: state.customLayoutConfig?.heroParticipantId || null,
    });
  },
}));
