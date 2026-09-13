/**
 * LiveStudio Stage Broadcaster
 * Composites the active studio stage (participants, active media, layouts, backgrounds, overlays, banners, tickers)
 * into a pristine 1280x720 30fps canvas + Web Audio stream, and pipes real-time WebM chunks to
 * the backend FFmpeg RTMP service for broadcast to YouTube Live / Twitch / Facebook.
 * 
 * Optimized for buttery-smooth playback (zero DOM layout thrashing, 30fps throttled compositor,
 * strict sequential FIFO chunk queuing, and resilient audio mixing).
 */

import { useStudioStore } from "@/stores/studio.store";

interface CachedTileLayout {
  element: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
  isMedia: boolean;
  mediaName: string;
  name: string;
  initials: string;
  camOn: boolean;
  micOn: boolean;
  isLocal: boolean;
  isScreen: boolean;
  role: string;
}

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

  // Frame Rate Throttling (Strict 30 FPS to save CPU and eliminate video stutter)
  private lastFrameTime = 0;
  private readonly FRAME_INTERVAL = 1000 / 30; // ~33.33ms

  // Layout Cache (Eliminates forced synchronous layout thrashing)
  private cachedLayouts: CachedTileLayout[] = [];
  private lastLayoutCacheTime = 0;

  // News Ticker
  private tickerOffset = 0;
  private lastTickerTime = 0;

  // Audio Connections
  private connectedAudioTracks = new Set<string>();
  private connectedMediaElements = new Set<HTMLMediaElement>();

  // Cached Background & Overlay Images
  private cachedBgUrl: string | null = null;
  private bgImage: HTMLImageElement | null = null;
  private cachedOverlayUrl: string | null = null;
  private overlayImage: HTMLImageElement | null = null;

  // Background Web Worker Clock (prevents tab throttling to 1 FPS when switching to YouTube Studio tab)
  private workerTimer: Worker | null = null;
  private workerBlobUrl: string | null = null;

  // Strict Sequential FIFO Upload Queue (prevents out-of-order chunks)
  private chunkQueue: Blob[] = [];
  private isUploading = false;

  // Tracks for LiveKit WebRTC transmission
  private activeVideoTrack: MediaStreamTrack | null = null;
  private activeAudioTrack: MediaStreamTrack | null = null;

  public isStreaming(): boolean {
    return this.isBroadcasting;
  }

  /**
   * Start 30 FPS Canvas render loop & Web Audio mix, returning live MediaStreamTracks for WebRTC
   * This allows LiveKit to stream the exact stage (with overlays, tickers, banners, backgrounds) to YouTube!
   */
  public startStageComposite(stageElement: HTMLElement | null): { videoTrack: MediaStreamTrack; audioTrack: MediaStreamTrack | null } | null {
    if (this.isBroadcasting && this.activeVideoTrack) {
      return { videoTrack: this.activeVideoTrack, audioTrack: this.activeAudioTrack };
    }

    const container = stageElement || document.getElementById("livestudio-stage-container");
    if (!container) {
      console.error("[StageBroadcaster] Stage container element not found");
      return null;
    }

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
      this.stopStageComposite();
      return null;
    }

    // 2. Setup Web Audio API Pipeline (Continuous stereo AAC for YouTube Live)
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch((audioResumeErr) => {
          console.warn("[StageBroadcaster] AudioContext resume warning:", audioResumeErr);
        });
      }
      this.audioDestination = this.audioCtx.createMediaStreamDestination();

      // Continuous gentle carrier (amplitude 0.0002 = ~ -74dB)
      // Completely inaudible to human ears, but forces WebRTC & GStreamer AAC to stream 128 kbps audio packets 24/7 without silence suppression/DTX
      const sampleRate = this.audioCtx.sampleRate || 48000;
      const bufferSize = sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(2, bufferSize, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const channelData = noiseBuffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          channelData[i] = (Math.random() * 2 - 1) * 0.0002;
        }
      }
      const carrier = this.audioCtx.createBufferSource();
      carrier.buffer = noiseBuffer;
      carrier.loop = true;
      carrier.connect(this.audioDestination);
      carrier.start();
    } catch (audioErr) {
      console.warn("[StageBroadcaster] Web Audio initialization warning:", audioErr);
    }

    // 3. Connect active audio tracks
    this.refreshAudioConnections();

    // 4. Initial layout snapshot
    this.updateLayoutCache(container, WIDTH, HEIGHT);

    // 5. Start Resilient 30 FPS Canvas Render Loop (Dual clock: Worker Timer + requestAnimationFrame)
    this.lastTickerTime = performance.now();
    this.lastFrameTime = performance.now();

    const doRenderFrame = (now: number) => {
      if (!this.isBroadcasting || !this.ctx || !this.canvas) return;

      const elapsed = now - this.lastFrameTime;
      if (elapsed >= this.FRAME_INTERVAL) {
        this.lastFrameTime = now - (elapsed % this.FRAME_INTERVAL);

        if (now - this.lastLayoutCacheTime > 250) {
          this.updateLayoutCache(container, WIDTH, HEIGHT);
          this.refreshAudioConnections();
          this.lastLayoutCacheTime = now;
        }

        this.renderStageFrame(container, WIDTH, HEIGHT, now);
      }
    };

    // Foreground VSync Loop
    const render = (time: number) => {
      if (!this.isBroadcasting) return;
      doRenderFrame(time);
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);

    // Background Web Worker Clock: Prevents Chrome from throttling/pausing loop to 1 FPS when switching tabs
    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 33);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      this.workerBlobUrl = URL.createObjectURL(blob);
      this.workerTimer = new Worker(this.workerBlobUrl);
      this.workerTimer.onmessage = () => {
        if (this.isBroadcasting) {
          doRenderFrame(performance.now());
        }
      };
      this.workerTimer.postMessage("start");
    } catch (wErr) {
      console.warn("[StageBroadcaster] Worker timer fallback:", wErr);
    }

    // 6. Extract MediaStreamTracks
    const canvasStream = this.canvas.captureStream(30);
    this.activeVideoTrack = canvasStream.getVideoTracks()[0] || null;

    if (this.audioDestination && this.audioDestination.stream) {
      const aTracks = this.audioDestination.stream.getAudioTracks();
      if (aTracks.length > 0) {
        this.activeAudioTrack = aTracks[0];
      }
    }

    if (!this.activeVideoTrack) {
      console.error("[StageBroadcaster] Failed to capture canvas video track");
      this.stopStageComposite();
      return null;
    }

    console.log("[StageBroadcaster] Stage composite active (30 FPS background-resilient canvas + mixed audio).");
    return { videoTrack: this.activeVideoTrack, audioTrack: this.activeAudioTrack };
  }

  public stopStageComposite() {
    this.isBroadcasting = false;
    this.activeVideoTrack = null;
    this.activeAudioTrack = null;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.workerTimer) {
      try {
        this.workerTimer.postMessage("stop");
        this.workerTimer.terminate();
      } catch {}
      this.workerTimer = null;
    }
    if (this.workerBlobUrl) {
      try {
        URL.revokeObjectURL(this.workerBlobUrl);
      } catch {}
      this.workerBlobUrl = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }

    this.connectedAudioTracks.clear();
    this.connectedMediaElements.clear();
    this.cachedLayouts = [];
    this.canvas = null;
    this.ctx = null;
    this.cachedBgUrl = null;
    this.bgImage = null;
    this.cachedOverlayUrl = null;
    this.overlayImage = null;
    console.log("[StageBroadcaster] Stage composite stopped and resources freed.");
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
    this.chunkQueue = [];
    this.isUploading = false;

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

    // 2. Setup Web Audio API Pipeline (Continuous stereo AAC for YouTube Live)
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.audioDestination = this.audioCtx.createMediaStreamDestination();

      // Silent baseline carrier tone (amplitude 0.0001) to keep RTMP audio stream alive
      const osc = this.audioCtx.createOscillator();
      this.silentGain = this.audioCtx.createGain();
      this.silentGain.gain.value = 0.0001;
      osc.connect(this.silentGain);
      this.silentGain.connect(this.audioDestination);
      osc.start();
    } catch (audioErr) {
      console.warn("[StageBroadcaster] Web Audio initialization warning:", audioErr);
    }

    // 3. Connect active audio tracks
    this.refreshAudioConnections();

    // 4. Initial layout snapshot
    this.updateLayoutCache(container, WIDTH, HEIGHT);

    // 5. Start Throttled 30 FPS Canvas Render Loop
    this.lastTickerTime = performance.now();
    this.lastFrameTime = performance.now();

    const render = (time: number) => {
      if (!this.isBroadcasting || !this.ctx || !this.canvas) return;

      // Throttle strictly to 30 FPS to prevent GPU/CPU saturation
      const elapsed = time - this.lastFrameTime;
      if (elapsed >= this.FRAME_INTERVAL) {
        this.lastFrameTime = time - (elapsed % this.FRAME_INTERVAL);

        // Refresh layout snapshot every 250ms (never every frame to avoid layout thrashing)
        if (time - this.lastLayoutCacheTime > 250) {
          this.updateLayoutCache(container, WIDTH, HEIGHT);
          this.lastLayoutCacheTime = time;
        }

        this.renderStageFrame(container, WIDTH, HEIGHT, time);
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);

    // 6. Combine Video Track from Canvas + Audio Track from Web Audio Destination
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
        videoBitsPerSecond: 1800000, // 1.8 Mbps clean 720p HD streaming without network choke
        audioBitsPerSecond: 128000,  // 128 kbps stereo AAC
      });

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0 && this.activeBroadcastId) {
          this.enqueueChunk(e.data);
        }
      };

      this.mediaRecorder.onerror = (recorderErr) => {
        console.error("[StageBroadcaster] MediaRecorder error:", recorderErr);
      };

      // Emit chunk every 1000ms for stable RTMP delivery
      this.mediaRecorder.start(1000);
      console.log("[StageBroadcaster] Live stage streaming initiated successfully.");
      return true;
    } catch (streamErr) {
      console.error("[StageBroadcaster] Failed to start MediaRecorder stream:", streamErr);
      this.stop();
      return false;
    }
  }

  /**
   * Snapshot stage layout bounds outside the 30fps draw loop to prevent forced layout thrashing
   */
  private updateLayoutCache(container: HTMLElement, W: number, H: number) {
    try {
      const containerRect = container.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const scaleX = W / containerRect.width;
      const scaleY = H / containerRect.height;

      const stageTiles = container.querySelectorAll("[data-stage-tile]");
      const nextLayouts: CachedTileLayout[] = [];

      stageTiles.forEach((el) => {
        const tile = el as HTMLElement;
        const tileRect = tile.getBoundingClientRect();

        const x = (tileRect.left - containerRect.left) * scaleX;
        const y = (tileRect.top - containerRect.top) * scaleY;
        const w = tileRect.width * scaleX;
        const h = tileRect.height * scaleY;

        if (w <= 0 || h <= 0) return;

        const isMedia = tile.hasAttribute("data-stage-media");
        const mediaName = tile.getAttribute("data-media-name") || "Media";
        const name = tile.getAttribute("data-participant-name") || "Guest";
        const initials = tile.getAttribute("data-participant-initials") || "U";
        const camOn = tile.getAttribute("data-participant-cam") === "on";
        const micOn = tile.getAttribute("data-participant-mic") === "on";
        const isLocal = tile.getAttribute("data-participant-local") === "true";
        const isScreen = tile.getAttribute("data-participant-screen") === "true";
        const role = tile.getAttribute("data-participant-role") || "";

        nextLayouts.push({
          element: tile,
          x,
          y,
          w,
          h,
          isMedia,
          mediaName,
          name,
          initials,
          camOn,
          micOn,
          isLocal,
          isScreen,
          role,
        });
      });

      this.cachedLayouts = nextLayouts;
    } catch (err) {
      console.warn("[StageBroadcaster] Layout snapshot warning:", err);
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
        const mediaTrack =
          (p.audioTrack as any)?.mediaStreamTrack ||
          (p.audioTrack instanceof MediaStreamTrack ? p.audioTrack : null);

        if (mediaTrack && mediaTrack.readyState === "live") {
          const trackId = mediaTrack.id || String(p.id);
          if (!this.connectedAudioTracks.has(trackId)) {
            try {
              const srcStream = new MediaStream([mediaTrack]);
              const srcNode = this.audioCtx!.createMediaStreamSource(srcStream);
              srcNode.connect(this.audioDestination!);
              this.connectedAudioTracks.add(trackId);
              console.log(`[StageBroadcaster] Connected mic audio for participant: ${p.name}`);
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
   * Render single frame of the live stage onto the composite canvas using cached layout coordinates
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

    // ─────────────────────────────────────────────────────────────
    // 2. Draw All Stage Tiles from Cached Layouts (Zero DOM Thrashing)
    // ─────────────────────────────────────────────────────────────
    for (let i = 0; i < this.cachedLayouts.length; i++) {
      const tile = this.cachedLayouts[i];
      const { element: el, x, y, w, h, isMedia } = tile;

      ctx.save();
      this.drawRoundedRect(ctx, x, y, w, h, 14);
      ctx.clip();

      // Card background
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(x, y, w, h);

      if (isMedia) {
        // ── Media Tile (Video or Image/Slides) ──
        const mediaVideo = el.querySelector("video") as HTMLVideoElement | null;
        const mediaImg = el.querySelector("img") as HTMLImageElement | null;

        if (mediaVideo && mediaVideo.readyState >= 2 && mediaVideo.videoWidth > 0) {
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

        // Media Name Pill
        if (tile.mediaName) {
          ctx.font = "bold 11px Inter, system-ui, sans-serif";
          const pillW = Math.min(220, tile.mediaName.length * 7 + 28);
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

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(tile.mediaName.slice(0, 24), pillX + 16, pillY + pillH / 2);
        }
      } else {
        // ── Participant Tile ──
        const video = el.querySelector("video") as HTMLVideoElement | null;
        const canvas = el.querySelector("canvas") as HTMLCanvasElement | null;
        const hasVideo =
          tile.camOn &&
          video &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          !video.classList.contains("opacity-0");
        const hasChroma = canvas && canvas.width > 0 && canvas.height > 0;

        if (hasChroma && canvas) {
          ctx.drawImage(canvas, x, y, w, h);
        } else if (hasVideo && video) {
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

          if (tile.isLocal && !tile.isScreen) {
            ctx.save();
            ctx.translate(x + w, y);
            ctx.scale(-1, 1);
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
            ctx.restore();
          } else {
            ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
          }
        } else {
          // Camera is OFF: Avatar Circle + Initials + "Camera Off"
          const centerX = x + w / 2;
          const centerY = y + h / 2 - 12;
          const radius = Math.max(18, Math.min(36, Math.min(w, h) * 0.22));

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

          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(radius * 1.05)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(tile.initials, centerX, centerY + 1);

          const pillY = centerY + radius + 14;
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
          this.drawRoundedRect(ctx, centerX - 42, pillY - 9, 84, 18, 9);
          ctx.fill();
          ctx.fillStyle = "#94a3b8";
          ctx.font = "500 10px Inter, system-ui, sans-serif";
          ctx.fillText("Camera Off", centerX, pillY);
        }

        // Participant Name Pill
        const displayName = `${tile.name}${tile.isLocal ? " (You)" : ""}`;
        ctx.font = "bold 11px Inter, system-ui, sans-serif";
        const pillW = Math.min(180, displayName.length * 7 + 36);
        const pillH = 24;
        const pillX = x + 10;
        const pillY = y + h - pillH - 10;

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
        ctx.fillText(displayName.slice(0, 20), pillX + 16, pillY + pillH / 2);

        // Mic dot
        const micDotX = pillX + pillW - 9;
        ctx.beginPath();
        ctx.arc(micDotX, pillY + pillH / 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = tile.micOn ? "#10b981" : "#f43f5e";
        ctx.fill();
      }

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 2.5. Interactive Stage Overlay (Circle Avatar, Sponsor Graphics, Floating Video)
    // ─────────────────────────────────────────────────────────────
    if (store.activeStageOverlay && store.activeStageOverlay.isShowing && store.activeStageOverlay.url) {
      const overlay = store.activeStageOverlay;
      const overlayEl = container.querySelector("[data-stage-overlay]") as HTMLElement | null;

      let ox = 0, oy = 0, ow = 0, oh = 0;
      let hasCoords = false;

      if (overlayEl) {
        const containerRect = container.getBoundingClientRect();
        const oRect = overlayEl.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0 && oRect.width > 0 && oRect.height > 0) {
          const scaleX = W / containerRect.width;
          const scaleY = H / containerRect.height;
          ox = (oRect.left - containerRect.left) * scaleX;
          oy = (oRect.top - containerRect.top) * scaleY;
          ow = oRect.width * scaleX;
          oh = oRect.height * scaleY;
          hasCoords = true;
        }
      }

      if (!hasCoords) {
        const scalePct = (overlay.scale || 35) / 100;
        ow = W * scalePct;
        oh = overlay.cropMode === "circle" || overlay.cropMode === "square" ? ow : ow * 0.5625;
        if (overlay.position === "custom" && overlay.customCoords) {
          ox = (overlay.customCoords.x / 100) * W;
          oy = (overlay.customCoords.y / 100) * H;
        } else if (overlay.position === "top-left") {
          ox = W * 0.04;
          oy = H * 0.04;
        } else if (overlay.position === "top-right") {
          ox = W * 0.96 - ow;
          oy = H * 0.04;
        } else if (overlay.position === "bottom-left") {
          ox = W * 0.04;
          oy = H * 0.93 - oh;
        } else if (overlay.position === "bottom-right") {
          ox = W * 0.96 - ow;
          oy = H * 0.93 - oh;
        } else {
          ox = (W - ow) / 2;
          oy = (H - oh) / 2;
        }
      }

      if (ow > 0 && oh > 0) {
        ctx.save();
        if (overlay.opacity !== undefined) {
          ctx.globalAlpha = Math.max(0.05, Math.min(1, overlay.opacity / 100));
        }

        if (overlay.cropMode === "circle") {
          const radius = Math.min(ow, oh) / 2;
          ctx.beginPath();
          ctx.arc(ox + ow / 2, oy + oh / 2, radius, 0, Math.PI * 2);
          ctx.clip();
        } else if (overlay.borderRadius) {
          this.drawRoundedRect(ctx, ox, oy, ow, oh, overlay.borderRadius);
          ctx.clip();
        }

        if (overlay.showBackdrop) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(ox, oy, ow, oh);
        }

        const vidEl = overlayEl?.querySelector("video") as HTMLVideoElement | null;
        const imgEl = overlayEl?.querySelector("img") as HTMLImageElement | null;

        if (vidEl && vidEl.readyState >= 2) {
          ctx.drawImage(vidEl, ox, oy, ow, oh);
        } else if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
          ctx.drawImage(imgEl, ox, oy, ow, oh);
        } else {
          if (this.cachedOverlayUrl !== overlay.url) {
            this.cachedOverlayUrl = overlay.url;
            this.overlayImage = new Image();
            this.overlayImage.crossOrigin = "anonymous";
            this.overlayImage.src = overlay.url;
          }
          if (this.overlayImage && this.overlayImage.complete && this.overlayImage.naturalWidth > 0) {
            ctx.drawImage(this.overlayImage, ox, oy, ow, oh);
          }
        }

        ctx.restore();
      }
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
      const pillW = logoText.length * 8 + 36;
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
      const tH = 38;
      const tY = H - tH;

      ctx.fillStyle = store.tickerConfig?.bgColor || "#050508";
      ctx.fillRect(0, tY, W, tH);

      // Top border accent
      ctx.fillStyle = store.activeThemeColor || "#6366f1";
      ctx.fillRect(0, tY, W, 2);

      // ── Live Updates Badge on Left (matching Studio UI) ──
      const badgeText = store.tickerConfig?.badgeText || "LIVE UPDATES";
      ctx.font = "bold 11px Inter, system-ui, sans-serif";
      const badgeWidth = ctx.measureText(badgeText).width + 24;
      ctx.fillStyle = store.tickerConfig?.badgeBgColor || "#e11d48";
      ctx.fillRect(0, tY, badgeWidth, tH);

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeWidth / 2, tY + tH / 2);

      // ── Crawling Text Area (Clipped to right of badge) ──
      ctx.save();
      ctx.beginPath();
      ctx.rect(badgeWidth, tY, W - badgeWidth, tH);
      ctx.clip();

      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillStyle = store.tickerConfig?.textColor || "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const textWidth = ctx.measureText(store.tickerText).width;
      const crawlAreaW = W - badgeWidth;
      const totalSpan = textWidth + crawlAreaW;
      const currentX = W - (this.tickerOffset % totalSpan);

      ctx.fillText(store.tickerText, currentX, tY + tH / 2);
      ctx.restore();

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
   * Enqueue chunk into strict sequential FIFO queue to guarantee ordered delivery
   */
  private enqueueChunk(chunk: Blob) {
    this.chunkQueue.push(chunk);
    this.processUploadQueue();
  }

  /**
   * Process queue sequentially one chunk at a time (prevents out-of-order WebM chunks)
   */
  private async processUploadQueue() {
    if (this.isUploading || this.chunkQueue.length === 0 || !this.activeBroadcastId) return;
    this.isUploading = true;

    while (this.chunkQueue.length > 0 && this.isBroadcasting && this.activeBroadcastId) {
      const chunk = this.chunkQueue[0];
      let uploaded = false;
      let retries = 0;

      while (!uploaded && retries < 3 && this.isBroadcasting && this.activeBroadcastId) {
        retries++;
        try {
          const res = await fetch(`/api/broadcasts/${this.activeBroadcastId}/stream/chunk`, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk,
          });
          if (res.ok) {
            uploaded = true;
          } else {
            await new Promise((r) => setTimeout(r, 200));
          }
        } catch (err) {
          console.warn(`[StageBroadcaster] Chunk upload retry #${retries}:`, err);
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Dequeue only after success or max retries
      this.chunkQueue.shift();
    }

    this.isUploading = false;
  }

  /**
   * Stop broadcast
   */
  public stop() {
    this.isBroadcasting = false;
    this.activeBroadcastId = null;
    this.chunkQueue = [];
    this.isUploading = false;

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
    this.cachedLayouts = [];
    this.canvas = null;
    this.ctx = null;
    this.cachedBgUrl = null;
    this.bgImage = null;
    console.log("[StageBroadcaster] Live stream stopped and resources freed.");
  }
}

export const stageBroadcaster = new StageBroadcaster();
