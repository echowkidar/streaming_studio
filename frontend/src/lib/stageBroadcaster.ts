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
  private silentGain: GainNode | null = null;
  private activeBroadcastId: string | null = null;
  private isCompositeActive = false;
  private isStreamingRtmp = false;
  private isLocalRecordingActive = false;

  // Frame Rate Throttling (Strict 30 FPS to save CPU and eliminate video stutter)
  private lastFrameTime = 0;
  private readonly FRAME_INTERVAL = 1000 / 30; // ~33.33ms
  private readonly FRAME_TOLERANCE = 27; // ms (smooth 30 FPS on 60Hz/120Hz/144Hz displays without dropped vsync ticks)

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
  private mediaGainNode: GainNode | null = null;
  private hpFilter: BiquadFilterNode | null = null;
  private formantFilter: BiquadFilterNode | null = null;

  // Cached Background & Overlay Images
  private cachedBgUrl: string | null = null;
  private bgImage: HTMLImageElement | null = null;
  private cachedOverlayUrl: string | null = null;
  private overlayImage: HTMLImageElement | null = null;
  private cachedLogoUrl: string | null = null;
  private cachedLogoImage: HTMLImageElement | null = null;
  private cachedChromaBackdropUrl: string | null = null;
  private chromaBackdropImage: HTMLImageElement | null = null;
  private grainCanvas: HTMLCanvasElement | null = null;
  private grainFrameCount = 0;

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
    return this.isStreamingRtmp;
  }

  public isCompositeRunning(): boolean {
    return this.isCompositeActive;
  }

  public setLocalRecordingActive(active: boolean): void {
    this.isLocalRecordingActive = active;
    if (!active && !this.isStreamingRtmp && this.isCompositeActive) {
      this.stopStageComposite();
    }
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

  /**
   * Start 30 FPS Canvas render loop & Web Audio mix, returning live MediaStreamTracks for WebRTC
   * This allows LiveKit to stream the exact stage (with overlays, tickers, banners, backgrounds) to YouTube!
   */
  public startStageComposite(stageElement: HTMLElement | null): { videoTrack: MediaStreamTrack; audioTrack: MediaStreamTrack | null } | null {
    if (this.isCompositeActive && this.activeVideoTrack) {
      return { videoTrack: this.activeVideoTrack, audioTrack: this.activeAudioTrack };
    }

    const container = stageElement || document.getElementById("livestudio-stage-container");
    if (!container) {
      console.error("[StageBroadcaster] Stage container element not found");
      return null;
    }

    this.isCompositeActive = true;
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
      
      // Audible tab flag trick: route at inaudible 0.00001 volume to system speakers so Chrome NEVER throttles background tab timers or WebRTC streams!
      try {
        const bgKeepAlive = this.audioCtx.createGain();
        bgKeepAlive.gain.value = 0.00001;
        carrier.connect(bgKeepAlive);
        bgKeepAlive.connect(this.audioCtx.destination);
      } catch {}

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
    let lastRafTime = performance.now();

    const doRenderFrame = (now: number) => {
      if (!this.isCompositeActive || !this.ctx || !this.canvas) return;

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

    // Foreground VSync Loop
    const render = (time: number) => {
      if (!this.isCompositeActive) return;
      lastRafTime = time;
      doRenderFrame(time);
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);

    // Background Web Worker Clock: Only renders when browser tab is hidden/throttled or rAF stalls
    this.startWorkerClock(() => {
      if (!this.isCompositeActive) return;
      const now = performance.now();
      if ((typeof document !== "undefined" && document.hidden) || now - lastRafTime > 60) {
        doRenderFrame(now);
      }
    });

    // 5.5. Draw initial frame BEFORE captureStream so the track starts with valid non-black pixels
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
   * Enforces YouTube Fair-Use & StreamYard Auto-Advance on active media elements:
   * 1. Binds `ended` listener to auto-advance to `nextSceneIdOnMediaEnd`
   * 2. Applies playbackRate shift (e.g. 1.04x) & dynamic tempo variance
   * 3. Applies periodic Auto-Pause interval to break Content-ID continuous match
   * 4. Idle Media Guard: cuts back to host if mic & cam are off for too long
   */
  private enforceFairUseMediaPolicies(now: number) {
    const store = useStudioStore.getState();
    const { fairUseConfig, activeMedia, participants } = store;

    const mediaVideo =
      (document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null) ||
      (document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null);
    if (!mediaVideo || !activeMedia || (activeMedia.type !== "video" && activeMedia.type !== "audio")) return;

    // 1. Auto-Advance Scene when Video Ends
    if (!this.boundEndedElements.has(mediaVideo)) {
      this.boundEndedElements.add(mediaVideo);
      mediaVideo.addEventListener("ended", () => {
        useStudioStore.getState().triggerMediaEnded();
      });
    }

    if (!fairUseConfig || !fairUseConfig.enabled) return;

    // 2. Playback Speed Shift & Dynamic Tempo Variance (Anti-Fingerprint)
    const baseRate = fairUseConfig.playbackRate || 1.04;
    const tempoVariance = fairUseConfig.enableAudioFairUse ? Math.sin(now / 3500) * 0.02 : 0;
    const targetRate = Math.max(0.8, Math.min(1.5, baseRate + tempoVariance));
    if (Math.abs(mediaVideo.playbackRate - targetRate) > 0.005) {
      mediaVideo.playbackRate = targetRate;
      (mediaVideo as any).preservesPitch = !fairUseConfig.enableAudioFairUse;
      (mediaVideo as any).mozPreservesPitch = !fairUseConfig.enableAudioFairUse;
      (mediaVideo as any).webkitPreservesPitch = !fairUseConfig.enableAudioFairUse;
    }

    // 3. 8-12s Random Jerk / Frame-Skip / Pause (Anti-Content ID Continuous Match)
    if (fairUseConfig.autoPauseIntervalSec > 0) {
      // Agar 8 select hai to har baar 8s se 12s ke beech random time lega
      const targetIntervalMs =
        fairUseConfig.autoPauseIntervalSec === 8
          ? this.nextRandomIntervalMs
          : fairUseConfig.autoPauseIntervalSec * 1000;

      if (!mediaVideo.paused && now - this.lastAutoPauseTimestamp >= targetIntervalMs) {
        this.lastAutoPauseTimestamp = now;
        // Agle cycle ke liye naya 8s–12s (8000ms–12000ms) random time set karein
        this.nextRandomIntervalMs = Math.floor(8000 + Math.random() * 4000);

        const mode = fairUseConfig.antiMatchMode || "jerk-skip";

        if (mode === "jerk-skip") {
          // Micro-Jerk + Frame Skip: 180ms pause + 0.26s frame jump (Content-ID sequence break without long freeze)
          this.isAutoPausedByFairUse = true;
          mediaVideo.pause();
          setTimeout(() => {
            if (this.isAutoPausedByFairUse) {
              this.isAutoPausedByFairUse = false;
              if (mediaVideo.duration && mediaVideo.currentTime + 0.35 < mediaVideo.duration) {
                mediaVideo.currentTime += 0.24 + Math.random() * 0.12;
              }
              this.lastAutoPauseTimestamp = performance.now();
              mediaVideo.play().catch(() => {});
            }
          }, 180);
        } else {
          // Micro-Pause (380ms) ya Full Pause (1800ms)
          const pauseMs = mode === "micro-pause" ? 380 : 1800;
          this.isAutoPausedByFairUse = true;
          mediaVideo.pause();
          setTimeout(() => {
            if (this.isAutoPausedByFairUse && mediaVideo.paused) {
              this.isAutoPausedByFairUse = false;
              this.lastAutoPauseTimestamp = performance.now();
              mediaVideo.play().catch(() => {});
            }
          }, pauseMs);
        }
      }
    }

    // 4. Idle Media Guard (Prevents unoriginal stream flag if host leaves media unattended)
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

  public stopStageComposite() {
    this.isCompositeActive = false;
    this.activeVideoTrack = null;
    this.activeAudioTrack = null;

    if (this.canvas && this.canvas.parentNode) {
      try {
        this.canvas.parentNode.removeChild(this.canvas);
      } catch {}
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.stopWorkerClock();

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }

    if (this.mediaGainNode) {
      try {
        this.mediaGainNode.disconnect();
      } catch {}
      this.mediaGainNode = null;
    }

    if (this.hpFilter) {
      try {
        this.hpFilter.disconnect();
      } catch {}
      this.hpFilter = null;
    }

    if (this.formantFilter) {
      try {
        this.formantFilter.disconnect();
      } catch {}
      this.formantFilter = null;
    }

    this.participantAudioNodes.forEach((entry) => {
      try {
        entry.source.disconnect();
        entry.gain.disconnect();
      } catch {}
    });
    this.participantAudioNodes.clear();
    this.connectedMediaElements.clear();
    this.cachedLayouts = [];
    this.canvas = null;
    this.ctx = null;
    this.cachedBgUrl = null;
    this.bgImage = null;
    this.cachedOverlayUrl = null;
    this.overlayImage = null;
    this.cachedLogoUrl = null;
    this.cachedLogoImage = null;
    this.cachedChromaBackdropUrl = null;
    this.chromaBackdropImage = null;
    console.log("[StageBroadcaster] Stage composite stopped and resources freed.");
  }

  /**
   * Dedicated Web Worker clock: Chrome aggressively throttles timers (requestAnimationFrame to 0 FPS,
   * setInterval to 1 FPS) in background or unfocused tabs. Web Workers run in a separate thread and are
   * immune to background tab throttling, ensuring a steady 30 FPS stream even when user switches to YouTube Studio.
   */
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
      console.log("[StageBroadcaster] Web Worker background 30 FPS clock active.");
    } catch (err) {
      console.warn("[StageBroadcaster] Web Worker clock unavailable, using interval fallback:", err);
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
      } catch {}
      this.workerTimer = null;
    }
    if (this.workerBlobUrl) {
      try {
        URL.revokeObjectURL(this.workerBlobUrl);
      } catch {}
      this.workerBlobUrl = null;
    }
    if (this.bgIntervalId) {
      clearInterval(this.bgIntervalId);
      this.bgIntervalId = null;
    }
  }

  /**
   * Start broadcasting the live stage via RTMP FFmpeg pipe
   */
  public async start(stageElement: HTMLElement | null, broadcastId: string): Promise<boolean> {
    if (this.isStreamingRtmp) {
      console.warn("[StageBroadcaster] RTMP Broadcast is already active, ignoring duplicate start request");
      return true;
    }

    const container = stageElement || document.getElementById("livestudio-stage-container");
    if (!container) {
      console.error("[StageBroadcaster] Stage container element not found");
      return false;
    }

    this.activeBroadcastId = broadcastId;
    this.isStreamingRtmp = true;
    this.chunkQueue = [];
    this.isUploading = false;

    // 1. Ensure composite canvas & Web Audio mix is running
    if (!this.isCompositeActive || !this.canvas) {
      const composite = this.startStageComposite(container);
      if (!composite || !this.canvas) {
        console.error("[StageBroadcaster] Failed to start underlying stage composite");
        this.isStreamingRtmp = false;
        return false;
      }
    }

    // 2. Combine Video Track from Canvas + Audio Track from Web Audio Destination
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
        videoBitsPerSecond: 2800000, // 2.8 Mbps crisp 720p HD streaming
        audioBitsPerSecond: 128000,  // 128 kbps stereo AAC
      });

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0 && this.activeBroadcastId) {
          console.log(`[StageBroadcaster] WebM Chunk emitted (${e.data.size} bytes) for ${this.activeBroadcastId}`);
          this.enqueueChunk(e.data);
        }
      };

      this.mediaRecorder.onerror = (recorderErr) => {
        console.error("[StageBroadcaster] MediaRecorder error:", recorderErr);
      };

      // Emit chunk every 500ms for smooth, continuous delivery
      this.mediaRecorder.start(500);
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

        if (isFullBleed) {
          // Snap flush to edge borders and round internal seams to eliminate any sub-pixel/margin gaps in canvas recording
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

      // Z-Index sorting so floating PiP & dragged freeform boxes draw on top
      nextLayouts.sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10));
      this.cachedLayouts = nextLayouts;
    } catch (err) {
      console.warn("[StageBroadcaster] Layout snapshot warning:", err);
    }
  }

  /**
   * Connect participant and media audio streams into the broadcast mix
   * StreamYard Parity: Backstage & muted participants are instantly silenced with GainNode
   */
  public refreshAudioConnections() {
    if (!this.audioCtx || !this.audioDestination) return;

    try {
      const store = useStudioStore.getState();
      const activeTrackIds = new Set<string>();

      let isAnyParticipantSpeaking = false;

      // 1. Participant Microphones with GainNode control (Prevents mute/backstage audio leaks)
      store.participants.forEach((p) => {
        const mediaTrack =
          (p.audioTrack as any)?.mediaStreamTrack ||
          (p.audioTrack instanceof MediaStreamTrack ? p.audioTrack : null);

        const isHost = Boolean(p.isLocal || p.role === "host" || p.role === "HOST");
        // Host mic is audible whenever Host Mic is ON (even if Host tile is backstage during Media+Guest 2-window swap!)
        // Guest mic is audible only when Guest is ON_STAGE and Guest Mic is ON.
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
              console.log(`[StageBroadcaster] Connected mic audio with GainNode for ${p.name}`);
            } catch (err) {
              console.warn(`[StageBroadcaster] Audio connect error for ${p.name}:`, err);
            }
          } else {
            // Real-time Mute / Unmute / Backstage cutoff
            nodeEntry.gain.gain.value = isAudible ? 1 : 0;
          }
        }
      });

      // Disconnect and clean up participants that left or disconnected
      this.participantAudioNodes.forEach((entry, trackId) => {
        if (!activeTrackIds.has(trackId)) {
          try {
            entry.source.disconnect();
            entry.gain.disconnect();
          } catch {}
          this.participantAudioNodes.delete(trackId);
        }
      });

      // 2. Active Stage Media Video / Audio Element (with Auto Audio Ducking)
      const mediaVideo =
        (document.getElementById("livestudio-active-media-video") as HTMLVideoElement | null) ||
        (document.getElementById("livestudio-active-media-audio") as HTMLAudioElement | null);

      if (mediaVideo && this.audioCtx && this.audioDestination) {
        if (!this.mediaGainNode) {
          try {
            this.mediaGainNode = this.audioCtx.createGain();
            this.mediaGainNode.connect(this.audioDestination);
          } catch (gainErr) {
            console.warn("[StageBroadcaster] Failed to create mediaGainNode:", gainErr);
          }
        }

        const isMediaMuted = Boolean(store.activeMedia?.isMuted || mediaVideo.muted);
        const baseVol = (store.activeMedia?.volume ?? 100) / 100; // 0.0 to 2.0 (boost supported)
        const isDuckingEnabled = Boolean(
          store.fairUseConfig?.enabled &&
          store.fairUseConfig?.autoAudioDucking &&
          (store.fairUseConfig?.duckingActive !== false)
        );
        const shouldDuck = isDuckingEnabled && isAnyParticipantSpeaking;
        const duckVol = (store.fairUseConfig?.duckingVolumePct ?? 18) / 100;
        const finalGain = isMediaMuted ? 0 : shouldDuck ? Math.min(baseVol, duckVol) : baseVol;

        if (this.mediaGainNode) {
          this.mediaGainNode.gain.setTargetAtTime(finalGain, this.audioCtx.currentTime, 0.12);
        }
        if (mediaVideo.muted !== isMediaMuted) {
          mediaVideo.muted = isMediaMuted;
        }

        // Setup Formant EQ Filter when audio fair-use is active
        const needsAudioFairUse = Boolean(
          store.fairUseConfig?.enabled && store.fairUseConfig?.enableAudioFairUse
        );
        if (needsAudioFairUse && !this.hpFilter && this.audioCtx) {
          try {
            this.hpFilter = this.audioCtx.createBiquadFilter();
            this.hpFilter.type = "highpass";
            this.hpFilter.frequency.value = 85;

            this.formantFilter = this.audioCtx.createBiquadFilter();
            this.formantFilter.type = "peaking";
            this.formantFilter.frequency.value = 2350;
            this.formantFilter.Q.value = 1.4;
            this.formantFilter.gain.value = 3.5;

            this.hpFilter.connect(this.formantFilter);
            if (this.mediaGainNode) {
              this.formantFilter.connect(this.mediaGainNode);
            }
          } catch (filterErr) {
            console.warn("[StageBroadcaster] Formant filter creation error:", filterErr);
          }
        }

        const targetInputNode =
          needsAudioFairUse && this.hpFilter
            ? this.hpFilter
            : this.mediaGainNode || this.audioDestination;

        try {
          const stream =
            (mediaVideo as any).captureStream?.() ||
            (mediaVideo as any).mozCaptureStream?.();

          if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack && !this.participantAudioNodes.has(audioTrack.id)) {
              const srcNode = this.audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
              srcNode.connect(targetInputNode);
              this.participantAudioNodes.set(audioTrack.id, {
                source: srcNode,
                gain: this.mediaGainNode || this.audioCtx.createGain(),
              });
              console.log("[StageBroadcaster] Connected media video audio stream to broadcast mix");
            }
          } else if (!this.connectedMediaElements.has(mediaVideo)) {
            const src = this.audioCtx.createMediaElementSource(mediaVideo);
            src.connect(targetInputNode);
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
    if (!this.ctx) return;
    const ctx = this.ctx;
    const store = useStudioStore.getState();

    try {
      // ─────────────────────────────────────────────────────────────
      // 1. Draw Background Layer (Video, Wallpaper Image, or Dark Slate)
      // ─────────────────────────────────────────────────────────────
      const bgVideo = container.querySelector("video.object-cover") as HTMLVideoElement | null;
      let drewVideoBackground = false;
      if (bgVideo && bgVideo.readyState >= 2) {
        try {
          ctx.drawImage(bgVideo, 0, 0, W, H);
          drewVideoBackground = true;
        } catch {}
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
      }
      if (!drewVideoBackground && store.chromaKeyConfig?.enabled && store.chromaKeyConfig?.backdropUrl) {
        if (this.cachedChromaBackdropUrl !== store.chromaKeyConfig.backdropUrl) {
          this.cachedChromaBackdropUrl = store.chromaKeyConfig.backdropUrl;
          this.chromaBackdropImage = new Image();
          this.chromaBackdropImage.crossOrigin = "anonymous";
          this.chromaBackdropImage.src = store.chromaKeyConfig.backdropUrl;
        }
        if (this.chromaBackdropImage && this.chromaBackdropImage.complete && this.chromaBackdropImage.naturalWidth > 0) {
          try {
            ctx.drawImage(this.chromaBackdropImage, 0, 0, W, H);
            drewVideoBackground = true;
          } catch {}
        }
      }
      if (!drewVideoBackground) {
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

      if ((!isFullBleed || isFloatingPipTile) && !tile.isTransparentCard) {
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

      // Card background: only draw solid dark background if card is NOT transparent
      if (!tile.isTransparentCard) {
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(x, y, w, h);
      }

      if (isMedia) {
        // ── Media Tile (Video, Image/Slides, or Tactical Map Canvas) ──
        const mediaVideo = el.querySelector("video") as HTMLVideoElement | null;
        const mediaImg = el.querySelector("img") as HTMLImageElement | null;
        const mediaCanvas = (el.querySelector("canvas#livestudio-tactical-map-canvas") ||
          el.querySelector("canvas")) as HTMLCanvasElement | null;

        const defaultMediaFit = currentStore.isStageCropped ? "cover" : "contain";
        const mediaTf = currentStore.tileTransforms["active-media"] || { fitMode: defaultMediaFit, zoom: 1, panX: 0, panY: 0 };
        const isCover = (tile.fitMode === "cover" || mediaTf.fitMode === "cover");
        const zoom = Math.max(1, mediaTf.zoom || 1);
        const panX = mediaTf.panX || 0;
        const panY = mediaTf.panY || 0;

        // Cinematic Zoom Breathing scale oscillation (defeating DCT perceptual hashes)
        const breathIntensity = currentStore.fairUseConfig?.breathingIntensity || "subtle";
        const amp = breathIntensity === "strong" ? 0.09 : breathIntensity === "medium" ? 0.055 : 0.03;
        const breathingScale =
          currentStore.fairUseConfig?.enabled && currentStore.fairUseConfig?.isBreathingEnabled
            ? 1.0 + amp * (1 + Math.sin(timestamp / 1200))
            : 1.0;
        const effectiveZoom = zoom * breathingScale;

        if (mediaVideo && mediaVideo.readyState >= 2 && mediaVideo.videoWidth > 0) {
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
            sw = sw / effectiveZoom;
            sh = sh / effectiveZoom;
            let sx = (mediaVideo.videoWidth - sw) * (objectPosX / 100);
            let sy = (mediaVideo.videoHeight - sh) * (objectPosY / 100);
            sx = Math.max(0, Math.min(mediaVideo.videoWidth - sw, sx));
            sy = Math.max(0, Math.min(mediaVideo.videoHeight - sh, sy));
            try {
              ctx.drawImage(mediaVideo, sx, sy, sw, sh, x, y, w, h);
            } catch {}
          } else {
            let dw = w, dh = h, dx = x, dy = y;
            if (vRatio > tRatio) {
              dh = w / vRatio;
              dy = y + (h - dh) / 2;
            } else {
              dw = h * vRatio;
              dx = x + (w - dw) / 2;
            }
            if (effectiveZoom > 1) {
              let sw = mediaVideo.videoWidth / effectiveZoom;
              let sh = mediaVideo.videoHeight / effectiveZoom;
              let sx = (mediaVideo.videoWidth - sw) * (objectPosX / 100);
              let sy = (mediaVideo.videoHeight - sh) * (objectPosY / 100);
              sx = Math.max(0, Math.min(mediaVideo.videoWidth - sw, sx));
              sy = Math.max(0, Math.min(mediaVideo.videoHeight - sh, sy));
              try {
                ctx.drawImage(mediaVideo, sx, sy, sw, sh, dx, dy, dw, dh);
              } catch {}
            } else {
              try {
                ctx.drawImage(mediaVideo, dx, dy, dw, dh);
              } catch {}
            }
          }
          ctx.restore();

          // Dynamic Film Grain / Micro-Noise Adjustment Layer (Anti-Fingerprint Hash Mutator)
          if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.filmGrainOverlay ?? true)) {
            this.drawFilmGrainOverlay(ctx, x, y, w, h);
          }

          // Vintage Old-Movie Scratches & Traveling Lines Overlay (Breaks video visual hash & edge maps)
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

          // Fair-Use Commentary Badge on Media
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
            sw = sw / effectiveZoom;
            sh = sh / effectiveZoom;
            let sx = (mediaImg.naturalWidth - sw) * (objectPosX / 100);
            let sy = (mediaImg.naturalHeight - sh) * (objectPosY / 100);
            sx = Math.max(0, Math.min(mediaImg.naturalWidth - sw, sx));
            sy = Math.max(0, Math.min(mediaImg.naturalHeight - sh, sy));
            try {
              ctx.drawImage(mediaImg, sx, sy, sw, sh, x, y, w, h);
            } catch {}
          } else {
            let dw = w, dh = h, dx = x, dy = y;
            if (iRatio > tRatio) {
              dh = w / iRatio;
              dy = y + (h - dh) / 2;
            } else {
              dw = h * iRatio;
              dx = x + (w - dw) / 2;
            }
            if (effectiveZoom > 1) {
              let sw = mediaImg.naturalWidth / effectiveZoom;
              let sh = mediaImg.naturalHeight / effectiveZoom;
              let sx = (mediaImg.naturalWidth - sw) * (objectPosX / 100);
              let sy = (mediaImg.naturalHeight - sh) * (objectPosY / 100);
              sx = Math.max(0, Math.min(mediaImg.naturalWidth - sw, sx));
              sy = Math.max(0, Math.min(mediaImg.naturalHeight - sh, sy));
              try {
                ctx.drawImage(mediaImg, sx, sy, sw, sh, dx, dy, dw, dh);
              } catch {}
            } else {
              try {
                ctx.drawImage(mediaImg, dx, dy, dw, dh);
              } catch {}
            }
          }

          // Dynamic Film Grain / Micro-Noise Adjustment Layer (Anti-Fingerprint Hash Mutator)
          if (currentStore.fairUseConfig?.enabled && (currentStore.fairUseConfig?.filmGrainOverlay ?? true)) {
            this.drawFilmGrainOverlay(ctx, x, y, w, h);
          }

          // Vintage Old-Movie Scratches & Traveling Lines Overlay (Breaks video visual hash & edge maps)
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
        } else if (mediaCanvas && mediaCanvas.width > 0 && mediaCanvas.height > 0) {
          try {
            ctx.drawImage(mediaCanvas, x, y, w, h);
          } catch {}
        }

        // Draw Live Broadcast Web Pointer if active over website scene
        if (typeof window !== "undefined" && (window as any).__livestudioWebPointer && (window as any).__livestudioWebPointer.visible) {
          const ptr = (window as any).__livestudioWebPointer;
          const ptrX = x + (w * ptr.xPct) / 100;
          const ptrY = y + (h * ptr.yPct) / 100;
          this.drawBroadcastPointer(
            ctx,
            ptrX,
            ptrY,
            ptr.style || "laser",
            ptr.color || "#ef4444",
            Boolean(ptr.isClicking),
            timestamp
          );
        }

        // Clean broadcast video output (StreamYard parity: raw file names like 'Intro Video.mp4' are never burned onto the live stream or recording)
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
          try {
            ctx.drawImage(canvas, x, y, w, h);
          } catch {}
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
            // Auto-adjust Fit / Pillarbox (StreamYard standard for vertical mobile phones & screen shares):
            // Preserves 100% of the video without chopping off heads, chins, or content
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
            } catch {}
          } else {
            // Fill / Cover mode: crop center to fill slot with zoom and pan
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
            } catch {}
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

        // Participant Name Pill (Clean name for broadcast stream, no '(You)')
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
          try {
            ctx.drawImage(vidEl, ox, oy, ow, oh);
          } catch {}
        } else if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
          try {
            ctx.drawImage(imgEl, ox, oy, ow, oh);
          } catch {}
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
            } catch {}
          }
        }

        ctx.restore();
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2.8 Interactive Telestrator & Live On-Screen Drawing Layer
    // ─────────────────────────────────────────────────────────────
    if (store.isDrawingVisible !== false) {
      const drawCanvas = container.querySelector("#livestudio-draw-canvas") as HTMLCanvasElement | null;
      if (drawCanvas && drawCanvas.width > 0 && drawCanvas.height > 0) {
        try {
          ctx.drawImage(drawCanvas, 0, 0, W, H);
        } catch (drawErr) {
          // Canvas capture safety fallback
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2.5 Stage Full-Frame 16:9 PNG Frame Overlay (StreamYard Parity)
    // ─────────────────────────────────────────────────────────────
    if (store.activeOverlayUrl) {
      if (this.cachedOverlayUrl !== store.activeOverlayUrl) {
        this.cachedOverlayUrl = store.activeOverlayUrl;
        this.overlayImage = new Image();
        this.overlayImage.crossOrigin = "anonymous";
        this.overlayImage.src = store.activeOverlayUrl;
      }
      if (this.overlayImage && this.overlayImage.complete && this.overlayImage.naturalWidth > 0) {
        try {
          ctx.drawImage(this.overlayImage, 0, 0, W, H);
        } catch {}
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Lower-Third Banner (4 Styles: Classic, Minimal, Block, Bubble)
    // ─────────────────────────────────────────────────────────────
    if (store.activeBanner && store.activeBanner.isShowing && store.activeBanner.title) {
      const banner = store.activeBanner;
      const bannerStyle = banner.style || "classic";
      const themeColor = banner.themeColor || store.activeThemeColor || "#6366f1";
      ctx.save();
      const bX = 36;
      const bY = H - 116;

      if (bannerStyle === "block") {
        // Block style: high-contrast solid theme badge + crisp rectangular block
        const titleW = Math.max(260, banner.title.length * 14 + 40);
        ctx.fillStyle = themeColor;
        ctx.fillRect(bX, bY, titleW, 36);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 17px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(banner.title.toUpperCase(), bX + 16, bY + 18);

        if (banner.subtitle) {
          const subW = Math.max(280, banner.subtitle.length * 10 + 36);
          ctx.fillStyle = "rgba(10, 10, 18, 0.94)";
          ctx.fillRect(bX, bY + 36, subW, 30);
          ctx.fillStyle = "#f1f5f9";
          ctx.font = "bold 13px Inter, system-ui, sans-serif";
          ctx.fillText(banner.subtitle, bX + 16, bY + 51);
        }
      } else if (bannerStyle === "bubble") {
        // Bubble style: pill capsule with soft gradient and rounded corners
        const bW = Math.max(340, Math.max(banner.title.length * 13, (banner.subtitle?.length || 0) * 9) + 48);
        const bH = banner.subtitle ? 64 : 44;
        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        this.drawRoundedRect(ctx, bX, bY, bW, bH, 24);
        ctx.fill();
        ctx.strokeStyle = `${themeColor}99`;
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, bX, bY, bW, bH, 24);
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.beginPath();
        ctx.arc(bX + 22, bY + (banner.subtitle ? 24 : bH / 2), 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(banner.title, bX + 38, bY + (banner.subtitle ? 24 : bH / 2));

        if (banner.subtitle) {
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "500 12px Inter, system-ui, sans-serif";
          ctx.fillText(banner.subtitle, bX + 38, bY + 46);
        }
      } else if (bannerStyle === "minimal") {
        // Minimal style: translucent strip with bottom gradient border
        const bW = Math.max(320, Math.max(banner.title.length * 12, (banner.subtitle?.length || 0) * 8.5) + 36);
        const bH = banner.subtitle ? 58 : 38;
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        this.drawRoundedRect(ctx, bX, bY, bW, bH, 6);
        ctx.fill();
        ctx.fillStyle = themeColor;
        ctx.fillRect(bX, bY + bH - 3, bW, 3);

        ctx.fillStyle = "#ffffff";
        ctx.font = "600 15px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(banner.title, bX + 16, bY + (banner.subtitle ? 20 : bH / 2));

        if (banner.subtitle) {
          ctx.fillStyle = "#94a3b8";
          ctx.font = "400 12px Inter, system-ui, sans-serif";
          ctx.fillText(banner.subtitle, bX + 16, bY + 40);
        }
      } else {
        // Classic style (default)
        const bW = Math.max(340, Math.max(banner.title.length * 12, (banner.subtitle?.length || 0) * 8.5) + 40);
        const bH = banner.subtitle ? 64 : 44;

        ctx.fillStyle = "rgba(10, 10, 18, 0.92)";
        this.drawRoundedRect(ctx, bX, bY, bW, bH, 12);
        ctx.fill();

        ctx.fillStyle = themeColor;
        this.drawRoundedRect(ctx, bX, bY, 8, bH, 4);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(banner.title, bX + 22, bY + (banner.subtitle ? 24 : bH / 2));

        if (banner.subtitle) {
          ctx.fillStyle = themeColor;
          ctx.font = "500 12px Inter, system-ui, sans-serif";
          ctx.fillText(banner.subtitle, bX + 22, bY + 48);
        }
      }
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 3.5 Featured Live Comment Overlay (StreamYard Lower-Third Style)
    // ─────────────────────────────────────────────────────────────
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

      // Card drop shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;

      // Card background
      ctx.fillStyle = "rgba(9, 9, 18, 0.95)";
      this.drawRoundedRect(ctx, cX, cY, cardW, cardH, 14);
      ctx.fill();

      // Card border
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = `${store.activeThemeColor || "#6366f1"}80`;
      ctx.lineWidth = 1.5;
      this.drawRoundedRect(ctx, cX, cY, cardW, cardH, 14);
      ctx.stroke();

      // Avatar Circle
      const avR = 19;
      const avX = cX + 30;
      const avY = cY + cardH / 2;
      ctx.fillStyle = store.activeThemeColor || "#6366f1";
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Initial
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((pm.author[0] || "U").toUpperCase(), avX, avY);

      // Text Section
      const textStartX = avX + avR + 14;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Author Name
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(pm.author, textStartX, cY + 27);

      const nameW = ctx.measureText(pm.author).width;

      // Platform badge
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

      // Message text
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

    // ─────────────────────────────────────────────────────────────
    // 4. Watermark Logo (Text Badge, Image PNG, or Both)
    // ─────────────────────────────────────────────────────────────
    if (store.showLogo && (store.logoConfig?.text || store.logoConfig?.imageUrl || store.logoUrl)) {
      const mode = store.logoConfig?.mode || "text";
      const imageUrl = store.logoConfig?.imageUrl;
      const logoText = store.logoConfig?.text || store.logoUrl || "LIVE";
      const heightPx = Math.max(24, Math.min(88, store.logoConfig?.heightPx || 42));

      ctx.save();
      let lX = W - 220;
      let lY = 32;
      if (store.logoPosition === "top-left") {
        lX = 32;
        lY = 32;
      } else if (store.logoPosition === "bottom-left") {
        lX = 32;
        lY = H - heightPx - 48;
      } else if (store.logoPosition === "bottom-right") {
        lX = W - 220;
        lY = H - heightPx - 48;
      }

      if ((mode === "image" || mode === "both") && imageUrl) {
        if (!this.cachedLogoImage || this.cachedLogoUrl !== imageUrl) {
          this.cachedLogoUrl = imageUrl;
          this.cachedLogoImage = new Image();
          this.cachedLogoImage.crossOrigin = "anonymous";
          this.cachedLogoImage.src = imageUrl;
        }
        if (this.cachedLogoImage && this.cachedLogoImage.complete && this.cachedLogoImage.naturalWidth > 0) {
          const aspect = this.cachedLogoImage.naturalWidth / this.cachedLogoImage.naturalHeight;
          const logoW = heightPx * aspect;
          if (store.logoPosition === "top-right" || store.logoPosition === "bottom-right" || !store.logoPosition) {
            lX = W - logoW - 32;
          }
          if (mode === "both") {
            // Draw image + text badge side by side
            ctx.drawImage(this.cachedLogoImage, lX, lY, logoW, heightPx);
            ctx.font = "bold 13px Inter, monospace, sans-serif";
            const pillW = logoText.length * 8 + 24;
            const textX = lX - pillW - 12;
            if (!store.logoConfig?.isTransparentBg) {
              ctx.fillStyle = store.logoConfig?.bgColor ? `${store.logoConfig.bgColor}cc` : "rgba(0, 0, 0, 0.8)";
              this.drawRoundedRect(ctx, textX, lY + (heightPx - 30) / 2, pillW, 30, 8);
              ctx.fill();
            }
            ctx.fillStyle = store.logoConfig?.textColor || "#ffffff";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(logoText.toUpperCase(), textX + 12, lY + heightPx / 2);
          } else {
            ctx.drawImage(this.cachedLogoImage, lX, lY, logoW, heightPx);
          }
        }
      } else {
        // Text Badge Mode
        ctx.font = "bold 13px Inter, monospace, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const pillW = logoText.length * 8 + 36;
        const pillH = Math.max(30, Math.min(heightPx, 50));
        if (store.logoPosition === "top-right" || store.logoPosition === "bottom-right" || !store.logoPosition) {
          lX = W - pillW - 32;
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
        ctx.fillText(logoText.toUpperCase(), lX + 24, lY + pillH / 2);
      }
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 5. News Ticker Crawl
    // ─────────────────────────────────────────────────────────────
    if (store.showTicker && store.tickerText) {
      const delta = (timestamp - this.lastTickerTime) / 1000;
      this.lastTickerTime = timestamp;

      // Slower, smoother scroll speed as requested by user
      let tickerSpeed = 65; // pixels per second (was 120)
      if (store.tickerConfig?.speed === "slow") tickerSpeed = 45;
      else if (store.tickerConfig?.speed === "fast") tickerSpeed = 100;

      this.tickerOffset += tickerSpeed * Math.min(delta, 0.1);

      ctx.save();
      const tH = 50; // Increased height/width for prominent broadcast banner (was 38)
      const tY = H - tH;

      ctx.fillStyle = store.tickerConfig?.bgColor || "#050508";
      ctx.fillRect(0, tY, W, tH);

      // Top border accent
      ctx.fillStyle = store.activeThemeColor || "#6366f1";
      ctx.fillRect(0, tY, W, 2);

      // ── Live Updates Badge on Left (matching Studio UI) ──
      const badgeText = store.tickerConfig?.badgeText || "LIVE UPDATES";
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      const badgeWidth = ctx.measureText(badgeText).width + 32;
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

      // 6. Scene Custom Text / Title Card (StreamYard Paid Plan)
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

  /**
   * Initializes a lightweight procedural monochrome micro-noise texture
   */
  private initFilmGrainPattern() {
    if (typeof document === "undefined") return;
    try {
      this.grainCanvas = document.createElement("canvas");
      this.grainCanvas.width = 160;
      this.grainCanvas.height = 160;
      const gctx = this.grainCanvas.getContext("2d");
      if (!gctx) return;
      const idata = gctx.createImageData(160, 160);
      const d = idata.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = (Math.random() * 45 + 15) | 0; // Subtle random particle alpha
      }
      gctx.putImageData(idata, 0, 0);
    } catch {}
  }

  /**
   * Dynamically regenerates RGB Chroma + Luma noise every 12 frames in Random mode
   */
  private initDynamicFilmGrainPattern() {
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
        const luma = (Math.random() * 255) | 0;
        const rJitter = ((Math.random() - 0.5) * 40) | 0;
        const gJitter = ((Math.random() - 0.5) * 40) | 0;
        const bJitter = ((Math.random() - 0.5) * 40) | 0;
        d[i] = Math.max(0, Math.min(255, luma + rJitter));
        d[i + 1] = Math.max(0, Math.min(255, luma + gJitter));
        d[i + 2] = Math.max(0, Math.min(255, luma + bJitter));
        d[i + 3] = (Math.random() * 60 + 20) | 0;
      }
      gctx.putImageData(idata, 0, 0);
    } catch {}
  }

  /**
   * Draws dynamic moving microscopic film grain over media rectangle to mutate video perceptual hashes
   */
  private drawFilmGrainOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const store = useStudioStore.getState();
    const intensity = store.fairUseConfig?.grainIntensity || "random";
    this.grainFrameCount++;

    if (intensity === "random" && this.grainFrameCount % 12 === 0) {
      this.initDynamicFilmGrainPattern();
    } else if (!this.grainCanvas) {
      this.initFilmGrainPattern();
    }
    if (!this.grainCanvas) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    let alpha = 0.05;
    if (intensity === "light") alpha = 0.035;
    else if (intensity === "medium") alpha = 0.065;
    else if (intensity === "strong") alpha = 0.10;
    else if (intensity === "random") {
      alpha = 0.055 + Math.sin(this.grainFrameCount / 18) * 0.035; // 5.5% to 12%
    }

    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "overlay";

    // Random UV jitter per frame to animate grain particles continuously at 60 FPS
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
   * Draws Old-Movie Projector Fine Vertical Scratches, Flickering Hairlines & Micro-Scanlines
   * Visually looks like a classic retro cinema filter, while completely breaking video block/edge hashing.
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

    const lineCount = intensity === "light" ? 3 : intensity === "strong" ? 8 : 5;
    const baseAlpha = intensity === "light" ? 0.14 : intensity === "strong" ? 0.32 : 0.22;

    // 1. Random Vertical & Slightly Tilted Bareek Scratches (Old Cinema Reel Effect)
    for (let i = 0; i < lineCount; i++) {
      const lx = x + Math.random() * w;
      const tilt = (Math.random() - 0.5) * 6; // Halki si tirchhi ya seedhi bareek line
      const isDarkLine = Math.random() > 0.65;
      const alpha = baseAlpha * (0.5 + Math.random() * 0.7);

      ctx.strokeStyle = isDarkLine
        ? `rgba(15, 15, 20, ${alpha})`
        : `rgba(255, 250, 235, ${alpha})`;
      ctx.lineWidth = Math.random() < 0.75 ? 0.65 : 1.15; // Ekdum bareek hairline

      ctx.beginPath();
      // Kuch lines poori height par aayengi, kuch beech me toot-ti hui (projector scratch style)
      const startY = Math.random() < 0.6 ? y : y + Math.random() * (h * 0.4);
      const endY = Math.random() < 0.6 ? y + h : startY + h * (0.35 + Math.random() * 0.5);
      ctx.moveTo(lx, startY);
      ctx.lineTo(lx + tilt, Math.min(y + h, endY));
      ctx.stroke();
    }

    // 2. Subtle Traveling Horizontal Scanlines / Reel Dust specks (2 specks per frame)
    for (let s = 0; s < 2; s++) {
      const sx = x + Math.random() * w;
      const sy = y + Math.random() * h;
      ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha * 0.8})`;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    ctx.restore();
  }

  /**
   * Draws Live Broadcast Pointer (Laser, Cursor, Crosshair, Spotlight) over composite video frame
   */
  private drawBroadcastPointer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    style: string,
    color: string,
    isClicking: boolean,
    timestamp: number
  ) {
    ctx.save();
    const effectiveColor = color || "#ef4444";

    if (style === "cursor") {
      // Broadcast Arrow Cursor
      ctx.translate(x, y);
      if (isClicking) ctx.scale(1.25, 1.25);
      ctx.fillStyle = effectiveColor;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw cursor arrow inside
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 3);
      ctx.lineTo(2, 7);
      ctx.lineTo(-1, 8);
      ctx.lineTo(-3, 4);
      ctx.closePath();
      ctx.fill();
    } else if (style === "crosshair") {
      // Tactical Crosshair
      const size = isClicking ? 20 : 16;
      ctx.strokeStyle = effectiveColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - size - 4, y);
      ctx.lineTo(x + size + 4, y);
      ctx.moveTo(x, y - size - 4);
      ctx.lineTo(x, y + size + 4);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "spotlight") {
      // Spotlight Ring
      const radius = isClicking ? 40 : 48;
      ctx.strokeStyle = effectiveColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = effectiveColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // subtle inner tint
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
    } else {
      // "laser" (default)
      const pulseProgress = (timestamp % 900) / 900;
      const pulseRadius = 8 + pulseProgress * (isClicking ? 24 : 16);
      const pulseAlpha = Math.max(0, 1 - pulseProgress);

      // Pulse ring
      ctx.strokeStyle = effectiveColor;
      ctx.globalAlpha = pulseAlpha * 0.75;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Main laser dot with shadow
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = effectiveColor;
      ctx.shadowBlur = 14;
      ctx.fillStyle = effectiveColor;
      ctx.beginPath();
      ctx.arc(x, y, isClicking ? 9 : 7, 0, Math.PI * 2);
      ctx.fill();

      // Inner white core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

    while (this.chunkQueue.length > 0 && this.isStreamingRtmp && this.activeBroadcastId) {
      const chunk = this.chunkQueue[0];
      let uploaded = false;
      let retries = 0;

      while (!uploaded && retries < 3 && this.isStreamingRtmp && this.activeBroadcastId) {
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
            console.error(`[StageBroadcaster] Chunk upload HTTP ${res.status}:`, await res.text().catch(() => ""));
            await new Promise((r) => setTimeout(r, 200));
          }
        } catch (err) {
          console.warn(`[StageBroadcaster] Chunk upload network retry #${retries}:`, err);
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Dequeue only after success or max retries
      this.chunkQueue.shift();
    }

    this.isUploading = false;
  }

  /**
   * Stop RTMP broadcast
   */
  public stop() {
    this.isStreamingRtmp = false;
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

    if (!this.isLocalRecordingActive) {
      this.stopStageComposite();
    }
    console.log("[StageBroadcaster] RTMP live stream stopped.");
  }
}

export const stageBroadcaster = new StageBroadcaster();
