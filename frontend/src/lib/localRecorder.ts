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
  fileName?: string;
  fileExtension?: string;
  startTime: Date | null;
}

export class LocalParticipantRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: Date | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private animInterval: NodeJS.Timeout | null = null;
  private onUpdateCallback?: (track: LocalRecordingTrack) => void;
  private selectedMime = "";
  private fileExtension = "mp4";

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
      fileName: undefined,
      fileExtension: "mp4",
      startTime: null,
    };
  }

  public async start(stream?: MediaStream) {
    this.recordedChunks = [];
    this.startTime = new Date();
    this.trackInfo.startTime = this.startTime;
    this.trackInfo.status = "RECORDING";
    this.trackInfo.durationSeconds = 0;
    this.trackInfo.blobSize = 0;
    this.trackInfo.downloadUrl = null;

    let activeStream = stream;

    // Check existing tracks in passed stream
    let hasVideo = activeStream ? activeStream.getVideoTracks().some((t) => t.readyState === "live") : false;
    let hasAudio = activeStream ? activeStream.getAudioTracks().some((t) => t.readyState === "live") : false;

    // Fallback: If no stream was passed, check navigator.mediaDevices
    if (!activeStream || (!hasVideo && !hasAudio)) {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          const userMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
          if (userMedia) {
            activeStream = userMedia;
            hasVideo = activeStream.getVideoTracks().some((t) => t.readyState === "live");
            hasAudio = activeStream.getAudioTracks().some((t) => t.readyState === "live");
          }
        }
      } catch (e) {
        console.warn("[LocalRecorder] Could not access mediaDevices fallback:", e);
      }
    }

    // Dynamic 30 FPS Avatar Canvas: If camera is off or unavailable, produce an active video track
    // with participant name and animated audio indicator so Chromium NEVER starves captureStream(30)!
    if (!hasVideo) {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      const name = this.trackInfo.participantName || "Participant";
      const initial = (name[0] || "P").toUpperCase();

      let frameCount = 0;
      const renderAvatarFrame = () => {
        if (!ctx) return;
        frameCount++;
        // Dark studio background
        ctx.fillStyle = "#0c0d17";
        ctx.fillRect(0, 0, 1280, 720);

        // Center card container
        ctx.fillStyle = "#161726";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(440, 180, 400, 360, 24) : ctx.rect(440, 180, 400, 360);
        ctx.fill();

        // Pulsing Avatar circle
        const pulse = (Math.sin(frameCount / 10) + 1) / 2;
        ctx.beginPath();
        ctx.arc(640, 310, 70 + pulse * 6, 0, Math.PI * 2);
        ctx.fillStyle = "#6366f1";
        ctx.fill();

        // Initial letter
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 64px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initial, 640, 312);

        // Participant Name
        ctx.font = "bold 26px Inter, sans-serif";
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(name, 640, 430);

        // ISO Audio Track Label
        ctx.font = "16px monospace";
        ctx.fillStyle = "#10b981";
        ctx.fillText("● ISO Track Live", 640, 470);
      };

      renderAvatarFrame();
      this.animInterval = setInterval(renderAvatarFrame, 33);
      const canvasStream = canvas.captureStream(30);
      const synthVideoTrack = canvasStream.getVideoTracks()[0];

      if (activeStream) {
        if (synthVideoTrack) activeStream.addTrack(synthVideoTrack);
      } else {
        activeStream = canvasStream;
      }
    }

    // Ensure audio track exists (add silent carrier if participant was audio-muted)
    if (!hasAudio && activeStream) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = new AudioContextClass();
        const dest = actx.createMediaStreamDestination();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        gain.gain.value = 0.00001; // inaudible carrier
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        const silentAudioTrack = dest.stream.getAudioTracks()[0];
        if (silentAudioTrack) activeStream.addTrack(silentAudioTrack);
      } catch (e) {
        console.warn("[LocalRecorder] Silent audio carrier init warning:", e);
      }
    }

    // Negotiate best supported container & codec (MP4 prioritized for universal Windows/Mac compatibility)
    const candidateMimes = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4;codecs=avc1",
      "video/mp4",
      "video/webm;codecs=h264,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    this.selectedMime = "";
    for (const m of candidateMimes) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
        this.selectedMime = m;
        break;
      }
    }

    this.fileExtension = this.selectedMime.includes("mp4") ? "mp4" : "webm";
    this.trackInfo.fileExtension = this.fileExtension;

    const cleanName = this.trackInfo.participantName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;
    this.trackInfo.fileName = `${cleanName}_ISO_${dateStr}_${timeStr}.${this.fileExtension}`;

    try {
      this.mediaRecorder = new MediaRecorder(
        activeStream!,
        this.selectedMime ? { mimeType: this.selectedMime, videoBitsPerSecond: 3500000 } : undefined
      );

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.trackInfo.blobSize += event.data.size;
          this.notify();
        }
      };

      this.mediaRecorder.onstop = () => {
        const fullBlob = new Blob(this.recordedChunks, {
          type: this.selectedMime || (this.fileExtension === "mp4" ? "video/mp4" : "video/webm"),
        });
        this.trackInfo.blobSize = fullBlob.size;
        this.trackInfo.downloadUrl = URL.createObjectURL(fullBlob);
        this.trackInfo.status = "STOPPED";
        this.notify();
      };

      // Request slices every 1000ms
      this.mediaRecorder.start(1000);

      // Duration counter
      this.timerInterval = setInterval(() => {
        if (this.trackInfo.status === "RECORDING") {
          this.trackInfo.durationSeconds += 1;
          this.notify();
        }
      }, 1000);

      this.notify();
      console.log(`[LocalRecorder] Started ISO recording for ${this.trackInfo.participantName} (${this.fileExtension})`);
    } catch (err) {
      console.error("[LocalRecorder] Failed to start MediaRecorder:", err);
      this.cleanup();
      this.trackInfo.status = "STOPPED";
      this.notify();
    }
  }

  public stop(): Promise<string | null> {
    return new Promise((resolve) => {
      this.cleanup();

      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        try {
          if (this.mediaRecorder.state === "recording") {
            this.mediaRecorder.requestData();
          }
        } catch {}

        this.mediaRecorder.addEventListener(
          "stop",
          () => {
            resolve(this.trackInfo.downloadUrl);
          },
          { once: true }
        );
        this.mediaRecorder.stop();
      } else {
        this.trackInfo.status = "STOPPED";
        this.notify();
        resolve(this.trackInfo.downloadUrl);
      }
    });
  }

  private cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
  }

  private notify() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback({ ...this.trackInfo });
    }
  }
}

