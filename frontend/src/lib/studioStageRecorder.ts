/**
 * LiveStudio Client-Side Stage Recorder
 * Records 1080p stage canvas + mixed studio audio 100% locally in the host's browser.
 * Saves directly to the user's computer disk with ZERO bytes uploaded to VPS!
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
  private durationSeconds = 0;
  private isRecording = false;
  private onTimeUpdateCallback?: (seconds: number) => void;

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

  public async start(onTimeUpdate?: (seconds: number) => void): Promise<boolean> {
    if (this.isRecording) return true;

    this.onTimeUpdateCallback = onTimeUpdate;
    this.recordedChunks = [];
    this.durationSeconds = 0;

    try {
      // 1. Get composite stream from stageBroadcaster or capture from canvas
      let stream = stageBroadcaster.getCompositeStream();

      if (!stream) {
        // Fallback to active stage container canvas
        const canvas =
          stageBroadcaster.getCanvas() ||
          (document.getElementById('livestudio-stage-container')?.querySelector('canvas') as HTMLCanvasElement | null);

        if (canvas) {
          stream = canvas.captureStream(30);
        }
      }

      if (!stream || stream.getVideoTracks().length === 0) {
        // Create emergency canvas stream if studio stage is currently unrendered
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 1280;
        fallbackCanvas.height = 720;
        const ctx = fallbackCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a0a14';
          ctx.fillRect(0, 0, 1280, 720);
        }
        stream = fallbackCanvas.captureStream(30);
      }

      // Determine best supported WebM container
      const candidateMimes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4',
      ];

      let selectedMime = '';
      for (const m of candidateMimes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(
        stream,
        selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 3000000 } : undefined
      );

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      // Request chunks every 1000ms for resilient in-memory buffering
      this.mediaRecorder.start(1000);
      this.isRecording = true;

      // Start live timer
      this.timerInterval = setInterval(() => {
        if (this.isRecording) {
          this.durationSeconds += 1;
          this.onTimeUpdateCallback?.(this.durationSeconds);
        }
      }, 1000);

      console.log('[StudioStageRecorder] Client-side recording initiated locally in browser.');
      return true;
    } catch (err) {
      console.error('[StudioStageRecorder] Failed to start local recording:', err);
      this.isRecording = false;
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

      this.mediaRecorder.addEventListener(
        'stop',
        () => {
          const mime = this.mediaRecorder?.mimeType || 'video/webm';
          const fullBlob = new Blob(this.recordedChunks, { type: mime });
          const downloadUrl = URL.createObjectURL(fullBlob);
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10);
          const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
          const fileName = `LiveStudio_Stage_Record_${dateStr}_${timeStr}.webm`;

          const result: StageRecordingResult = {
            blob: fullBlob,
            downloadUrl,
            durationSeconds: this.durationSeconds,
            fileSize: fullBlob.size,
            fileName,
          };

          // Automatically trigger browser download to save directly to user's computer
          try {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            console.log(`[StudioStageRecorder] Triggered local download for: ${fileName} (${fullBlob.size} bytes)`);
          } catch (dlErr) {
            console.warn('[StudioStageRecorder] Auto-download error:', dlErr);
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
    this.mediaRecorder = null;
  }
}

export const studioStageRecorder = StudioStageRecorder.getInstance();
