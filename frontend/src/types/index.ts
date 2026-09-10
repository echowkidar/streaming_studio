export type UserRole = "SUPER_ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
}

export type WorkspaceRole = "OWNER" | "ADMIN" | "PRODUCER" | "CREATOR";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  logoUrl?: string;
  role?: WorkspaceRole;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  joinedAt: string;
}

export type BroadcastStatus = 
  | "DRAFT" 
  | "SCHEDULED" 
  | "PREPARING" 
  | "GREEN_ROOM" 
  | "READY" 
  | "RECORDING" 
  | "LIVE" 
  | "ENDING" 
  | "ENDED" 
  | "FAILED";

export interface Studio {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  defaultLayout: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Broadcast {
  id: string;
  studioId: string;
  workspaceId: string;
  title: string;
  status: BroadcastStatus;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  viewerCount?: number;
  health?: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  settings?: Record<string, unknown>;
  destinations?: Destination[];
  createdAt: string;
}

export type ParticipantRole = "HOST" | "CO_HOST" | "PRODUCER" | "GUEST";
export type ParticipantStatus = "GREEN_ROOM" | "BACKSTAGE" | "ON_STAGE" | "REMOVED";

export interface Participant {
  id: string | number;
  name: string;
  role: ParticipantRole | "host" | "guest" | "screen";
  status: ParticipantStatus;
  micOn: boolean;
  camOn: boolean;
  isSpeaking: boolean;
  isScreen?: boolean;
  avatar?: string;
  connectionQuality?: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
}

export type DestinationPlatform = "YOUTUBE" | "FACEBOOK" | "TWITCH" | "LINKEDIN" | "CUSTOM_RTMP";
export type DestinationStatus = "DISCONNECTED" | "CONNECTING" | "LIVE" | "RECONNECTING" | "FAILED" | "STOPPED";

export interface Destination {
  id: string;
  name: string;
  platform: DestinationPlatform;
  rtmpUrl: string;
  status: DestinationStatus;
  enabled?: boolean;
  lastUsedAt?: string;
}

export interface Recording {
  id: string;
  broadcastId?: string;
  title: string;
  status: "PROCESSING" | "READY" | "FAILED";
  duration: number; // in seconds
  resolution: string;
  fileSize: number; // in bytes
  thumbnailUrl?: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  assetType: "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "SLIDES";
  mimeType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  tags?: string[];
  createdAt: string;
}

export interface BrandAsset {
  id: string;
  brandType: "LOGO" | "OVERLAY" | "BACKGROUND_IMAGE" | "BACKGROUND_VIDEO" | "LOWER_THIRD" | "BANNER";
  name: string;
  url: string;
  settings?: Record<string, unknown>;
}

export interface LowerThirdBanner {
  id: string;
  title: string;
  subtitle?: string;
  themeColor?: string;
  isShowing: boolean;
  isTicker?: boolean;
}

export interface ChatMessage {
  id: string;
  platform: "youtube" | "facebook" | "twitch" | "webinar" | "internal";
  author: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isHighlighted?: boolean;
}

export interface Webinar {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "ENDED";
  registrantsCount: number;
  registrationEnabled: boolean;
}

export interface AiClip {
  id: string;
  title: string;
  score: number; // 0 - 100
  startTime: number;
  endTime: number;
  format: "9:16" | "1:1" | "16:9";
  thumbnailUrl?: string;
  videoUrl?: string;
  captions?: string;
  status: "READY" | "PROCESSING" | "QUEUED";
}

export interface TranscriptItem {
  id: string;
  recordingTitle: string;
  duration: number;
  language: string;
  wordCount: number;
  createdAt: string;
  segments: {
    speaker: string;
    text: string;
    timestamp: string;
  }[];
}
