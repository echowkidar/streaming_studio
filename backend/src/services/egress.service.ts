import {
  EgressClient,
  EncodingOptionsPreset,
  StreamOutput,
  StreamProtocol,
} from 'livekit-server-sdk';

import type { RoomCompositeOptions, WebOptions, EncodedOutputs } from 'livekit-server-sdk';

export class EgressService {
  private static instance: EgressService;
  private egressClient: EgressClient;
  private activeEgresses: Map<string, string>; // broadcastId -> egressId

  private constructor() {
    const host = process.env.LIVEKIT_HTTP_URL || 'http://livekit:7880';
    const apiKey = process.env.LIVEKIT_API_KEY || 'APIxxxxxxxxxx';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'CHANGE_ME_LIVEKIT_SECRET';

    this.egressClient = new EgressClient(host, apiKey, apiSecret);
    this.activeEgresses = new Map();
  }

  public static getInstance(): EgressService {
    if (!EgressService.instance) {
      EgressService.instance = new EgressService();
    }
    return EgressService.instance;
  }

  /**
   * Start Room Composite Egress — captures the entire LiveKit room and streams to RTMP
   */
  async startRoomCompositeEgress(
    roomName: string,
    rtmpUrls: string[]
  ): Promise<{ egressId: string }> {
    try {
      console.log(`[Egress] Starting Room Composite Egress for room "${roomName}" → ${rtmpUrls.length} destination(s)`);

      const streamOutput: StreamOutput = {
        protocol: StreamProtocol.RTMP,
        urls: rtmpUrls,
      };

      const output: EncodedOutputs = {
        stream: streamOutput,
      };

      const opts: RoomCompositeOptions = {
        encodingOptions: EncodingOptionsPreset.H264_720P_30,
      };

      const info = await this.egressClient.startRoomCompositeEgress(roomName, output, opts);

      const egressId = info.egressId ?? '';
      console.log(`[Egress] Started successfully: egressId="${egressId}"`);
      return { egressId };
    } catch (error) {
      console.error(`[Egress] Error starting Room Composite Egress:`, error);
      throw error;
    }
  }

  /**
   * Start Web Egress — captures a webpage URL and streams to RTMP
   * Use this for custom studio layouts with overlays, tickers, logos etc.
   */
  async startWebEgress(
    webUrl: string,
    rtmpUrls: string[]
  ): Promise<{ egressId: string }> {
    try {
      console.log(`[Egress] Starting Web Egress for URL "${webUrl}" → ${rtmpUrls.length} destination(s)`);

      const streamOutput: StreamOutput = {
        protocol: StreamProtocol.RTMP,
        urls: rtmpUrls,
      };

      const output: EncodedOutputs = {
        stream: streamOutput,
      };

      const opts: WebOptions = {
        encodingOptions: EncodingOptionsPreset.H264_720P_30,
      };

      const info = await this.egressClient.startWebEgress(webUrl, output, opts);

      const egressId = info.egressId ?? '';
      console.log(`[Egress] Started Web Egress: egressId="${egressId}"`);
      return { egressId };
    } catch (error) {
      console.error(`[Egress] Error starting Web Egress:`, error);
      throw error;
    }
  }

  /**
   * Dynamically add an RTMP destination to a running egress (no restart needed!)
   */
  async addStreamDestination(egressId: string, rtmpUrl: string): Promise<void> {
    try {
      console.log(`[Egress] Adding destination to egress ${egressId}: ${rtmpUrl}`);
      await this.egressClient.updateStream(egressId, [rtmpUrl], []);
    } catch (error) {
      console.error(`[Egress] Error adding stream destination:`, error);
      throw error;
    }
  }

  /**
   * Dynamically remove an RTMP destination from a running egress
   */
  async removeStreamDestination(egressId: string, rtmpUrl: string): Promise<void> {
    try {
      console.log(`[Egress] Removing destination from egress ${egressId}: ${rtmpUrl}`);
      await this.egressClient.updateStream(egressId, [], [rtmpUrl]);
    } catch (error) {
      console.error(`[Egress] Error removing stream destination:`, error);
      throw error;
    }
  }

  /**
   * Stop an active egress session
   */
  async stopEgress(egressId: string): Promise<void> {
    try {
      console.log(`[Egress] Stopping egress ${egressId}`);
      await this.egressClient.stopEgress(egressId);
      console.log(`[Egress] Egress ${egressId} stopped successfully`);
    } catch (error) {
      console.error(`[Egress] Error stopping egress:`, error);
      throw error;
    }
  }

  /**
   * List all active egress sessions, optionally filtered by room name
   */
  async listActiveEgresses(roomName?: string): Promise<unknown[]> {
    try {
      console.log(`[Egress] Listing active egresses${roomName ? ` for room "${roomName}"` : ''}`);
      const egresses = await this.egressClient.listEgress({ roomName, active: true });
      return egresses;
    } catch (error) {
      console.error(`[Egress] Error listing egresses:`, error);
      throw error;
    }
  }

  /**
   * Track broadcast → egress mapping
   */
  setEgressForBroadcast(broadcastId: string, egressId: string): void {
    this.activeEgresses.set(broadcastId, egressId);
  }

  getEgressForBroadcast(broadcastId: string): string | undefined {
    return this.activeEgresses.get(broadcastId);
  }

  removeEgressForBroadcast(broadcastId: string): void {
    this.activeEgresses.delete(broadcastId);
  }
}

export default EgressService;
