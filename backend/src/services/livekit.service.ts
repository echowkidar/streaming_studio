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
    this.host = process.env.LIVEKIT_HTTP_URL ?? process.env.LIVEKIT_HOST ?? 'http://livekit:7880';
    this.apiKey = process.env.LIVEKIT_API_KEY ?? 'APIxxxxxxxxxx';
    this.apiSecret = process.env.LIVEKIT_API_SECRET ?? 'CHANGE_ME_LIVEKIT_SECRET';

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
}
