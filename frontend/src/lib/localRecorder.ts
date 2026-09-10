// ─── Local ISO Recording Engine (Phase 2 - Section 35 & 36) ───────────────────
export interface LocalRecordingTrack {
  id: string;
  participantId: string;
  participantName: string;
  trackType: "VIDEO_AUDIO" | "AUDIO_ONLY";
  status: "IDLE" | "RECORDING" | "PAUSED" | "STOPPED";
  durationSeconds: number;
  blobSize: number;
  downloadUrl: string | null;
  startTime: Date | null;
}

export class LocalParticipantRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: Date | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private onUpdateCallback?: (track: LocalRecordingTrack) => void;

  public trackInfo: LocalRecordingTrack;

  constructor(participantId: string, participantName: string, onUpdate?: (t: LocalRecordingTrack) => void) {
    this.onUpdateCallback = onUpdate;
    this.trackInfo = {
      id: `iso-${participantId}-${Date.now()}`,
      participantId,
      participantName,
      trackType: "VIDEO_AUDIO",
      status: "IDLE",
      durationSeconds: 0,
      blobSize: 0,
      downloadUrl: null,
      startTime: null,
    };
  }

  public async start(stream?: MediaStream) {
    this.recordedChunks = [];
    this.startTime = new Date();
    this.trackInfo.startTime = this.startTime;
    this.trackInfo.status = "RECORDING";
    this.trackInfo.durationSeconds = 0;

    // Use passed stream, or get user webcam/mic, or generate synthetic canvas stream
    let activeStream = stream;
    if (!activeStream) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => undefined);
        }
      } catch (e) {
        console.warn("Could not access mediaDevices for local recording:", e);
      }
    }

    if (!activeStream) {
      // Create synthetic canvas stream so local recording works even without camera permissions
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#12121a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      activeStream = canvas.captureStream(30);
    }

    // Determine supported mimeType
    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    let selectedMime = "";
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(activeStream, selectedMime ? { mimeType: selectedMime } : undefined);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.trackInfo.blobSize += event.data.size;
          this.notify();
        }
      };

      this.mediaRecorder.onstop = () => {
        const fullBlob = new Blob(this.recordedChunks, { type: selectedMime || "video/webm" });
        this.trackInfo.blobSize = fullBlob.size;
        this.trackInfo.downloadUrl = URL.createObjectURL(fullBlob);
        this.trackInfo.status = "STOPPED";
        this.notify();
      };

      // Request chunks every 2 seconds for continuous buffering resilience
      this.mediaRecorder.start(2000);

      // Duration counter
      this.timerInterval = setInterval(() => {
        if (this.trackInfo.status === "RECORDING") {
          this.trackInfo.durationSeconds += 1;
          this.notify();
        }
      }, 1000);

      this.notify();
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      this.trackInfo.status = "STOPPED";
      this.notify();
    }
  }

  public stop(): Promise<string | null> {
    return new Promise((resolve) => {
      if (this.timerInterval) clearInterval(this.timerInterval);

      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.addEventListener("stop", () => {
          resolve(this.trackInfo.downloadUrl);
        }, { once: true });
        this.mediaRecorder.stop();
      } else {
        this.trackInfo.status = "STOPPED";
        this.notify();
        resolve(this.trackInfo.downloadUrl);
      }
    });
  }

  private notify() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback({ ...this.trackInfo });
    }
  }
}
