/**
 * LiveStudio Stage Broadcaster
 * Composites the active studio stage (participants, layouts, backgrounds, overlays, banners, tickers)
 * into a pristine 1280x720 30fps canvas + Web Audio stream, and pipes real-time WebM chunks to
 * the backend FFmpeg RTMP service for broadcast to YouTube Live / Twitch / Facebook.
 */

import { useStudioStore } from "@/stores/studio.store";

class StageBroadcaster {
  private mediaRecorder: MediaRecorder | null = null;
  private animFrameId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audioCtx: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private silentGain: GainNode | null = null;
  private activeBroadcastId: string | null = null;
  private isBroadcasting = false;
  private tickerOffset = 0;
  private lastTickerTime = 0;
  private connectedAudioTracks = new Set<string>();

  public isStreaming(): boolean {
    return this.isBroadcasting;
  }

  /**
   * Start broadcasting the live stage
   */
  public async start(stageElement: HTMLElement | null, broadcastId: string): Promise<boolean> {
    if (this.isBroadcasting) {
      console.warn("[StageBroadcaster] Already broadcasting");
      return true;
    }

    const container = stageElement || document.getElementById("livestudio-stage-container");
    if (!container) {
      console.error("[StageBroadcaster] Stage container element not found");
      return false;
    }

    this.activeBroadcastId = broadcastId;
    this.isBroadcasting = true;

    // 1. Setup Composite 720p HD Canvas (1280x720 @ 30fps)
    const WIDTH = 1280;
    const HEIGHT = 720;
    this.canvas = document.createElement("canvas");
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d", { alpha: false });

    if (!this.ctx) {
      console.error("[StageBroadcaster] Failed to get canvas 2d context");
      this.stop();
      return false;
    }

    // 2. Setup Web Audio API Pipeline (Ensures YouTube always receives continuous stereo AAC)
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.audioDestination = this.audioCtx.createMediaStreamDestination();

      // YouTube RTMP ingestion drops streams without an active audio track.
      // We generate a silent baseline carrier tone (amplitude 0) to ensure continuous audio packets.
      const osc = this.audioCtx.createOscillator();
      this.silentGain = this.audioCtx.createGain();
      this.silentGain.gain.value = 0.0001; // nearly silent baseline
      osc.connect(this.silentGain);
      this.silentGain.connect(this.audioDestination);
      osc.start();
    } catch (audioErr) {
      console.warn("[StageBroadcaster] Web Audio initialization warning:", audioErr);
    }

    // 3. Connect active audio tracks from stage participants
    this.refreshAudioConnections();

    // 4. Start Canvas Render Loop
    this.lastTickerTime = performance.now();
    const render = (time: number) => {
      if (!this.isBroadcasting || !this.ctx || !this.canvas) return;
      this.renderStageFrame(container, WIDTH, HEIGHT, time);
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);

    // 5. Combine Video Track from Canvas + Audio Track from Web Audio Destination
    try {
      const canvasStream = this.canvas.captureStream(30);
      const videoTrack = canvasStream.getVideoTracks()[0];

      const tracks: MediaStreamTrack[] = [];
      if (videoTrack) tracks.push(videoTrack);

      if (this.audioDestination && this.audioDestination.stream) {
        const audioTracks = this.audioDestination.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          tracks.push(audioTracks[0]);
        }
      }

      const combinedStream = new MediaStream(tracks);

      // Determine best supported WebM container for FFmpeg pipe
      let mimeType = "video/webm;codecs=vp8,opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=h264,opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
        }
      }

      console.log(`[StageBroadcaster] Starting MediaRecorder with MIME: ${mimeType}`);
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 3500000, // 3.5 Mbps for crystal-clear 720p HD YouTube streaming
        audioBitsPerSecond: 128000,  // 128 kbps AAC audio
      });

      this.mediaRecorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 0 && this.activeBroadcastId) {
          this.sendChunk(this.activeBroadcastId, e.data);
        }
      };

      this.mediaRecorder.onerror = (recorderErr) => {
        console.error("[StageBroadcaster] MediaRecorder error:", recorderErr);
      };

      // Emit chunk every 1000ms (1 second) for low-latency live RTMP delivery
      this.mediaRecorder.start(1000);
      console.log("[StageBroadcaster] Live stage streaming successfully initiated.");
      return true;
    } catch (streamErr) {
      console.error("[StageBroadcaster] Failed to start MediaRecorder stream:", streamErr);
      this.stop();
      return false;
    }
  }

  /**
   * Connect participant audio streams into the broadcast mix
   */
  public refreshAudioConnections() {
    if (!this.audioCtx || !this.audioDestination) return;

    try {
      const store = useStudioStore.getState();
      const onStageParticipants = store.participants.filter((p) => p.status === "ON_STAGE" && p.micOn !== false);

      onStageParticipants.forEach((p) => {
        if (p.audioTrack && p.audioTrack.mediaStreamTrack) {
          const trackId = p.audioTrack.mediaStreamTrack.id || String(p.id);
          if (!this.connectedAudioTracks.has(trackId)) {
            try {
              const srcStream = new MediaStream([p.audioTrack.mediaStreamTrack]);
              const srcNode = this.audioCtx!.createMediaStreamSource(srcStream);
              srcNode.connect(this.audioDestination!);
              this.connectedAudioTracks.add(trackId);
            } catch (err) {
              console.warn(`[StageBroadcaster] Audio connect error for participant ${p.name}:`, err);
            }
          }
        }
      });
    } catch (e) {
      console.warn("[StageBroadcaster] refreshAudioConnections error:", e);
    }
  }

  /**
   * Render single frame of the live stage onto the composite canvas
   */
  private renderStageFrame(container: HTMLElement, W: number, H: number, timestamp: number) {
    const ctx = this.ctx!;
    const store = useStudioStore.getState();

    // 1. Draw Background
    const bgVideo = container.querySelector("video.object-cover") as HTMLVideoElement | null;
    if (bgVideo && bgVideo.readyState >= 2) {
      ctx.drawImage(bgVideo, 0, 0, W, H);
    } else if (store.activeBackgroundUrl && !store.activeBackgroundUrl.endsWith(".mp4")) {
      // Draw cached image or solid color
      ctx.fillStyle = store.activeThemeColor || "#080811";
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = "#07070d";
      ctx.fillRect(0, 0, W, H);
    }

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const scaleX = W / containerRect.width;
    const scaleY = H / containerRect.height;

    // 2. Draw Participant Video / Chroma Canvas Tiles
    const tileElements = container.querySelectorAll("[data-participant-tile]");
    if (tileElements.length > 0) {
      tileElements.forEach((el) => {
        const tile = el as HTMLElement;
        const tileRect = tile.getBoundingClientRect();

        const x = (tileRect.left - containerRect.left) * scaleX;
        const y = (tileRect.top - containerRect.top) * scaleY;
        const w = tileRect.width * scaleX;
        const h = tileRect.height * scaleY;

        const video = tile.querySelector("video") as HTMLVideoElement | null;
        const canvas = tile.querySelector("canvas") as HTMLCanvasElement | null;

        ctx.save();
        // Rounded clip for smooth broadcast aesthetic
        this.drawRoundedRect(ctx, x, y, w, h, 14);
        ctx.clip();

        if (canvas && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(canvas, x, y, w, h);
        } else if (video && video.readyState >= 2) {
          ctx.drawImage(video, x, y, w, h);
        } else {
          // Placeholder avatar / dark slate
          ctx.fillStyle = "#12121e";
          ctx.fillRect(x, y, w, h);
        }

        ctx.restore();

        // Draw Participant Name Pill
        const nameEl = tile.querySelector("[data-participant-name]");
        const name = nameEl?.textContent || "";
        if (name) {
          ctx.save();
          ctx.font = "bold 13px Inter, system-ui, sans-serif";
          const textWidth = ctx.measureText(name).width;
          const pillW = textWidth + 24;
          const pillH = 26;
          const pillX = x + 12;
          const pillY = y + h - pillH - 12;

          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          this.drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.fillText(name, pillX + 12, pillY + 17);
          ctx.restore();
        }
      });
    } else {
      // If data-participant-tile is not yet tagged, fall back to any <video> or <canvas> elements
      const mediaElements = container.querySelectorAll("video, canvas");
      mediaElements.forEach((el) => {
        if (el === this.canvas) return;
        const media = el as HTMLVideoElement | HTMLCanvasElement;
        const mRect = media.getBoundingClientRect();
        if (mRect.width === containerRect.width) return; // skip background video

        const x = (mRect.left - containerRect.left) * scaleX;
        const y = (mRect.top - containerRect.top) * scaleY;
        const w = mRect.width * scaleX;
        const h = mRect.height * scaleY;

        ctx.save();
        this.drawRoundedRect(ctx, x, y, w, h, 12);
        ctx.clip();
        if (media instanceof HTMLVideoElement && media.readyState >= 2) {
          ctx.drawImage(media, x, y, w, h);
        } else if (media instanceof HTMLCanvasElement && media.width > 0) {
          ctx.drawImage(media, x, y, w, h);
        }
        ctx.restore();
      });
    }

    // 3. Lower-Third Banner
    if (store.activeBanner && store.activeBanner.isShowing && store.activeBanner.title) {
      const banner = store.activeBanner;
      ctx.save();
      const bX = 36;
      const bY = H - 110;
      const bW = 380;
      const bH = 64;

      ctx.fillStyle = "rgba(10, 10, 18, 0.92)";
      this.drawRoundedRect(ctx, bX, bY, bW, bH, 12);
      ctx.fill();

      // Theme accent bar
      ctx.fillStyle = banner.themeColor || store.activeThemeColor || "#6366f1";
      this.drawRoundedRect(ctx, bX, bY, 8, bH, 4);
      ctx.fill();

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Inter, system-ui, sans-serif";
      ctx.fillText(banner.title, bX + 22, bY + 28);

      // Subtitle
      if (banner.subtitle) {
        ctx.fillStyle = banner.themeColor || store.activeThemeColor || "#818cf8";
        ctx.font = "500 12px Inter, system-ui, sans-serif";
        ctx.fillText(banner.subtitle, bX + 22, bY + 50);
      }
      ctx.restore();
    }

    // 4. Watermark Logo
    if (store.showLogo && (store.logoConfig?.text || store.logoUrl)) {
      const logoText = store.logoConfig?.text || store.logoUrl || "LIVE";
      ctx.save();
      ctx.font = "bold 13px Inter, monospace, sans-serif";
      const textW = ctx.measureText(logoText.toUpperCase()).width;
      const pillW = textW + 36;
      const pillH = 30;

      let lX = W - pillW - 32;
      let lY = 32;
      if (store.logoPosition === "top-left") {
        lX = 32;
        lY = 32;
      } else if (store.logoPosition === "bottom-left") {
        lX = 32;
        lY = H - pillH - 48;
      } else if (store.logoPosition === "bottom-right") {
        lX = W - pillW - 32;
        lY = H - pillH - 48;
      }

      if (!store.logoConfig?.isTransparentBg) {
        ctx.fillStyle = store.logoConfig?.bgColor ? `${store.logoConfig.bgColor}cc` : "rgba(0, 0, 0, 0.8)";
        this.drawRoundedRect(ctx, lX, lY, pillW, pillH, 8);
        ctx.fill();
      }

      // Indicator dot
      ctx.fillStyle = store.activeThemeColor || "#6366f1";
      ctx.beginPath();
      ctx.arc(lX + 14, lY + pillH / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = store.logoConfig?.textColor || "#ffffff";
      ctx.fillText(logoText.toUpperCase(), lX + 24, lY + 20);
      ctx.restore();
    }

    // 5. News Ticker Crawl
    if (store.showTicker && store.tickerText) {
      const delta = (timestamp - this.lastTickerTime) / 1000;
      this.lastTickerTime = timestamp;

      const tickerSpeed = 120; // pixels per second
      this.tickerOffset += tickerSpeed * Math.min(delta, 0.1);

      ctx.save();
      const tH = 36;
      const tY = H - tH;

      ctx.fillStyle = store.tickerConfig?.bgColor || "#000000";
      ctx.fillRect(0, tY, W, tH);

      // Top border accent
      ctx.fillStyle = store.activeThemeColor || "#6366f1";
      ctx.fillRect(0, tY, W, 2);

      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillStyle = store.tickerConfig?.textColor || "#ffffff";

      const textWidth = ctx.measureText(store.tickerText).width;
      const totalSpan = textWidth + W;
      const currentX = W - (this.tickerOffset % totalSpan);

      ctx.fillText(store.tickerText, currentX, tY + 23);
      ctx.restore();
    }
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Push binary chunk to backend stream ingest route
   */
  private async sendChunk(broadcastId: string, chunk: Blob) {
    try {
      await fetch(`/api/broadcasts/${broadcastId}/stream/chunk`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk,
      });
    } catch (err) {
      console.warn("[StageBroadcaster] Chunk transmission warning:", err);
    }
  }

  /**
   * Stop broadcast
   */
  public stop() {
    this.isBroadcasting = false;
    this.activeBroadcastId = null;

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }

    this.connectedAudioTracks.clear();
    this.canvas = null;
    this.ctx = null;
    console.log("[StageBroadcaster] Live stream stopped and resources freed.");
  }
}

export const stageBroadcaster = new StageBroadcaster();
