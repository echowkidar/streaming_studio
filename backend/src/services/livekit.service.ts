import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { z } from 'zod';

export type ServiceResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

export const ParticipantSchema = z.object({
  identity: z.string(),
  name: z.string(),
  metadata: z.string().optional(),
});

export const RoomSchema = z.object({
  name: z.string(),
  emptyTimeout: z.number().optional(),
  maxParticipants: z.number().optional(),
});

export type ParticipantInput = z.infer<typeof ParticipantSchema>;
export type RoomInput = z.infer<typeof RoomSchema>;

export class LiveKitService {
  private readonly roomService: RoomServiceClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly host: string;

  constructor() {
    const rawHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_HTTP_URL || process.env.LIVEKIT_HOST || 'http://livekit:7880';
    this.host = rawHost.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://');
    this.apiKey = process.env.LIVEKIT_API_KEY || 'APIxxxxxxxxxx';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || 'CHANGE_ME_LIVEKIT_SECRET';

    this.roomService = new RoomServiceClient(this.host, this.apiKey, this.apiSecret);
  }

  public async generateToken(
    roomName: string, 
    participant: ParticipantInput,
    isHost = false
  ): Promise<ServiceResponse<string>> {
    try {
      const validated = ParticipantSchema.parse(participant);
      
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: validated.identity,
        name: validated.name,
        metadata: validated.metadata,
      });

      at.addGrant({ 
        roomJoin: true, 
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: isHost,
      });

      const token = await at.toJwt();
      return { success: true, data: token };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid participant configuration' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate token' };
    }
  }

  /**
   * Generate a subscriber-only token for the LiveKit Web Egress headless browser.
   * The browser joins the room, subscribes to all tracks, renders the composite,
   * and LiveKit Cloud captures the page and streams it to RTMP.
   */
  public async generateEgressToken(roomName: string): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: `egress-bot-${Date.now()}`,
      name: 'LiveStudio Egress',
      ttl: 10800, // 3 hours — enough for any live stream
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: false,      // observer only — no publishing
      canSubscribe: true,     // must subscribe to participant tracks
      canPublishData: false,
    });

    return at.toJwt();
  }

  public async createRoom(input: RoomInput): Promise<ServiceResponse<unknown>> {
    try {
      const validated = RoomSchema.parse(input);
      
      const room = await this.roomService.createRoom({
        name: validated.name,
        emptyTimeout: validated.emptyTimeout ?? 300,
        maxParticipants: validated.maxParticipants ?? 50,
      });

      return { success: true, data: room };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid room configuration' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create room' };
    }
  }

  public async listRooms(): Promise<ServiceResponse<unknown[]>> {
    try {
      const rooms = await this.roomService.listRooms();
      return { success: true, data: rooms };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list rooms' };
    }
  }

  public async removeParticipant(roomName: string, identity: string): Promise<ServiceResponse<void>> {
    try {
      if (!roomName || !identity) {
        return { success: false, error: 'Room name and identity are required' };
      }
      
      await this.roomService.removeParticipant(roomName, identity);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove participant' };
    }
  }

  public getRoomService(): RoomServiceClient {
    return this.roomService;
  }

  /**
   * Verify whether a video track SID is registered and active in the given room.
   * If audioTrackId is missing, automatically discovers and returns an active audio track SID from the room.
   */
  public async verifyAndResolveTracks(
    roomName: string,
    videoTrackId?: string,
    audioTrackId?: string,
    maxWaitMs: number = 4000
  ): Promise<{ videoTrackReady: boolean; audioTrackId?: string }> {
    const startTime = Date.now();
    let videoReady = false;
    let resolvedAudioId = audioTrackId;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const participants = await this.roomService.listParticipants(roomName);
        let foundVideo = false;

        for (const p of participants) {
          if (!p.tracks) continue;
          for (const t of p.tracks) {
            if (videoTrackId && t.sid === videoTrackId) {
              foundVideo = true;
            }
            // Auto-detect audio track if not provided or empty
            if (!resolvedAudioId && (t.type === 0 || (t.type as any) === 'AUDIO') && t.sid) {
              resolvedAudioId = t.sid;
              console.log(`[LiveKitService] Auto-detected audio track "${t.sid}" from participant "${p.identity}"`);
            }
          }
        }

        if (!videoTrackId || foundVideo) {
          videoReady = foundVideo;
          break;
        }
      } catch (err) {
        console.warn(`[LiveKitService] listParticipants polling notice:`, err instanceof Error ? err.message : err);
      }

      // Wait 600ms before next poll
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    return { videoTrackReady: videoReady, audioTrackId: resolvedAudioId };
  }
}
