/**
 * LiveStudio Stage Broadcaster
 * Composites the active studio stage (participants, active media, layouts, backgrounds, overlays, banners, tickers)
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
  private connectedMediaElements = new Set<HTMLMediaElement>();

  // Cached Background Image
  private cachedBgUrl: string | null = null;
  private bgImage: HTMLImageElement | null = null;

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
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.audioDestination = this.audioCtx.createMediaStreamDestination();

      // YouTube RTMP ingestion drops streams without an active audio track.
      // We generate a silent baseline carrier tone (amplitude 0.0001) to ensure continuous audio packets.
      const osc = this.audioCtx.createOscillator();
      this.silentGain = this.audioCtx.createGain();
      this.silentGain.gain.value = 0.0001;
      osc.connect(this.silentGain);
      this.silentGain.connect(this.audioDestination);
      osc.start();
    } catch (audioErr) {
      console.warn("[StageBroadcaster] Web Audio initialization warning:", audioErr);
    }

    // 3. Connect active audio tracks from stage participants and media
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
   * Connect participant and media audio streams into the broadcast mix
   */
  public refreshAudioConnections() {
    if (!this.audioCtx || !this.audioDestination) return;

    try {
      const store = useStudioStore.getState();

      // 1. Participant Microphones
      const onStageParticipants = store.participants.filter(
        (p) => p.status === "ON_STAGE" && p.micOn !== false
      );

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

      // 2. Active Stage Media Video / Audio Element
      const mediaVideo = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
      if (mediaVideo && !mediaVideo.muted) {
        try {
          const stream =
            (mediaVideo as any).captureStream?.() ||
            (mediaVideo as any).mozCaptureStream?.();

          if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack && !this.connectedAudioTracks.has(audioTrack.id)) {
              const srcNode = this.audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
              srcNode.connect(this.audioDestination);
              this.connectedAudioTracks.add(audioTrack.id);
              console.log("[StageBroadcaster] Connected media video audio stream to broadcast mix");
            }
          } else if (!this.connectedMediaElements.has(mediaVideo)) {
            // Fallback: createMediaElementSource
            const src = this.audioCtx.createMediaElementSource(mediaVideo);
            src.connect(this.audioDestination);
            src.connect(this.audioCtx.destination);
            this.connectedMediaElements.add(mediaVideo);
            console.log("[StageBroadcaster] Connected media video element node to broadcast mix");
          }
        } catch (err) {
          console.warn("[StageBroadcaster] Media audio capture error:", err);
        }
      }
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

    // ─────────────────────────────────────────────────────────────
    // 1. Draw Background Layer (Video, Wallpaper Image, or Dark Slate)
    // ─────────────────────────────────────────────────────────────
    const bgVideo = container.querySelector("video.object-cover") as HTMLVideoElement | null;
    if (bgVideo && bgVideo.readyState >= 2) {
      ctx.drawImage(bgVideo, 0, 0, W, H);
    } else if (store.activeBackgroundUrl && !store.activeBackgroundUrl.endsWith(".mp4")) {
      // Pre-load and cache background image
      if (this.cachedBgUrl !== store.activeBackgroundUrl) {
        this.cachedBgUrl = store.activeBackgroundUrl;
        this.bgImage = new Image();
        this.bgImage.crossOrigin = "anonymous";
        this.bgImage.src = store.activeBackgroundUrl;
      }
      if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
        ctx.drawImage(this.bgImage, 0, 0, W, H);
      } else {
        ctx.fillStyle = "#07070d";
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      ctx.fillStyle = "#07070d";
      ctx.fillRect(0, 0, W, H);
    }

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const scaleX = W / containerRect.width;
    const scaleY = H / containerRect.height;

    // ─────────────────────────────────────────────────────────────
    // 2. Draw All Stage Tiles (Media Video/Slides & Participant Windows)
    // ─────────────────────────────────────────────────────────────
    const stageTiles = container.querySelectorAll("[data-stage-tile]");
    if (stageTiles.length > 0) {
      stageTiles.forEach((el) => {
        const tile = el as HTMLElement;
        const tileRect = tile.getBoundingClientRect();

        const x = (tileRect.left - containerRect.left) * scaleX;
        const y = (tileRect.top - containerRect.top) * scaleY;
        const w = tileRect.width * scaleX;
        const h = tileRect.height * scaleY;

        if (w <= 0 || h <= 0) return;

        ctx.save();
        this.drawRoundedRect(ctx, x, y, w, h, 14);
        ctx.clip();

        // Dark card background
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(x, y, w, h);

        const isMedia = tile.hasAttribute("data-stage-media");

        if (isMedia) {
          // ── Media Tile (Video or Image/Slides) ──
          const mediaVideo = tile.querySelector("video") as HTMLVideoElement | null;
          const mediaImg = tile.querySelector("img") as HTMLImageElement | null;

          if (mediaVideo && mediaVideo.readyState >= 2 && mediaVideo.videoWidth > 0) {
            // Object contain fit for media video
            const vRatio = mediaVideo.videoWidth / mediaVideo.videoHeight;
            const tRatio = w / h;
            let dw = w, dh = h, dx = x, dy = y;
            if (vRatio > tRatio) {
              dh = w / vRatio;
              dy = y + (h - dh) / 2;
            } else {
              dw = h * vRatio;
              dx = x + (w - dw) / 2;
            }
            ctx.drawImage(mediaVideo, dx, dy, dw, dh);
          } else if (mediaImg && mediaImg.complete && mediaImg.naturalWidth > 0) {
            // Object contain fit for media image/pdf slide
            const iRatio = mediaImg.naturalWidth / mediaImg.naturalHeight;
            const tRatio = w / h;
            let dw = w, dh = h, dx = x, dy = y;
            if (iRatio > tRatio) {
              dh = w / iRatio;
              dy = y + (h - dh) / 2;
            } else {
              dw = h * iRatio;
              dx = x + (w - dw) / 2;
            }
            ctx.drawImage(mediaImg, dx, dy, dw, dh);
          }

          // Media Name Pill (top-left of media tile)
          const mediaName = tile.getAttribute("data-media-name") || "Media";
          if (mediaName) {
            ctx.font = "bold 11px Inter, system-ui, sans-serif";
            const textW = ctx.measureText(mediaName).width;
            const pillW = textW + 28;
            const pillH = 22;
            const pillX = x + 10;
            const pillY = y + 10;

            ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            this.drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
            ctx.fill();

            // Emerald dot
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.arc(pillX + 9, pillY + pillH / 2, 3, 0, Math.PI * 2);
            ctx.fill();

            // Text
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(mediaName, pillX + 16, pillY + pillH / 2);
          }
        } else {
          // ── Participant Tile ──
          const video = tile.querySelector("video") as HTMLVideoElement | null;
          const canvas = tile.querySelector("canvas") as HTMLCanvasElement | null;
          const camOn = tile.getAttribute("data-participant-cam") === "on";
          const hasVideo =
            camOn &&
            video &&
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            !video.classList.contains("opacity-0");
          const hasChroma = canvas && canvas.width > 0 && canvas.height > 0;

          if (hasChroma) {
            ctx.drawImage(canvas, x, y, w, h);
          } else if (hasVideo && video) {
            // Object cover fit for participant webcam / screen
            const vRatio = video.videoWidth / video.videoHeight;
            const tRatio = w / h;
            let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
            if (vRatio > tRatio) {
              sw = video.videoHeight * tRatio;
              sx = (video.videoWidth - sw) / 2;
            } else {
              sh = video.videoWidth / tRatio;
              sy = (video.videoHeight - sh) / 2;
            }

            const isLocal = tile.getAttribute("data-participant-local") === "true";
            const isScreen = tile.getAttribute("data-participant-screen") === "true";

            if (isLocal && !isScreen) {
              ctx.save();
              ctx.translate(x + w, y);
              ctx.scale(-1, 1);
              ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
              ctx.restore();
            } else {
              ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
            }
          } else {
            // Camera is OFF: Draw stylish Avatar Circle + Initials + "Camera Off"
            const initials = tile.getAttribute("data-participant-initials") || "U";
            const centerX = x + w / 2;
            const centerY = y + h / 2 - 12;
            const radius = Math.max(18, Math.min(36, Math.min(w, h) * 0.22));

            // Circle with vibrant gradient
            const grad = ctx.createLinearGradient(
              centerX - radius,
              centerY - radius,
              centerX + radius,
              centerY + radius
            );
            grad.addColorStop(0, "#4f46e5");
            grad.addColorStop(1, "#9333ea");
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Initials text
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.round(radius * 1.05)}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(initials, centerX, centerY + 1);

            // "Camera Off" pill
            const pillY = centerY + radius + 14;
            ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
            this.drawRoundedRect(ctx, centerX - 42, pillY - 9, 84, 18, 9);
            ctx.fill();
            ctx.fillStyle = "#94a3b8";
            ctx.font = "500 10px Inter, system-ui, sans-serif";
            ctx.fillText("Camera Off", centerX, pillY);
          }

          // Participant Name Pill (bottom-left)
          const name = tile.getAttribute("data-participant-name") || "Guest";
          const role = tile.getAttribute("data-participant-role") || "";
          const micOn = tile.getAttribute("data-participant-mic") === "on";
          const isLocal = tile.getAttribute("data-participant-local") === "true";
          const displayName = `${name}${isLocal ? " (You)" : ""}`;

          ctx.font = "bold 11px Inter, system-ui, sans-serif";
          const textW = ctx.measureText(displayName).width;
          const pillW = textW + 36;
          const pillH = 24;
          const pillX = x + 10;
          const pillY = y + h - pillH - 10;

          // Pill backdrop
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          this.drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
          ctx.fill();
          ctx.strokeStyle = `${store.activeThemeColor || "#6366f1"}50`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Theme dot
          ctx.fillStyle = store.activeThemeColor || "#6366f1";
          ctx.beginPath();
          ctx.arc(pillX + 9, pillY + pillH / 2, 3, 0, Math.PI * 2);
          ctx.fill();

          // Name text
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(displayName, pillX + 16, pillY + pillH / 2);

          // Mic status dot (emerald for mic on, rose for mic off)
          const micDotX = pillX + pillW - 9;
          ctx.beginPath();
          ctx.arc(micDotX, pillY + pillH / 2, 3, 0, Math.PI * 2);
          ctx.fillStyle = micOn ? "#10b981" : "#f43f5e";
          ctx.fill();
        }

        ctx.restore();
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Lower-Third Banner
    // ─────────────────────────────────────────────────────────────
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
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(banner.title, bX + 22, bY + 28);

      // Subtitle
      if (banner.subtitle) {
        ctx.fillStyle = banner.themeColor || store.activeThemeColor || "#818cf8";
        ctx.font = "500 12px Inter, system-ui, sans-serif";
        ctx.fillText(banner.subtitle, bX + 22, bY + 50);
      }
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Watermark Logo
    // ─────────────────────────────────────────────────────────────
    if (store.showLogo && (store.logoConfig?.text || store.logoUrl)) {
      const logoText = store.logoConfig?.text || store.logoUrl || "LIVE";
      ctx.save();
      ctx.font = "bold 13px Inter, monospace, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
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
        ctx.fillStyle = store.logoConfig?.bgColor
          ? `${store.logoConfig.bgColor}cc`
          : "rgba(0, 0, 0, 0.8)";
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
      ctx.fillText(logoText.toUpperCase(), lX + 24, lY + pillH / 2);
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 5. News Ticker Crawl
    // ─────────────────────────────────────────────────────────────
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
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const textWidth = ctx.measureText(store.tickerText).width;
      const totalSpan = textWidth + W;
      const currentX = W - (this.tickerOffset % totalSpan);

      ctx.fillText(store.tickerText, currentX, tY + tH / 2);
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
    this.connectedMediaElements.clear();
    this.canvas = null;
    this.ctx = null;
    this.cachedBgUrl = null;
    this.bgImage = null;
    console.log("[StageBroadcaster] Live stream stopped and resources freed.");
  }
}

export const stageBroadcaster = new StageBroadcaster();
