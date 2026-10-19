/**
 * LiveStudio Stage Broadcaster
 * Composites the active studio stage (participants, active media, layouts, backgrounds, overlays, banners, tickers)
 * into a pristine 1280x720 30fps canvas + Web Audio stream, and pipes real-time WebM chunks to
 * the backend FFmpeg RTMP service for broadcast to YouTube Live / Twitch / Facebook.
 *
 * Optimized for buttery-smooth playback (zero DOM layout thrashing, 30fps throttled compositor,
 * strict sequential FIFO chunk queuing, distortion-free audio mixing for Recording & Streaming,
 * and refined 35mm cinema Fair-Use visual/audio protection).
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
  fitMode?: string;
  isTransparentCard?: boolean;
  participantId?: string;
  zIndex?: number;
}

class StageBroadcaster {
  private mediaRecorder: MediaRecorder | null = null;
  private animFrameId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audioCtx: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private activeBroadcastId: string | null = null;
  private isBroadcasting = false;
  private isStreamingRtmp = false;
  private isLocalRecordingActive = false;

  // Frame Rate Throttling (Strict 30 FPS to save CPU and eliminate video stutter)
  private lastFrameTime = 0;
  private readonly FRAME_TOLERANCE = 27; // ms (smooth 30 FPS on 60Hz/120Hz/144Hz displays)

  // Layout Cache (Eliminates forced synchronous layout thrashing)
  private cachedLayouts: CachedTileLayout[] = [];
  private lastLayoutCacheTime = 0;

  // News Ticker
  private tickerOffset = 0;
  private lastTickerTime = 0;

  // Fair-Use Auto-Pause & Idle Commentary Tracking
  private lastAutoPauseTimestamp = 0;
  private nextRandomIntervalMs = 9500; // Random 8000ms to 12000ms
  private isAutoPausedByFairUse = false;
  private lastHostActiveTimestamp = 0;
  private boundEndedElements = new WeakSet<HTMLMediaElement>();

  // Audio Connections (GainNode per participant track to eliminate mute/backstage leaks)
  private participantAudioNodes = new Map<
    string,
    { source: MediaStreamAudioSourceNode; gain: GainNode }
  >();
  private connectedMediaElements = new Set<HTMLMediaElement>();
  private mediaStreamSources = new Map<string, MediaStreamAudioSourceNode>();
  private mediaGainNode: GainNode | null = null;
  private mediaHighpassFilter: BiquadFilterNode | null = null;
  private mediaNotchFilter: BiquadFilterNode | null = null;
  private mediaFormantFilter: BiquadFilterNode | null = null;

  // Cached Background, Full-Frame Overlay, Chroma Backdrop & Logo Images
  private cachedBgUrl: string | null = null;
  private bgImage: HTMLImageElement | null = null;
  private cachedOverlayUrl: string | null = null;
  private overlayImage: HTMLImageElement | null = null;
  private cachedFullFrameOverlayUrl: string | null = null;
  private fullFrameOverlayImage: HTMLImageElement | null = null;
  private cachedChromaBgUrl: string | null = null;
  private chromaBgImage: HTMLImageElement | null = null;
  private cachedLogoImgUrl: string | null = null;
  private logoImageEl: HTMLImageElement | null = null;
  private cachedMediaPosterUrl: string | null = null;
  private mediaPosterImage: HTMLImageElement | null = null;
  private grainCanvas: HTMLCanvasElement | null = null;
  private grainFrameTick = 0;
  private vintageScratchTracks: Array<{
    xNorm: number;
    vx: number;
    tilt: number;
    lenNorm: number;
    yStartNorm: number;
    isDark: boolean;
    weight: number;
  }> = [
      { xNorm: 0.18, vx: 0.0005, tilt: 0.8, lenNorm: 0.92, yStartNorm: 0.02, isDark: false, weight: 1.0 },
      { xNorm: 0.44, vx: -0.0004, tilt: -0.6, lenNorm: 0.78, yStartNorm: 0.1, isDark: true, weight: 0.85 },
      { xNorm: 0.68, vx: 0.0006, tilt: 0.5, lenNorm: 0.88, yStartNorm: 0.05, isDark: false, weight: 0.95 },
      { xNorm: 0.83, vx: -0.0005, tilt: -0.7, lenNorm: 0.7, yStartNorm: 0.14, isDark: false, weight: 0.8 },
    ];

  // Background Web Worker Clock (prevents tab throttling to 1 FPS when switching to YouTube Studio tab)
  private workerTimer: Worker | null = null;
  private workerBlobUrl: string | null = null;

  // Strict Sequential FIFO Upload Queue (prevents out-of-order chunks)
  private chunkQueue: Blob[] = [];
  private isUploading = false;

  // Tracks for LiveKit WebRTC transmission
  private activeVideoTrack: MediaStreamTrack | null = null;
  private activeAudioTrack: MediaStreamTrack | null = null;
  private bgIntervalId: NodeJS.Timeout | null = null;

  public ensureAudioContext(): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch((e) => console.warn("[StageBroadcaster] AudioContext resume error:", e));
      }
    } catch (e) {
      console.warn("[StageBroadcaster] AudioContext init error:", e);
    }
  }

  public isStreaming(): boolean {
    return this.isBroadcasting;
  }

  public isRtmpStreaming(): boolean {
    return this.isStreamingRtmp;
  }

  public setLocalRecordingActive(active: boolean): void {
    this.isLocalRecordingActive = active;
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  public getCompositeStream(): MediaStream | null {
    if (!this.canvas) return null;
    const tracks: MediaStreamTrack[] = [];
    if (this.activeVideoTrack) tracks.push(this.activeVideoTrack);
    if (this.activeAudioTrack) tracks.push(this.activeAudioTrack);
    return tracks.length > 0 ? new MediaStream(tracks) : null;
  }

  public getCompositeAudioTrack(): MediaStreamTrack | null {
    return this.activeAudioTrack;
  }

  /**
   * Start 30 FPS Canvas render loop & Web Audio mix, returning live MediaStreamTracks for WebRTC
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
    this.lastAutoPauseTimestamp = performance.now();
    this.lastHostActiveTimestamp = performance.now();

    // 1. Setup Composite 720p HD Canvas (1280x720 @ 30fps)
    const WIDTH = 1280;
    const HEIGHT = 720;
    this.canvas = document.createElement("canvas");
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.style.position = "fixed";
    this.canvas.style.left = "-9999px";
    this.canvas.style.top = "-9999px";
    this.canvas.style.width = "1280px";
    this.canvas.style.height = "720px";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.opacity = "0";
    this.canvas.id = "livestudio-composite-render-canvas";
    if (typeof document !== "undefined" && document.body) {
      document.body.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext("2d", { alpha: false });

    if (!this.ctx) {
      console.error("[StageBroadcaster] Failed to get canvas 2d context");
      this.stopStageComposite();
      return null;
    }

    // 2. Setup Web Audio API Pipeline (Continuous stereo AAC for YouTube Live & Local Recording)
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

      // Continuous ultra-low carrier (-76dB) to prevent WebRTC/FFmpeg silence drop
      const sampleRate = this.audioCtx.sampleRate || 48000;
      const bufferSize = sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(2, bufferSize, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const channelData = noiseBuffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          channelData[i] = (Math.random() * 2 - 1) * 0.00015;
        }
      }
      const carrier = this.audioCtx.createBufferSource();
      carrier.buffer = noiseBuffer;
      carrier.loop = true;
      carrier.connect(this.audioDestination);

      try {
        const bgKeepAlive = this.audioCtx.createGain();
        bgKeepAlive.gain.value = 0.00001;
        carrier.connect(bgKeepAlive);
        bgKeepAlive.connect(this.audioCtx.destination);
      } catch { }

      carrier.start();
    } catch (audioErr) {
      console.warn("[StageBroadcaster] Web Audio initialization warning:", audioErr);
    }

    // 3. Connect active audio tracks
    this.refreshAudioConnections();

    // 4. Initial layout snapshot
    this.updateLayoutCache(container, WIDTH, HEIGHT);

    // 5. Start Resilient 30 FPS Canvas Render Loop
    this.lastTickerTime = performance.now();
    this.lastFrameTime = performance.now();
    let lastRafTime = performance.now();

    const doRenderFrame = (now: number) => {
      if (!this.isBroadcasting || !this.ctx || !this.canvas) return;

      const elapsed = now - this.lastFrameTime;
      if (elapsed >= this.FRAME_TOLERANCE) {
        this.lastFrameTime = now;

        if (now - this.lastLayoutCacheTime > 250) {
          this.updateLayoutCache(container, WIDTH, HEIGHT);
          this.refreshAudioConnections();
          this.enforceFairUseMediaPolicies(now);
          this.lastLayoutCacheTime = now;
        }

        this.renderStageFrame(container, WIDTH, HEIGHT, now);
      }
    };

    const render = (time: number) => {
      if (!this.isBroadcasting) return;
      lastRafTime = time;
      doRenderFrame(time);
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);

    this.startWorkerClock(() => {
      if (!this.isBroadcasting) return;
      const now = performance.now();
      if ((typeof document !== "undefined" && document.hidden) || now - lastRafTime > 60) {
        doRenderFrame(now);
      }
    });

    this.renderStageFrame(container, WIDTH, HEIGHT, performance.now());

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

  /**
   * Enforces YouTube Fair-Use & StreamYard Auto-Advance on active media elements
   * while keeping audio natural and distortion-free during recording & streaming.
   */
  private enforceFairUseMediaPolicies(now: number) {
    const store = useStudioStore.getState();
    const { fairUseConfig, activeMedia, participants } = store;

    const mediaVideo = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
    const mediaAudio = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
    const activeEl = mediaVideo || mediaAudio;
    if (
      !activeEl ||
      !activeMedia ||
      (activeMedia.type !== "video" && activeMedia.type !== "youtube" && activeMedia.type !== "audio")
    )
      return;

    // Enforce optional Start/End Time range during live broadcast
    if (
      mediaVideo &&
      activeMedia.endTimeSec &&
      activeMedia.endTimeSec > 0 &&
      mediaVideo.currentTime >= activeMedia.endTimeSec
    ) {
      if (activeMedia.loop !== false) {
        mediaVideo.currentTime = activeMedia.startTimeSec || 0;
        mediaVideo.play().catch(() => { });
      } else {
        mediaVideo.pause();
        store.triggerMediaEnded();
        return;
      }
    }

    // 1. Auto-Advance Scene when Media Ends
    if (!this.boundEndedElements.has(activeEl)) {
      this.boundEndedElements.add(activeEl);
      activeEl.addEventListener("ended", () => {
        useStudioStore.getState().triggerMediaEnded();
      });
    }

    if (!fairUseConfig || !fairUseConfig.enabled) {
      const normalRate = activeMedia.playbackRate || 1.0;
      if (Math.abs(activeEl.playbackRate - normalRate) > 0.01) {
        activeEl.playbackRate = normalRate;
      }
      try {
        (activeEl as any).preservesPitch = true;
        (activeEl as any).mozPreservesPitch = true;
        (activeEl as any).webkitPreservesPitch = true;
      } catch { }
      return;
    }

    // 2. Smooth Playback Speed + Pitch Unlinking (Gentle LFO so audio never warbles or distorts in recording)
    const baseRate = activeMedia.playbackRate || fairUseConfig.playbackRate || 1.04;
    const lfoOffset = (fairUseConfig.dynamicTempoVariance ?? true)
      ? Math.sin(now / 2400) * 0.012 + Math.cos(now / 3900) * 0.006
      : 0;
    const targetRate = Number(Math.max(0.5, Math.min(2.0, baseRate + lfoOffset)).toFixed(3));
    if (Math.abs(activeEl.playbackRate - targetRate) > 0.01) {
      activeEl.playbackRate = targetRate;
    }
    const isAudioFairUse = Boolean(fairUseConfig.enableAudioFairUse ?? fairUseConfig.audioEqProtection ?? true);
    try {
      (activeEl as any).preservesPitch = !isAudioFairUse;
      (activeEl as any).mozPreservesPitch = !isAudioFairUse;
      (activeEl as any).webkitPreservesPitch = !isAudioFairUse;
    } catch { }

    // 3. 8-12s Random Jerk / Frame-Skip / Pause (Anti-Content ID Continuous Match for Video & YouTube)
    if (
      mediaVideo &&
      (activeMedia.type === "video" || activeMedia.type === "youtube") &&
      fairUseConfig.autoPauseIntervalSec > 0
    ) {
      const targetIntervalMs =
        fairUseConfig.autoPauseIntervalSec === 8
          ? this.nextRandomIntervalMs
          : fairUseConfig.autoPauseIntervalSec * 1000;

      if (!mediaVideo.paused && now - this.lastAutoPauseTimestamp >= targetIntervalMs) {
        this.lastAutoPauseTimestamp = now;
        this.nextRandomIntervalMs = Math.floor(8000 + Math.random() * 4000);

        const mode = fairUseConfig.antiMatchMode || "jerk-skip";

        if (mode === "jerk-skip") {
          this.isAutoPausedByFairUse = true;
          mediaVideo.pause();
          setTimeout(() => {
            if (this.isAutoPausedByFairUse) {
              this.isAutoPausedByFairUse = false;
              if (
                Number.isFinite(mediaVideo.duration) &&
                mediaVideo.duration > 1 &&
                mediaVideo.currentTime + 0.35 < mediaVideo.duration
              ) {
                mediaVideo.currentTime += 0.22 + Math.random() * 0.1;
              }
              this.lastAutoPauseTimestamp = performance.now();
              mediaVideo.play().catch(() => { });
            }
          }, 150);
        } else {
          const pauseMs = mode === "micro-pause" ? 340 : 1600;
          this.isAutoPausedByFairUse = true;
          mediaVideo.pause();
          setTimeout(() => {
            if (this.isAutoPausedByFairUse && mediaVideo.paused) {
              this.isAutoPausedByFairUse = false;
              this.lastAutoPauseTimestamp = performance.now();
              mediaVideo.play().catch(() => { });
            }
          }, pauseMs);
        }
      }
    }

    // 4. Idle Media Guard
    const isAnySpeakerActive = participants.some(
      (p) => p.status === "ON_STAGE" && (p.camOn || p.micOn || p.isSpeaking)
    );
    if (isAnySpeakerActive) {
      this.lastHostActiveTimestamp = now;
    } else if (
      fairUseConfig.idleMediaGuardSec > 0 &&
      now - this.lastHostActiveTimestamp > fairUseConfig.idleMediaGuardSec * 1000
    ) {
      this.lastHostActiveTimestamp = now;
      store.triggerMediaEnded();
    }
  }

  public stopStageComposite(force: boolean = false) {
    if (!force && (this.isStreamingRtmp || this.isLocalRecordingActive)) {
      console.log("[StageBroadcaster] Keeping composite active because RTMP stream or local recorder is still running.");
      return;
    }
    this.isBroadcasting = false;
    this.activeVideoTrack = null;
    this.activeAudioTrack = null;

    if (this.canvas && this.canvas.parentNode) {
      try {
        this.canvas.parentNode.removeChild(this.canvas);
      } catch { }
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.stopWorkerClock();

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch { }
      this.audioCtx = null;
    }

    if (this.mediaGainNode) {
      try {
        this.mediaGainNode.disconnect();
      } catch { }
      this.mediaGainNode = null;
    }

    this.participantAudioNodes.forEach((entry) => {
      try {
        entry.source.disconnect();
        entry.gain.disconnect();
      } catch { }
    });
    this.participantAudioNodes.clear();
    this.mediaStreamSources.forEach((src) => {
      try {
        src.disconnect();
      } catch { }
    });
    this.mediaStreamSources.clear();
    this.connectedMediaElements.clear();
    this.mediaGainNode = null;
    this.mediaHighpassFilter = null;
    this.mediaNotchFilter = null;
    this.mediaFormantFilter = null;
    this.cachedLayouts = [];
    this.canvas = null;
    this.ctx = null;
    this.cachedBgUrl = null;
    this.bgImage = null;
    this.cachedOverlayUrl = null;
    this.overlayImage = null;
    console.log("[StageBroadcaster] Stage composite stopped and resources freed.");
  }

  private startWorkerClock(onTick: () => void) {
    this.stopWorkerClock();
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
        onTick();
      };
      this.workerTimer.postMessage("start");
    } catch (err) {
      if (this.bgIntervalId) clearInterval(this.bgIntervalId);
      this.bgIntervalId = setInterval(() => {
        onTick();
      }, 33);
    }
  }

  private stopWorkerClock() {
    if (this.workerTimer) {
      try {
        this.workerTimer.postMessage("stop");
        this.workerTimer.terminate();
      } catch { }
      this.workerTimer = null;
    }
    if (this.workerBlobUrl) {
      try {
        URL.revokeObjectURL(this.workerBlobUrl);
      } catch { }
      this.workerBlobUrl = null;
    }
    if (this.bgIntervalId) {
      clearInterval(this.bgIntervalId);
      this.bgIntervalId = null;
    }
  }

  /**
   * Start broadcasting the live stage
   */
  public async start(stageElement: HTMLElement | null, broadcastId: string): Promise<boolean> {
    if (this.isStreamingRtmp) {
      return true;
    }

    const container = stageElement || document.getElementById("livestudio-stage-container");
    if (!container) {
      console.error("[StageBroadcaster] Stage container element not found");
      return false;
    }

    if (!this.isBroadcasting || !this.canvas || !this.ctx) {
      const started = this.startStageComposite(container);
      if (!started || !this.canvas) {
        return false;
      }
    }

    this.activeBroadcastId = broadcastId;
    this.isStreamingRtmp = true;
    this.chunkQueue = [];
    this.isUploading = false;

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

      let mimeType = "video/webm;codecs=vp8,opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=h264,opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
        }
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2800000,
        audioBitsPerSecond: 128000,
      });

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0 && this.activeBroadcastId) {
          this.enqueueChunk(e.data);
        }
      };

      this.mediaRecorder.onerror = (recorderErr) => {
        console.error("[StageBroadcaster] MediaRecorder error:", recorderErr);
      };

      this.mediaRecorder.start(500);
      return true;
    } catch (streamErr) {
      console.error("[StageBroadcaster] Failed to start MediaRecorder stream:", streamErr);
      this.stop();
      return false;
    }
  }

  /**
   * Snapshot stage layout bounds outside the 30fps draw loop
   */
  private updateLayoutCache(container: HTMLElement, W: number, H: number) {
    try {
      const containerRect = container.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const scaleX = W / containerRect.width;
      const scaleY = H / containerRect.height;

      const stageTiles = container.querySelectorAll("[data-stage-tile]");
      const store = useStudioStore.getState();
      const isFullBleed =
        store.isStageCropped ||
        store.activeLayout === "cropped" ||
        store.activeLayout === "podcast" ||
        store.activeLayout === "interview" ||
        store.activeLayout === "cinema" ||
        store.activeLayout === "screen-full" ||
        store.activeLayout === "solo" ||
        (store.activeLayout === "custom" &&
          (store.customLayoutConfig?.mode === "solo" ||
            store.customLayoutConfig?.mode === "cinema" ||
            store.customLayoutConfig?.mode === "cropped" ||
            store.customLayoutConfig?.mode === "podcast"));

      const nextLayouts: CachedTileLayout[] = [];

      stageTiles.forEach((el) => {
        const tile = el as HTMLElement;
        const tileRect = tile.getBoundingClientRect();

        let x = (tileRect.left - containerRect.left) * scaleX;
        let y = (tileRect.top - containerRect.top) * scaleY;
        let w = tileRect.width * scaleX;
        let h = tileRect.height * scaleY;

        const isMediaTileCover =
          tile.hasAttribute("data-stage-media") &&
          (tile.getAttribute("data-participant-fit") === "cover" ||
            store.tileTransforms["active-media"]?.fitMode === "cover");

        if (isFullBleed || isMediaTileCover) {
          x = Math.round(x);
          y = Math.round(y);
          w = Math.ceil(w);
          h = Math.ceil(h);
          if (x < 35) {
            w += x;
            x = 0;
          }
          if (y < 35) {
            h += y;
            y = 0;
          }
          if (x + w > W - 35) {
            w = W - x;
          }
          if (y + h > H - 35) {
            h = H - y;
          }
        }

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
        const participantId = tile.getAttribute("data-participant-id") || "";
        const computedZ = typeof window !== "undefined" ? parseInt(window.getComputedStyle(tile).zIndex, 10) : 10;
        const zIndex = Number.isNaN(computedZ) ? 10 : computedZ;
        const fitMode =
          tile.getAttribute("data-participant-fit") ||
          tile.querySelector("[data-participant-fit]")?.getAttribute("data-participant-fit") ||
          (tile.querySelector("video") as HTMLVideoElement | null)?.style.objectFit ||
          "cover";
        const isTransparentCard =
          tile.getAttribute("data-transparent-card") === "true" ||
          (isMedia && Boolean(store.tileTransforms["active-media"]?.isTransparentBg));

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
          fitMode,
          isTransparentCard,
          participantId,
          zIndex,
        });
      });

      nextLayouts.sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10));
      this.cachedLayouts = nextLayouts;
    } catch (err) {
      console.warn("[StageBroadcaster] Layout snapshot warning:", err);
    }
  }

  /**
   * Connect participant and media audio streams into the broadcast/recording mix.
   * Ensures clean, transparent, distortion-free audio on both Record to PC and Live Stream.
   */
  public refreshAudioConnections() {
    if (!this.audioCtx || !this.audioDestination) return;

    try {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => { });
      }
      const store = useStudioStore.getState();
      const activeTrackIds = new Set<string>();

      let isAnyParticipantSpeaking = false;

      // 1. Participant Microphones with GainNode control
      store.participants.forEach((p) => {
        const mediaTrack =
          (p.audioTrack as any)?.mediaStreamTrack ||
          (p.audioTrack instanceof MediaStreamTrack ? p.audioTrack : null);

        const isHost = Boolean(p.isLocal || p.role === "host" || p.role === "HOST");
        const isAudible = (p.status === "ON_STAGE" || isHost) && p.micOn !== false;
        if (isAudible && p.isSpeaking) {
          isAnyParticipantSpeaking = true;
        }

        if (mediaTrack && mediaTrack.readyState === "live") {
          const trackId = mediaTrack.id || String(p.id);
          activeTrackIds.add(trackId);

          let nodeEntry = this.participantAudioNodes.get(trackId);
          if (!nodeEntry) {
            try {
              const srcStream = new MediaStream([mediaTrack]);
              const source = this.audioCtx!.createMediaStreamSource(srcStream);
              const gain = this.audioCtx!.createGain();
              gain.gain.value = isAudible ? 1 : 0;
              source.connect(gain);
              gain.connect(this.audioDestination!);
              this.participantAudioNodes.set(trackId, { source, gain });
            } catch (err) {
              console.warn(`[StageBroadcaster] Audio connect error for ${p.name}:`, err);
            }
          } else {
            nodeEntry.gain.gain.value = isAudible ? 1 : 0;
          }
        }
      });

      this.participantAudioNodes.forEach((entry, trackId) => {
        if (!activeTrackIds.has(trackId)) {
          try {
            entry.source.disconnect();
            entry.gain.disconnect();
          } catch { }
          this.participantAudioNodes.delete(trackId);
        }
      });

      // 2. Active Stage Media Video / Audio Element (Direct Web Audio routing for 100% reliable recording & broadcast)
      const mediaVideo = document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null;
      const mediaAudio = document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null;
      const activeMediaEls = [mediaVideo, mediaAudio].filter((el): el is HTMLMediaElement => Boolean(el));

      if (activeMediaEls.length > 0 && this.audioCtx && this.audioDestination) {
        if (!this.mediaGainNode) {
          try {
            this.mediaHighpassFilter = this.audioCtx.createBiquadFilter();
            this.mediaHighpassFilter.type = "highpass";
            this.mediaHighpassFilter.frequency.value = 55;

            this.mediaNotchFilter = this.audioCtx.createBiquadFilter();
            this.mediaNotchFilter.type = "peaking";
            this.mediaNotchFilter.frequency.value = 1650;
            this.mediaNotchFilter.Q.value = 2.8;
            this.mediaNotchFilter.gain.value = 0;

            this.mediaFormantFilter = this.audioCtx.createBiquadFilter();
            this.mediaFormantFilter.type = "peaking";
            this.mediaFormantFilter.frequency.value = 2350;
            this.mediaFormantFilter.Q.value = 1.2;
            this.mediaFormantFilter.gain.value = 0;

            this.mediaGainNode = this.audioCtx.createGain();
            this.mediaHighpassFilter.connect(this.mediaNotchFilter);
            this.mediaNotchFilter.connect(this.mediaFormantFilter);
            this.mediaFormantFilter.connect(this.mediaGainNode);
            this.mediaGainNode.connect(this.audioDestination);
          } catch (gainErr) {
            console.warn("[StageBroadcaster] Failed to create media audio DSP chain:", gainErr);
          }
        }

        if (this.mediaFormantFilter && this.mediaHighpassFilter && this.mediaNotchFilter) {
          const eqActive = Boolean(store.fairUseConfig?.enabled && (store.fairUseConfig?.audioEqProtection ?? true));
          this.mediaHighpassFilter.frequency.value = eqActive ? 75 : 20;
          const sweepHz = 1100 + ((1 + Math.sin(performance.now() / 1900)) / 2) * 1200;
          this.mediaNotchFilter.frequency.setTargetAtTime(sweepHz, this.audioCtx.currentTime, 0.15);
          // Gentle -2.8 dB notch & +2.2 dB formant shift alters audio fingerprint without any muffled or metallic distortion
          this.mediaNotchFilter.gain.value = eqActive ? -2.8 : 0;
          this.mediaFormantFilter.gain.value = eqActive ? 2.2 : 0;
        }

        const isMediaMuted = Boolean(store.activeMedia?.isMuted || activeMediaEls.every((el) => el.muted));
        const rawVol = store.activeMedia?.volume;
        const normalizedVolPct =
          typeof rawVol === "number" && !Number.isNaN(rawVol)
            ? rawVol > 0 && rawVol <= 1 && !Number.isInteger(rawVol)
              ? rawVol * 100
              : Math.max(0, Math.min(200, rawVol))
            : 100;
        const baseVol = normalizedVolPct / 100;
        const shouldDuck =
          store.fairUseConfig?.enabled &&
          store.fairUseConfig?.autoAudioDucking &&
          isAnyParticipantSpeaking;
        const duckVol = (store.fairUseConfig?.duckingVolumePct ?? 25) / 100;
        const finalGain = isMediaMuted ? 0 : shouldDuck ? Math.min(baseVol, duckVol) : baseVol;

        if (this.mediaGainNode) {
          this.mediaGainNode.gain.setTargetAtTime(finalGain, this.audioCtx.currentTime, 0.1);
        }

        // Clean up unmounted media elements from the connected set
        this.connectedMediaElements.forEach((el) => {
          if (typeof document !== "undefined" && !document.body.contains(el)) {
            this.connectedMediaElements.delete(el);
          }
        });

        const entryNode = this.mediaHighpassFilter || this.mediaGainNode;

        for (const el of activeMediaEls) {
          if (el.muted !== isMediaMuted) {
            el.muted = isMediaMuted;
          }

          if (!this.connectedMediaElements.has(el)) {
            try {
              const src = this.audioCtx.createMediaElementSource(el);
              if (entryNode) {
                src.connect(entryNode);
              } else {
                src.connect(this.audioDestination);
              }
              // Connect to local speakers so host hears audio without echo
              src.connect(this.audioCtx.destination);
              this.connectedMediaElements.add(el);
            } catch (err) {
              console.warn("[StageBroadcaster] Media element audio connect warning:", err);
            }
          }
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
    if (!this.ctx) return;
    const ctx = this.ctx;
    const store = useStudioStore.getState();

    try {
      // 1. Draw Background Layer
      const bgVideo = container.querySelector("video.object-cover") as HTMLVideoElement | null;
      let drewVideoBackground = false;
      if (bgVideo && bgVideo.readyState >= 2) {
        try {
          ctx.drawImage(bgVideo, 0, 0, W, H);
          drewVideoBackground = true;
        } catch { }
      }
      if (!drewVideoBackground && store.activeBackgroundUrl && !store.activeBackgroundUrl.endsWith(".mp4")) {
        if (this.cachedBgUrl !== store.activeBackgroundUrl) {
          this.cachedBgUrl = store.activeBackgroundUrl;
          this.bgImage = new Image();
          this.bgImage.crossOrigin = "anonymous";
          this.bgImage.src = store.activeBackgroundUrl;
        }
        if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
          try {
            ctx.drawImage(this.bgImage, 0, 0, W, H);
          } catch {
            ctx.fillStyle = "#07070d";
            ctx.fillRect(0, 0, W, H);
          }
        } else {
          ctx.fillStyle = "#07070d";
          ctx.fillRect(0, 0, W, H);
        }
      } else if (!drewVideoBackground) {
        ctx.fillStyle = "#07070d";
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Draw All Stage Tiles from Cached Layouts
      for (let i = 0; i < this.cachedLayouts.length; i++) {
        const tile = this.cachedLayouts[i];
        const { element: el, x, y, w, h, isMedia } = tile;

        ctx.save();
        const currentStore = useStudioStore.getState();
        const isFullBleed =
          currentStore.isStageCropped ||
          currentStore.activeLayout === "cropped" ||
          currentStore.activeLayout === "podcast" ||
          currentStore.activeLayout === "interview" ||
          currentStore.activeLayout === "cinema" ||
          currentStore.activeLayout === "screen-full" ||
          currentStore.activeLayout === "solo" ||
          (currentStore.activeLayout === "custom" &&
            (currentStore.customLayoutConfig?.mode === "solo" ||
              currentStore.customLayoutConfig?.mode === "cinema" ||
              currentStore.customLayoutConfig?.mode === "cropped" ||
              currentStore.customLayoutConfig?.mode === "podcast"));

        const isFloatingPipTile = (tile.zIndex || 10) >= 25 && w < W * 0.5 && h < H * 0.5;
        const isMediaFullCover = isMedia && (tile.fitMode === "cover" || currentStore.tileTransforms["active-media"]?.fitMode === "cover") && !isFloatingPipTile;

        if (((!isFullBleed && !isMediaFullCover) || isFloatingPipTile) && !tile.isTransparentCard) {
          const radius =
            currentStore.activeLayout === "custom" &&
              currentStore.customLayoutConfig?.borderRadius !== undefined
              ? currentStore.customLayoutConfig.borderRadius
              : 14;
          if (radius > 0) {
            this.drawRoundedRect(ctx, x, y, w, h, radius);
            ctx.clip();
          }
        }

        const isChromaStageTransparent =
          !isMedia &&
          !tile.isScreen &&
          currentStore.chromaKeyConfig?.enabled &&
          currentStore.chromaKeyConfig?.backdropType === "stage";

        if (!tile.isTransparentCard && !isChromaStageTransparent) {
          ctx.fillStyle = "#0a0a14";
          ctx.fillRect(x, y, w, h);
        }

        if (isMedia) {
          const mediaMapCanvas = el.querySelector("#livestudio-tactical-map-canvas") as HTMLCanvasElement | null;
          const mediaVideo = el.querySelector("video") as HTMLVideoElement | null;
          const mediaImg = el.querySelector("img") as HTMLImageElement | null;

          const defaultMediaFit = currentStore.isStageCropped ? "cover" : "contain";
          const mediaTf = currentStore.tileTransforms["active-media"] || { fitMode: defaultMediaFit, zoom: 1, panX: 0, panY: 0, rotation: 0 };
          const isCover = (tile.fitMode === "cover" || mediaTf.fitMode === "cover");
          const bIntensity = currentStore.fairUseConfig?.breathIntensity || "medium";
          const maxBreathDelta = bIntensity === "subtle" ? 0.06 : bIntensity === "strong" ? 0.18 : 0.11;
          const breathFactor =
            currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.zoomBreathing ?? true)
              ? 1 + maxBreathDelta * ((1 + Math.sin(timestamp / 520)) / 2)
              : 1;
          const zoom = Math.max(1, (mediaTf.zoom || 1) * breathFactor);
          const panX = Math.max(-50, Math.min(50, mediaTf.panX || 0));
          const panY = Math.max(-50, Math.min(50, mediaTf.panY || 0));

          if (mediaMapCanvas && mediaMapCanvas.width > 0 && mediaMapCanvas.height > 0) {
            const mRatio = mediaMapCanvas.width / mediaMapCanvas.height;
            const tRatio = w / h;
            const objectPosX = Math.max(0, Math.min(100, 50 + panX));
            const objectPosY = Math.max(0, Math.min(100, 50 + panY));
            ctx.save();
            if (currentStore.fairUseConfig?.enabled && currentStore.fairUseConfig?.mirrorMediaVideo) {
              const cx = x + w / 2;
              ctx.translate(cx, 0);
              ctx.scale(-1, 1);
              ctx.translate(-cx, 0);
            }
            if (isCover) {
              let sw = mediaMapCanvas.width;
              let sh = mediaMapCanvas.height;
              if (mRatio > tRatio) {
                sw = mediaMapCanvas.height * tRatio;
              } else {
                sh = mediaMapCanvas.width / tRatio;
              }
              sw = sw / zoom;
              sh = sh / zoom;
              const sx = Math.max(0, Math.min(mediaMapCanvas.width - sw, (mediaMapCanvas.width - sw) * (objectPosX / 100)));
              const sy = Math.max(0, Math.min(mediaMapCanvas.height - sh, (mediaMapCanvas.height - sh) * (objectPosY / 100)));
              try {
                ctx.drawImage(mediaMapCanvas, sx, sy, sw, sh, x, y, w, h);
              } catch { }
            } else {
              let dw = w, dh = h, dx = x, dy = y;
              if (mRatio > tRatio) {
                dh = w / mRatio;
                dy = y + (h - dh) / 2;
              } else {
                dw = h * mRatio;
                dx = x + (w - dw) / 2;
              }
              try {
                ctx.drawImage(mediaMapCanvas, 0, 0, mediaMapCanvas.width, mediaMapCanvas.height, dx, dy, dw, dh);
              } catch { }
            }
            ctx.restore();
          } else if (mediaVideo && mediaVideo.readyState >= 2 && mediaVideo.videoWidth > 0) {
            ctx.save();
            if (currentStore.fairUseConfig?.enabled) {
              if (currentStore.fairUseConfig?.visualTransformFilter) {
                ctx.filter = "contrast(1.05) saturate(1.06)";
              }
              if (currentStore.fairUseConfig.mirrorMediaVideo) {
                const cx = x + w / 2;
                ctx.translate(cx, 0);
                ctx.scale(-1, 1);
                ctx.translate(-cx, 0);
              }
            }

            const vRatio = mediaVideo.videoWidth / mediaVideo.videoHeight;
            const tRatio = w / h;
            let objectPosX = Math.max(0, Math.min(100, 50 + panX));
            let objectPosY = Math.max(0, Math.min(100, 50 + panY));
            if (mediaVideo.style.objectPosition) {
              const parts = mediaVideo.style.objectPosition.split(" ");
              if (parts.length >= 2) {
                const px = parseFloat(parts[0]);
                const py = parseFloat(parts[1]);
                if (!isNaN(px)) objectPosX = px;
                if (!isNaN(py)) objectPosY = py;
              }
            }

            if (isCover) {
              let sw = mediaVideo.videoWidth;
              let sh = mediaVideo.videoHeight;
              if (vRatio > tRatio) {
                sw = mediaVideo.videoHeight * tRatio;
              } else {
                sh = mediaVideo.videoWidth / tRatio;
              }
              sw = sw / zoom;
              sh = sh / zoom;
              let sx = (mediaVideo.videoWidth - sw) * (objectPosX / 100);
              let sy = (mediaVideo.videoHeight - sh) * (objectPosY / 100);
              sx = Math.max(0, Math.min(mediaVideo.videoWidth - sw, sx));
              sy = Math.max(0, Math.min(mediaVideo.videoHeight - sh, sy));
              try {
                ctx.drawImage(mediaVideo, sx, sy, sw, sh, x, y, w, h);
              } catch { }
            } else {
              let dw = w, dh = h, dx = x, dy = y;
              if (vRatio > tRatio) {
                dh = w / vRatio;
                dy = y + (h - dh) / 2;
              } else {
                dw = h * vRatio;
                dx = x + (w - dw) / 2;
              }
              if (zoom > 1 || Math.abs(panX) > 0.5 || Math.abs(panY) > 0.5) {
                let sw = mediaVideo.videoWidth / zoom;
                let sh = mediaVideo.videoHeight / zoom;
                let sx = (mediaVideo.videoWidth - sw) * (objectPosX / 100);
                let sy = (mediaVideo.videoHeight - sh) * (objectPosY / 100);
                sx = Math.max(0, Math.min(mediaVideo.videoWidth - sw, sx));
                sy = Math.max(0, Math.min(mediaVideo.videoHeight - sh, sy));
                const shiftDx = zoom <= 1 ? (-panX / 100) * w * 0.45 : 0;
                const shiftDy = zoom <= 1 ? (-panY / 100) * h * 0.45 : 0;
                try {
                  ctx.drawImage(mediaVideo, sx, sy, sw, sh, dx + shiftDx, dy + shiftDy, dw, dh);
                } catch { }
              } else {
                try {
                  ctx.drawImage(mediaVideo, dx, dy, dw, dh);
                } catch { }
              }
            }
            ctx.restore();

            if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.filmGrainOverlay ?? true)) {
              this.drawFilmGrainOverlay(
                ctx,
                x,
                y,
                w,
                h,
                currentStore.fairUseConfig?.grainIntensity || "random"
              );
            }

            if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.vintageLinesOverlay ?? true)) {
              this.drawVintageFilmLinesOverlay(
                ctx,
                x,
                y,
                w,
                h,
                currentStore.fairUseConfig?.vintageLinesIntensity || "medium"
              );
            }

            if (currentStore.fairUseConfig?.enabled && currentStore.fairUseConfig?.showFairUseBadge) {
              const badgeTxt = currentStore.fairUseConfig.badgeText || "LIVE COMMENTARY & REVIEW • FAIR USE";
              ctx.save();
              ctx.font = "bold 11px Inter, system-ui, sans-serif";
              const bw = ctx.measureText(badgeTxt).width + 24;
              ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
              this.drawRoundedRect(ctx, x + 12, y + h - 34, bw, 22, 6);
              ctx.fill();
              ctx.fillStyle = "#38bdf8";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(badgeTxt, x + 24, y + h - 23);
              ctx.restore();
            }
          } else if (mediaImg && mediaImg.complete && mediaImg.naturalWidth > 0) {
            const iRatio = mediaImg.naturalWidth / mediaImg.naturalHeight;
            const tRatio = w / h;
            let objectPosX = Math.max(0, Math.min(100, 50 + panX));
            let objectPosY = Math.max(0, Math.min(100, 50 + panY));
            if (mediaImg.style.objectPosition) {
              const parts = mediaImg.style.objectPosition.split(" ");
              if (parts.length >= 2) {
                const px = parseFloat(parts[0]);
                const py = parseFloat(parts[1]);
                if (!isNaN(px)) objectPosX = px;
                if (!isNaN(py)) objectPosY = py;
              }
            }

            if (isCover) {
              let sw = mediaImg.naturalWidth;
              let sh = mediaImg.naturalHeight;
              if (iRatio > tRatio) {
                sw = mediaImg.naturalHeight * tRatio;
              } else {
                sh = mediaImg.naturalWidth / tRatio;
              }
              sw = sw / zoom;
              sh = sh / zoom;
              let sx = (mediaImg.naturalWidth - sw) * (objectPosX / 100);
              let sy = (mediaImg.naturalHeight - sh) * (objectPosY / 100);
              sx = Math.max(0, Math.min(mediaImg.naturalWidth - sw, sx));
              sy = Math.max(0, Math.min(mediaImg.naturalHeight - sh, sy));
              try {
                ctx.drawImage(mediaImg, sx, sy, sw, sh, x, y, w, h);
              } catch { }
            } else {
              let dw = w, dh = h, dx = x, dy = y;
              if (iRatio > tRatio) {
                dh = w / iRatio;
                dy = y + (h - dh) / 2;
              } else {
                dw = h * iRatio;
                dx = x + (w - dw) / 2;
              }
              if (zoom > 1) {
                let sw = mediaImg.naturalWidth / zoom;
                let sh = mediaImg.naturalHeight / zoom;
                let sx = (mediaImg.naturalWidth - sw) * (objectPosX / 100);
                let sy = (mediaImg.naturalHeight - sh) * (objectPosY / 100);
                sx = Math.max(0, Math.min(mediaImg.naturalWidth - sw, sx));
                sy = Math.max(0, Math.min(mediaImg.naturalHeight - sh, sy));
                try {
                  ctx.drawImage(mediaImg, sx, sy, sw, sh, dx, dy, dw, dh);
                } catch { }
              } else {
                try {
                  ctx.drawImage(mediaImg, dx, dy, dw, dh);
                } catch { }
              }
            }

            if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.filmGrainOverlay ?? true)) {
              this.drawFilmGrainOverlay(
                ctx,
                x,
                y,
                w,
                h,
                currentStore.fairUseConfig?.grainIntensity || "random"
              );
            }

            if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.vintageLinesOverlay ?? true)) {
              this.drawVintageFilmLinesOverlay(
                ctx,
                x,
                y,
                w,
                h,
                currentStore.fairUseConfig?.vintageLinesIntensity || "medium"
              );
            }
          } else if (currentStore.activeMedia) {
            const activeM = currentStore.activeMedia;
            const posterCandidate =
              activeM.thumbnail ||
              (activeM.youtubeId ? `https://i.ytimg.com/vi/${activeM.youtubeId}/hqdefault.jpg` : null);

            if (posterCandidate) {
              if (this.cachedMediaPosterUrl !== posterCandidate) {
                this.cachedMediaPosterUrl = posterCandidate;
                this.mediaPosterImage = new Image();
                this.mediaPosterImage.crossOrigin = "anonymous";
                this.mediaPosterImage.src = posterCandidate;
              }
              if (
                this.mediaPosterImage &&
                this.mediaPosterImage.complete &&
                this.mediaPosterImage.naturalWidth > 0
              ) {
                const pImg = this.mediaPosterImage;
                const iRatio = pImg.naturalWidth / pImg.naturalHeight;
                const tRatio = w / h;
                const objectPosX = Math.max(0, Math.min(100, 50 + panX));
                const objectPosY = Math.max(0, Math.min(100, 50 + panY));

                ctx.save();
                if (currentStore.fairUseConfig?.enabled) {
                  if (currentStore.fairUseConfig?.visualTransformFilter) {
                    ctx.filter = "contrast(1.05) saturate(1.06)";
                  }
                  if (currentStore.fairUseConfig.mirrorMediaVideo) {
                    const cx = x + w / 2;
                    ctx.translate(cx, 0);
                    ctx.scale(-1, 1);
                    ctx.translate(-cx, 0);
                  }
                }

                if (isCover) {
                  let sw = pImg.naturalWidth;
                  let sh = pImg.naturalHeight;
                  if (iRatio > tRatio) {
                    sw = pImg.naturalHeight * tRatio;
                  } else {
                    sh = pImg.naturalWidth / tRatio;
                  }
                  sw = sw / zoom;
                  sh = sh / zoom;
                  const sx = Math.max(0, Math.min(pImg.naturalWidth - sw, (pImg.naturalWidth - sw) * (objectPosX / 100)));
                  const sy = Math.max(0, Math.min(pImg.naturalHeight - sh, (pImg.naturalHeight - sh) * (objectPosY / 100)));
                  try {
                    ctx.drawImage(pImg, sx, sy, sw, sh, x, y, w, h);
                  } catch { }
                } else {
                  let dw = w, dh = h, dx = x, dy = y;
                  if (iRatio > tRatio) {
                    dh = w / iRatio;
                    dy = y + (h - dh) / 2;
                  } else {
                    dw = h * iRatio;
                    dx = x + (w - dw) / 2;
                  }
                  try {
                    ctx.drawImage(pImg, 0, 0, pImg.naturalWidth, pImg.naturalHeight, dx, dy, dw, dh);
                  } catch { }
                }
                ctx.restore();

                if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.filmGrainOverlay ?? true)) {
                  this.drawFilmGrainOverlay(
                    ctx,
                    x,
                    y,
                    w,
                    h,
                    currentStore.fairUseConfig?.grainIntensity || "random"
                  );
                }
                if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.vintageLinesOverlay ?? true)) {
                  this.drawVintageFilmLinesOverlay(
                    ctx,
                    x,
                    y,
                    w,
                    h,
                    currentStore.fairUseConfig?.vintageLinesIntensity || "medium"
                  );
                }

                if (currentStore.fairUseConfig?.enabled && currentStore.fairUseConfig?.showFairUseBadge) {
                  const badgeTxt = currentStore.fairUseConfig.badgeText || "LIVE COMMENTARY & REVIEW • FAIR USE";
                  ctx.save();
                  ctx.font = "bold 11px Inter, system-ui, sans-serif";
                  const bw = ctx.measureText(badgeTxt).width + 24;
                  ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
                  this.drawRoundedRect(ctx, x + 12, y + h - 34, bw, 22, 6);
                  ctx.fill();
                  ctx.fillStyle = "#38bdf8";
                  ctx.textAlign = "left";
                  ctx.textBaseline = "middle";
                  ctx.fillText(badgeTxt, x + 24, y + h - 23);
                  ctx.restore();
                }
              }
            } else if (activeM.type === "website") {
              ctx.save();
              const grad = ctx.createLinearGradient(x, y, x + w, y + h);
              grad.addColorStop(0, "#0b1120");
              grad.addColorStop(1, "#1e1b4b");
              ctx.fillStyle = grad;
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = "#38bdf8";
              ctx.font = "bold 18px Inter, system-ui, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(activeM.name || "LIVE WEBSITE", x + w / 2, y + h / 2 - 10);
              ctx.fillStyle = "#94a3b8";
              ctx.font = "13px monospace";
              ctx.fillText(activeM.websiteConfig?.url || activeM.url || "", x + w / 2, y + h / 2 + 18);
              ctx.restore();
            }
          }

          const webPtr = typeof window !== "undefined" ? (window as any).__livestudioWebPointer : null;
          if (webPtr && webPtr.visible) {
            const px = x + (Math.max(0, Math.min(100, webPtr.xPct || 50)) / 100) * w;
            const py = y + (Math.max(0, Math.min(100, webPtr.yPct || 50)) / 100) * h;
            const pColor = webPtr.color || "#ef4444";
            ctx.save();
            if (webPtr.style === "spotlight") {
              ctx.strokeStyle = pColor;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(px, py, 48, 0, Math.PI * 2);
              ctx.stroke();
            } else if (webPtr.style === "crosshair") {
              ctx.strokeStyle = pColor;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(px, py, 20, 0, Math.PI * 2);
              ctx.moveTo(px - 26, py);
              ctx.lineTo(px + 26, py);
              ctx.moveTo(px, py - 26);
              ctx.lineTo(px, py + 26);
              ctx.stroke();
            } else {
              const pulseR = webPtr.isClicking ? 24 : 14 + Math.sin(timestamp / 90) * 4;
              ctx.fillStyle = `${pColor}55`;
              ctx.beginPath();
              ctx.arc(px, py, pulseR, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = pColor;
              ctx.beginPath();
              ctx.arc(px, py, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.restore();
          }

          if (currentStore.isMediaTransitioning && !currentStore.isSceneTransitioning) {
            ctx.save();
            ctx.fillStyle = "rgba(7, 7, 13, 0.28)";
            ctx.fillRect(x, y, w, h);
            ctx.restore();
          }
        } else {
          // Participant Tile
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
            if (
              store.chromaKeyConfig?.enabled &&
              store.chromaKeyConfig?.backdropType === "image"
            ) {
              const cBgUrl =
                store.chromaKeyConfig.backdropUrl ||
                "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80";
              if (this.cachedChromaBgUrl !== cBgUrl) {
                this.cachedChromaBgUrl = cBgUrl;
                this.chromaBgImage = new Image();
                this.chromaBgImage.crossOrigin = "anonymous";
                this.chromaBgImage.src = cBgUrl;
              }
              if (this.chromaBgImage && this.chromaBgImage.complete && this.chromaBgImage.naturalWidth > 0) {
                try {
                  ctx.drawImage(this.chromaBgImage, x, y, w, h);
                } catch { }
              }
            }
            try {
              ctx.drawImage(canvas, x, y, w, h);
            } catch { }
          } else if (hasVideo && video) {
            const vRatio = video.videoWidth / video.videoHeight;
            const tRatio = w / h;
            const isContain =
              tile.fitMode === "contain" ||
              tile.isScreen ||
              (video.videoHeight > video.videoWidth * 1.05 && tile.fitMode !== "cover");

            const pTransform =
              (tile.participantId ? store.tileTransforms[tile.participantId] : null) ||
              (tile.isLocal ? store.tileTransforms["local-host"] : null);
            const zoom = Math.max(1, pTransform?.zoom || 1);
            const panX = pTransform?.panX || 0;
            const panY = pTransform?.panY || 0;
            const flipH = pTransform?.flipH !== undefined ? pTransform.flipH : (tile.isLocal && !tile.isScreen);
            const flipV = pTransform?.flipV || false;

            if (isContain) {
              let dw = w, dh = h, dx = x, dy = y;
              if (vRatio > tRatio) {
                dh = w / vRatio;
                dy = y + (h - dh) / 2;
              } else {
                dw = h * vRatio;
                dx = x + (w - dw) / 2;
              }

              let sw = video.videoWidth / zoom;
              let sh = video.videoHeight / zoom;
              let sx = (video.videoWidth - sw) * (Math.max(0, Math.min(100, 50 + panX)) / 100);
              let sy = (video.videoHeight - sh) * (Math.max(0, Math.min(100, 50 + panY)) / 100);
              sx = Math.max(0, Math.min(video.videoWidth - sw, sx));
              sy = Math.max(0, Math.min(video.videoHeight - sh, sy));

              try {
                ctx.save();
                if (flipH || flipV) {
                  ctx.translate(dx + (flipH ? dw : 0), dy + (flipV ? dh : 0));
                  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
                } else {
                  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
                }
                ctx.restore();
              } catch { }
            } else {
              let sw = video.videoWidth;
              let sh = video.videoHeight;
              if (vRatio > tRatio) {
                sw = video.videoHeight * tRatio;
              } else {
                sh = video.videoWidth / tRatio;
              }
              sw = sw / zoom;
              sh = sh / zoom;
              let sx = (video.videoWidth - sw) * (Math.max(0, Math.min(100, 50 + panX)) / 100);
              let sy = (video.videoHeight - sh) * (Math.max(0, Math.min(100, 50 + panY)) / 100);
              sx = Math.max(0, Math.min(video.videoWidth - sw, sx));
              sy = Math.max(0, Math.min(video.videoHeight - sh, sy));

              try {
                ctx.save();
                if (flipH || flipV) {
                  ctx.translate(x + (flipH ? w : 0), y + (flipV ? h : 0));
                  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
                } else {
                  ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
                }
                ctx.restore();
              } catch { }
            }
          } else {
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
            const fontSize = tile.initials.length > 1 ? Math.round(radius * 0.78) : Math.round(radius * 1.05);
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
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

          const cleanName = (tile.name || "Guest").replace(/\s*\(You\)\s*/gi, "").trim();
          const displayName = cleanName || "Guest";
          ctx.font = "bold 11px Inter, system-ui, sans-serif";
          const pillW = Math.min(180, displayName.length * 7 + 36);
          const pillH = 24;
          const pillX = x + 12;
          const pillY = y + h - pillH - 12;

          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          this.drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
          ctx.fill();
          ctx.strokeStyle = `${store.activeThemeColor || "#6366f1"}50`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = store.activeThemeColor || "#6366f1";
          ctx.beginPath();
          ctx.arc(pillX + 9, pillY + pillH / 2, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(displayName.slice(0, 20), pillX + 16, pillY + pillH / 2);

          const micDotX = pillX + pillW - 9;
          ctx.beginPath();
          ctx.arc(micDotX, pillY + pillH / 2, 3, 0, Math.PI * 2);
          ctx.fillStyle = tile.micOn ? "#10b981" : "#f43f5e";
          ctx.fill();
        }

        ctx.restore();
      }

      // 2.5. Interactive Stage Overlay
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
            try {
              ctx.drawImage(vidEl, ox, oy, ow, oh);
            } catch { }
          } else if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
            try {
              ctx.drawImage(imgEl, ox, oy, ow, oh);
            } catch { }
          } else {
            if (this.cachedOverlayUrl !== overlay.url) {
              this.cachedOverlayUrl = overlay.url;
              this.overlayImage = new Image();
              this.overlayImage.crossOrigin = "anonymous";
              this.overlayImage.src = overlay.url;
            }
            if (this.overlayImage && this.overlayImage.complete && this.overlayImage.naturalWidth > 0) {
              try {
                ctx.drawImage(this.overlayImage, ox, oy, ow, oh);
              } catch { }
            }
          }

          ctx.restore();
        }
      }

      // 2.8 Interactive Telestrator & Live On-Screen Drawing Layer
      if (store.isDrawingVisible !== false) {
        const drawCanvas = container.querySelector("#livestudio-draw-canvas") as HTMLCanvasElement | null;
        if (drawCanvas && drawCanvas.width > 0 && drawCanvas.height > 0) {
          try {
            ctx.drawImage(drawCanvas, 0, 0, W, H);
          } catch { }
        }
      }

      // 2.6. Full-Frame 16:9 Transparent PNG Frame Overlay
      if (store.activeOverlayUrl) {
        if (this.cachedFullFrameOverlayUrl !== store.activeOverlayUrl) {
          this.cachedFullFrameOverlayUrl = store.activeOverlayUrl;
          this.fullFrameOverlayImage = new Image();
          this.fullFrameOverlayImage.crossOrigin = "anonymous";
          this.fullFrameOverlayImage.src = store.activeOverlayUrl;
        }
        if (
          this.fullFrameOverlayImage &&
          this.fullFrameOverlayImage.complete &&
          this.fullFrameOverlayImage.naturalWidth > 0
        ) {
          try {
            ctx.drawImage(this.fullFrameOverlayImage, 0, 0, W, H);
          } catch { }
        }
      }

      // 3. Lower-Third Banner
      if (store.activeBanner && store.activeBanner.isShowing && store.activeBanner.title) {
        const banner = store.activeBanner;
        const bStyle = banner.style || "default";
        const accent = banner.themeColor || store.activeThemeColor || "#6366f1";
        ctx.save();
        const bX = 36;
        const bY = store.showTicker ? H - 122 : H - 96;
        ctx.font = "bold 17px Inter, system-ui, sans-serif";
        const titleW = ctx.measureText(banner.title).width;
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        const subW = banner.subtitle ? ctx.measureText(banner.subtitle).width : 0;
        const bW = Math.max(280, Math.min(620, Math.max(titleW, subW) + 56));
        const bH = banner.subtitle ? 64 : 46;

        if (bStyle === "minimal") {
          ctx.fillStyle = "rgba(8, 8, 14, 0.78)";
          ctx.fillRect(bX, bY, bW, bH);
          ctx.fillStyle = accent;
          ctx.fillRect(bX, bY, 5, bH);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 17px Inter, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(banner.title, bX + 18, bY + 26);
          if (banner.subtitle) {
            ctx.fillStyle = accent;
            ctx.font = "bold 11px Inter, system-ui, sans-serif";
            ctx.fillText(banner.subtitle.toUpperCase(), bX + 18, bY + 48);
          }
        } else if (bStyle === "block") {
          const topH = 36;
          ctx.fillStyle = accent;
          this.drawRoundedRect(ctx, bX, bY, bW, topH, 6);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(banner.title.toUpperCase(), bX + 18, bY + topH / 2 + 1);
          if (banner.subtitle) {
            ctx.fillStyle = "rgba(10, 12, 22, 0.95)";
            this.drawRoundedRect(ctx, bX, bY + topH, bW, 28, 6);
            ctx.fill();
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "600 12px Inter, system-ui, sans-serif";
            ctx.fillText(banner.subtitle, bX + 18, bY + topH + 15);
          }
        } else if (bStyle === "bubble") {
          ctx.fillStyle = "rgba(9, 10, 20, 0.92)";
          this.drawRoundedRect(ctx, bX, bY, bW, bH, bH / 2);
          ctx.fill();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2.5;
          this.drawRoundedRect(ctx, bX, bY, bW, bH, bH / 2);
          ctx.stroke();

          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(bX + 24, bY + bH / 2, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(banner.title, bX + 40, bY + (banner.subtitle ? 27 : 29));
          if (banner.subtitle) {
            ctx.fillStyle = accent;
            ctx.font = "600 12px Inter, system-ui, sans-serif";
            ctx.fillText(banner.subtitle, bX + 40, bY + 47);
          }
        } else {
          ctx.fillStyle = "rgba(10, 10, 18, 0.92)";
          this.drawRoundedRect(ctx, bX, bY, bW, bH, 12);
          ctx.fill();

          ctx.fillStyle = accent;
          this.drawRoundedRect(ctx, bX, bY, 8, bH, 4);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(banner.title, bX + 22, bY + (banner.subtitle ? 28 : 29));

          if (banner.subtitle) {
            ctx.fillStyle = accent;
            ctx.font = "500 12px Inter, system-ui, sans-serif";
            ctx.fillText(banner.subtitle, bX + 22, bY + 50);
          }
        }
        ctx.restore();
      }

      // 3.5 Featured Live Comment Overlay
      if (store.pinnedMessage && store.pinnedMessage.message) {
        const pm = store.pinnedMessage;
        ctx.save();
        const cardW = Math.min(620, W * 0.72);
        const cardH = 72;
        const cX = (W - cardW) / 2;
        const isTop = store.commentConfig?.position === "top";
        const cY = isTop
          ? 28
          : store.showTicker
            ? H - cardH - 62
            : H - cardH - 24;

        ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;

        ctx.fillStyle = "rgba(9, 9, 18, 0.95)";
        this.drawRoundedRect(ctx, cX, cY, cardW, cardH, 14);
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.strokeStyle = `${store.activeThemeColor || "#6366f1"}80`;
        ctx.lineWidth = 1.5;
        this.drawRoundedRect(ctx, cX, cY, cardW, cardH, 14);
        ctx.stroke();

        const avR = 19;
        const avX = cX + 30;
        const avY = cY + cardH / 2;
        ctx.fillStyle = store.activeThemeColor || "#6366f1";
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((pm.author[0] || "U").toUpperCase(), avX, avY);

        const textStartX = avX + avR + 14;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";

        ctx.font = "bold 13px Inter, system-ui, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(pm.author, textStartX, cY + 27);

        const nameW = ctx.measureText(pm.author).width;

        const isYouTube = pm.platform?.toLowerCase() === "youtube";
        const isTwitch = pm.platform?.toLowerCase() === "twitch";
        const badgeX = textStartX + nameW + 10;
        const badgeColor = isYouTube ? "#ff0000" : isTwitch ? "#9146ff" : (store.activeThemeColor || "#6366f1");

        ctx.fillStyle = `${badgeColor}33`;
        this.drawRoundedRect(ctx, badgeX, cY + 14, 62, 16, 4);
        ctx.fill();

        ctx.font = "bold 9px Inter, sans-serif";
        ctx.fillStyle = isYouTube ? "#ff6666" : isTwitch ? "#c499ff" : "#a5b4fc";
        ctx.fillText((pm.platform || "CHAT").toUpperCase(), badgeX + 6, cY + 26);

        ctx.font = "500 13px Inter, system-ui, sans-serif";
        ctx.fillStyle = "#f1f5f9";
        const maxMsgW = cardW - (textStartX - cX) - 20;
        let msgText = pm.message;
        if (ctx.measureText(msgText).width > maxMsgW) {
          while (msgText.length > 0 && ctx.measureText(msgText + "...").width > maxMsgW) {
            msgText = msgText.slice(0, -1);
          }
          msgText += "...";
        }
        ctx.fillText(msgText, textStartX, cY + 50);

        ctx.restore();
      }

      // 4. Watermark Logo
      if (store.showLogo && (store.logoConfig?.imageUrl || store.logoConfig?.text || store.logoUrl)) {
        const logoMode = store.logoConfig?.mode || "text";
        const hasLogoImg = Boolean((logoMode === "image" || logoMode === "both") && store.logoConfig?.imageUrl);
        if (hasLogoImg && store.logoConfig?.imageUrl) {
          if (this.cachedLogoImgUrl !== store.logoConfig.imageUrl) {
            this.cachedLogoImgUrl = store.logoConfig.imageUrl;
            this.logoImageEl = new Image();
            this.logoImageEl.crossOrigin = "anonymous";
            this.logoImageEl.src = store.logoConfig.imageUrl;
          }
        }
        const imgReady = Boolean(
          hasLogoImg && this.logoImageEl && this.logoImageEl.complete && this.logoImageEl.naturalWidth > 0
        );
        const targetImgH = store.logoConfig?.scale || 40;
        const targetImgW = imgReady && this.logoImageEl
          ? Math.round((this.logoImageEl.naturalWidth / Math.max(1, this.logoImageEl.naturalHeight)) * targetImgH)
          : 0;

        const showTextPart = logoMode !== "image" || !imgReady;
        const logoText = store.logoConfig?.text || store.logoUrl || "LIVE";
        ctx.save();
        ctx.font = "bold 13px Inter, monospace, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const textPartW = showTextPart ? ctx.measureText(logoText.toUpperCase()).width + 18 : 0;
        const pillW = Math.max(36, (imgReady ? targetImgW + 16 : 24) + textPartW);
        const pillH = Math.max(30, imgReady ? targetImgH + 12 : 30);

        let lX = W - pillW - 32;
        let lY = 28;
        if (store.logoPosition === "top-left") {
          lX = 32;
          lY = 28;
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

        let cursorX = lX + 10;
        if (imgReady && this.logoImageEl) {
          try {
            ctx.drawImage(this.logoImageEl, cursorX, lY + (pillH - targetImgH) / 2, targetImgW, targetImgH);
            cursorX += targetImgW + 8;
          } catch { }
        } else {
          ctx.fillStyle = store.activeThemeColor || "#6366f1";
          ctx.beginPath();
          ctx.arc(lX + 14, lY + pillH / 2, 4, 0, Math.PI * 2);
          ctx.fill();
          cursorX = lX + 24;
        }

        if (showTextPart) {
          ctx.fillStyle = store.logoConfig?.textColor || "#ffffff";
          ctx.fillText(logoText.toUpperCase(), cursorX, lY + pillH / 2);
        }
        ctx.restore();
      }

      // 5. News Ticker Crawl
      if (store.showTicker && store.tickerText) {
        const delta = (timestamp - this.lastTickerTime) / 1000;
        this.lastTickerTime = timestamp;

        let tickerSpeed = 65;
        if (store.tickerConfig?.speed === "slow") tickerSpeed = 45;
        else if (store.tickerConfig?.speed === "fast") tickerSpeed = 100;

        this.tickerOffset += tickerSpeed * Math.min(delta, 0.1);

        ctx.save();
        const tH = 50;
        const tY = H - tH;

        ctx.fillStyle = store.tickerConfig?.bgColor || "#050508";
        ctx.fillRect(0, tY, W, tH);

        ctx.fillStyle = store.activeThemeColor || "#6366f1";
        ctx.fillRect(0, tY, W, 2);

        const badgeText = store.tickerConfig?.badgeText || "LIVE UPDATES";
        ctx.font = "bold 13px Inter, system-ui, sans-serif";
        const badgeWidth = ctx.measureText(badgeText).width + 32;
        ctx.fillStyle = store.tickerConfig?.badgeBgColor || "#e11d48";
        ctx.fillRect(0, tY, badgeWidth, tH);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, badgeWidth / 2, tY + tH / 2);

        ctx.save();
        ctx.beginPath();
        ctx.rect(badgeWidth, tY, W - badgeWidth, tH);
        ctx.clip();

        let fontSizePx = 18;
        if (store.tickerConfig?.fontSize === "small") fontSizePx = 14;
        else if (store.tickerConfig?.fontSize === "large") fontSizePx = 22;
        else if (store.tickerConfig?.fontSize === "xlarge") fontSizePx = 26;

        ctx.font = `bold ${fontSizePx}px Inter, system-ui, sans-serif`;
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

      // 6. Scene Custom Text / Title Card
      if (store.activeTextCard && store.activeTextCard.enabled && store.activeTextCard.heading) {
        const card = store.activeTextCard;
        ctx.save();
        const cardW = Math.min(720, W * 0.7);
        const cardH = card.subheading ? 130 : 90;
        let cx = (W - cardW) / 2;
        let cy = (H - cardH) / 2;
        if (card.position === "top") cy = 48;
        else if (card.position === "top-left") { cx = 40; cy = 48; }
        else if (card.position === "bottom-right") { cx = W - cardW - 40; cy = H - cardH - 90; }

        ctx.fillStyle = card.bgColor || "rgba(15, 23, 42, 0.88)";
        ctx.globalAlpha = (card.bgOpacity ?? 85) / 100;
        this.drawRoundedRect(ctx, cx, cy, cardW, cardH, 16);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = card.textColor || "#ffffff";
        ctx.font = "bold 32px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(card.heading, cx + cardW / 2, cy + (card.subheading ? 46 : cardH / 2));

        if (card.subheading) {
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "500 18px Inter, system-ui, sans-serif";
          ctx.fillText(card.subheading, cx + cardW / 2, cy + 92);
        }
        ctx.restore();
      }

      // 7. Scene Transition Fade Overlay
      if (store.isSceneTransitioning) {
        ctx.save();
        ctx.fillStyle = "rgba(7, 7, 13, 0.35)";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    } catch (renderErr) {
      console.warn("[StageBroadcaster] renderStageFrame catch:", renderErr);
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

  private initFilmGrainPattern(isColorRandom: boolean = false) {
    if (typeof document === "undefined") return;
    try {
      if (!this.grainCanvas) {
        this.grainCanvas = document.createElement("canvas");
        this.grainCanvas.width = 160;
        this.grainCanvas.height = 160;
      }
      const gctx = this.grainCanvas.getContext("2d");
      if (!gctx) return;
      const idata = gctx.createImageData(160, 160);
      const d = idata.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        if (isColorRandom && Math.random() < 0.35) {
          d[i] = Math.min(255, Math.max(0, v + ((Math.random() * 44 - 22) | 0)));
          d[i + 1] = v;
          d[i + 2] = Math.min(255, Math.max(0, v + ((Math.random() * 44 - 22) | 0)));
        } else {
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
        }
        d[i + 3] = (Math.random() * 85 + 25) | 0;
      }
      gctx.putImageData(idata, 0, 0);
    } catch { }
  }

  private drawFilmGrainOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    intensity: "light" | "medium" | "strong" | "random" = "random"
  ) {
    this.grainFrameTick++;
    if (!this.grainCanvas || (intensity === "random" && this.grainFrameTick % 8 === 0)) {
      this.initFilmGrainPattern(intensity === "random");
    }
    if (!this.grainCanvas) return;

    const alpha =
      intensity === "light"
        ? 0.18
        : intensity === "medium"
          ? 0.26
          : intensity === "strong"
            ? 0.36
            : 0.22 + Math.random() * 0.08;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "source-over";

    const jitterX = (Math.random() * 160) | 0;
    const jitterY = (Math.random() * 160) | 0;

    for (let px = x - jitterX; px < x + w; px += 160) {
      for (let py = y - jitterY; py < y + h; py += 160) {
        ctx.drawImage(this.grainCanvas, px, py);
      }
    }
    ctx.restore();
  }

  /**
   * Draws refined 35mm cinema vertical scratches (`0.8px / 1.4px / 2.2px`) that look authentic
   * without blocking the speaker's face while breaking video DCT macroblock hashes.
   */
  private drawVintageFilmLinesOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    intensity: "light" | "medium" | "strong" = "medium"
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const baseWidth = intensity === "light" ? 0.8 : intensity === "strong" ? 2.1 : 1.35;
    const baseAlpha = intensity === "light" ? 0.18 : intensity === "strong" ? 0.34 : 0.25;
    const activeCount = intensity === "light" ? 2 : intensity === "strong" ? 4 : 3;

    for (let i = 0; i < activeCount; i++) {
      const tr = this.vintageScratchTracks[i];
      tr.xNorm += tr.vx + (Math.random() - 0.5) * 0.0012;
      if (tr.xNorm < 0.05) tr.xNorm = 0.93;
      if (tr.xNorm > 0.95) tr.xNorm = 0.07;
      if (Math.random() < 0.03) {
        tr.xNorm = 0.08 + Math.random() * 0.84;
      }

      const lx = x + tr.xNorm * w;
      const startY = y + tr.yStartNorm * h;
      const endY = Math.min(y + h, startY + tr.lenNorm * h);

      ctx.lineWidth = baseWidth * tr.weight;
      ctx.strokeStyle = tr.isDark
        ? `rgba(15, 18, 28, ${baseAlpha * 0.85})`
        : `rgba(255, 248, 225, ${baseAlpha})`;

      ctx.beginPath();
      ctx.moveTo(lx, startY);
      ctx.lineTo(lx + tr.tilt * 3, endY);
      ctx.stroke();
    }

    // Subtle film dust specks
    for (let s = 0; s < 3; s++) {
      const sx = x + Math.random() * w;
      const sy = y + Math.random() * h;
      ctx.fillStyle = `rgba(255, 252, 235, ${baseAlpha * 0.85})`;
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }

    ctx.restore();
  }

  private enqueueChunk(chunk: Blob) {
    this.chunkQueue.push(chunk);
    this.processUploadQueue();
  }

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
          let token = "";
          if (typeof window !== "undefined") {
            token = localStorage.getItem("livestudio_token") || "";
          }
          const res = await fetch(`/api/broadcasts/${this.activeBroadcastId}/stream/chunk`, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: chunk,
          });
          if (res.ok) {
            uploaded = true;
          } else {
            await new Promise((r) => setTimeout(r, 200));
          }
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      this.chunkQueue.shift();
    }

    this.isUploading = false;
  }

  public stop() {
    this.isStreamingRtmp = false;
    this.activeBroadcastId = null;
    this.chunkQueue = [];
    this.isUploading = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch { }
    }
    this.mediaRecorder = null;

    if (this.isLocalRecordingActive) {
      return;
    }

    this.stopStageComposite(true);
  }
}

export const stageBroadcaster = new StageBroadcaster();
