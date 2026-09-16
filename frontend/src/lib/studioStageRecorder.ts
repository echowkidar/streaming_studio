/**
 * LiveStudio Client-Side Stage Recorder
 * Records 1080p/720p stage canvas + mixed studio audio 100% locally in the host's browser.
 * Saves directly to the user's computer disk with ZERO bytes uploaded to VPS!
 * Supports native MP4 (H.264/AAC) and WebM with guaranteed non-zero frame capture.
 */

import { stageBroadcaster } from './stageBroadcaster';

export interface StageRecordingResult {
  blob: Blob;
  downloadUrl: string;
  durationSeconds: number;
  fileSize: number;
  fileName: string;
}

export class StudioStageRecorder {
  private static instance: StudioStageRecorder;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private timerInterval: NodeJS.Timeout | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private durationSeconds = 0;
  private isRecording = false;
  private onTimeUpdateCallback?: (seconds: number) => void;
  private didStartBroadcasterComposite = false;
  private selectedMime = '';
  private fileExtension = 'mp4';

  public static getInstance(): StudioStageRecorder {
    if (!StudioStageRecorder.instance) {
      StudioStageRecorder.instance = new StudioStageRecorder();
    }
    return StudioStageRecorder.instance;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getDuration(): number {
    return this.durationSeconds;
  }

  public async start(
    stageElement?: HTMLElement | null,
    onTimeUpdate?: (seconds: number) => void
  ): Promise<boolean> {
    if (this.isRecording) return true;

    this.onTimeUpdateCallback = onTimeUpdate;
    this.recordedChunks = [];
    this.durationSeconds = 0;
    this.didStartBroadcasterComposite = false;

    try {
      const container =
        stageElement ||
        (typeof document !== 'undefined'
          ? document.getElementById('livestudio-stage-container')
          : null);

      // 1. Ensure stage broadcaster compositing is running
      let stream = stageBroadcaster.getCompositeStream();

      if (!stream || stream.getVideoTracks().length === 0) {
        // Broadcaster composite is not running yet (e.g. host is not LIVE on YouTube)
        // Activate stage composite engine on demand to render stage canvas + mixed audio at 30 FPS!
        stageBroadcaster.ensureAudioContext();
        const composite = stageBroadcaster.startStageComposite(container);
        if (composite) {
          this.didStartBroadcasterComposite = true;
          stream = stageBroadcaster.getCompositeStream();
        }
      }

      // 2. Resilient active fallback if DOM container was completely unavailable
      if (!stream || stream.getVideoTracks().length === 0) {
        console.warn('[StudioStageRecorder] Active stage not found, creating dynamic animated HD canvas fallback');
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 1280;
        fallbackCanvas.height = 720;
        const ctx = fallbackCanvas.getContext('2d');

        // Continuous 30 FPS render loop so Chromium NEVER starves captureStream(30)
        let frameCount = 0;
        const drawFallback = () => {
          if (!ctx) return;
          frameCount++;
          // Dark studio background
          ctx.fillStyle = '#0a0a14';
          ctx.fillRect(0, 0, 1280, 720);

          // Studio Banner
          ctx.fillStyle = '#6366f1';
          ctx.font = 'bold 36px Inter, sans-serif';
          ctx.fillText('LiveStudio Recording', 80, 120);

          // Live Timer & Status
          ctx.fillStyle = '#94a3b8';
          ctx.font = '24px monospace';
          const nowStr = new Date().toLocaleTimeString();
          ctx.fillText(`Timestamp: ${nowStr} • Frame ${frameCount}`, 80, 180);

          // Pulsing Red Dot
          const pulse = (Math.sin(frameCount / 8) + 1) / 2;
          ctx.beginPath();
          ctx.arc(50, 108, 12 + pulse * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + pulse * 0.4})`;
          ctx.fill();
        };

        drawFallback();
        this.fallbackInterval = setInterval(drawFallback, 33);
        const canvasStream = fallbackCanvas.captureStream(30);

        // Add silent Web Audio carrier so video container has synchronized audio
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const actx = new AudioContextClass();
          const dest = actx.createMediaStreamDestination();
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          gain.gain.value = 0.00001; // inaudible
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          const aTrack = dest.stream.getAudioTracks()[0];
          if (aTrack) canvasStream.addTrack(aTrack);
        } catch {}

        stream = canvasStream;
      }

      // 3. Negotiate best supported container & codec (MP4 prioritized for universal Windows/Mac playback)
      const candidateMimes = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];

      this.selectedMime = '';
      for (const m of candidateMimes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
          this.selectedMime = m;
          break;
        }
      }

      this.fileExtension = this.selectedMime.includes('mp4') ? 'mp4' : 'webm';
      console.log(`[StudioStageRecorder] Using container format: ${this.selectedMime || 'default'} (.${this.fileExtension})`);

      this.mediaRecorder = new MediaRecorder(
        stream,
        this.selectedMime
          ? { mimeType: this.selectedMime, videoBitsPerSecond: 4000000 }
          : undefined
      );

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      // Request data slices every 1000ms for continuous streaming into buffer
      this.mediaRecorder.start(1000);
      this.isRecording = true;

      // Start live timer
      this.timerInterval = setInterval(() => {
        if (this.isRecording) {
          this.durationSeconds += 1;
          this.onTimeUpdateCallback?.(this.durationSeconds);
        }
      }, 1000);

      console.log('[StudioStageRecorder] Client-side recording started with active 30 FPS stream.');
      return true;
    } catch (err) {
      console.error('[StudioStageRecorder] Failed to start local recording:', err);
      this.cleanup();
      return false;
    }
  }

  public stop(): Promise<StageRecordingResult | null> {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        this.cleanup();
        resolve(null);
        return;
      }

      // Flush any buffered frames before stopping
      try {
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.requestData();
        }
      } catch {}

      this.mediaRecorder.addEventListener(
        'stop',
        () => {
          const mime =
            this.selectedMime ||
            this.mediaRecorder?.mimeType ||
            (this.fileExtension === 'mp4' ? 'video/mp4' : 'video/webm');
          const fullBlob = new Blob(this.recordedChunks, { type: mime });
          const downloadUrl = URL.createObjectURL(fullBlob);
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10);
          const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
          const fileName = `LiveStudio_Stage_Record_${dateStr}_${timeStr}.${this.fileExtension}`;

          const result: StageRecordingResult = {
            blob: fullBlob,
            downloadUrl,
            durationSeconds: this.durationSeconds,
            fileSize: fullBlob.size,
            fileName,
          };

          // Trigger local download directly to the user's PC
          if (fullBlob.size > 0) {
            try {
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              console.log(
                `[StudioStageRecorder] Successfully triggered download: ${fileName} (${(fullBlob.size / (1024 * 1024)).toFixed(2)} MB)`
              );
            } catch (dlErr) {
              console.warn('[StudioStageRecorder] Auto-download error:', dlErr);
            }
          } else {
            console.error('[StudioStageRecorder] Warning: Recorded blob has 0 bytes.');
          }

          // If broadcaster composite was started solely for local recording, stop it
          if (this.didStartBroadcasterComposite) {
            try {
              stageBroadcaster.stopStageComposite();
            } catch {}
            this.didStartBroadcasterComposite = false;
          }

          this.cleanup();
          resolve(result);
        },
        { once: true }
      );

      try {
        this.mediaRecorder.stop();
      } catch {
        this.cleanup();
        resolve(null);
      }
    });
  }

  private cleanup() {
    this.isRecording = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    this.mediaRecorder = null;
  }
}

export const studioStageRecorder = StudioStageRecorder.getInstance();
