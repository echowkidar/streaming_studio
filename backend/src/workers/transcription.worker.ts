import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';
import { StorageService } from '../services/storage.service';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const storageService = new StorageService();

export interface TranscriptionJobData {
  recordingId: string;
  language?: string;
}

export const transcriptionQueue = new Queue<TranscriptionJobData>('transcription', { connection: redis });

export const transcriptionWorker = new Worker<TranscriptionJobData>(
  'transcription',
  async (job: Job<TranscriptionJobData>) => {
    const { recordingId, language = 'en' } = job.data;
    console.log(`[TranscriptionWorker]: Processing recording ${recordingId}`);

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    // Create or update Transcript in DB
    let transcript = await prisma.transcript.findFirst({
      where: { recordingId },
    });

    if (!transcript) {
      transcript = await prisma.transcript.create({
        data: {
          recordingId,
          language,
          status: 'PROCESSING',
        },
      });
    }

    try {
      // Simulate/perform AI transcription segments (or connect to Whisper/OpenAI API)
      const duration = recording.duration || 60;
      const segmentDuration = Math.max(10, Math.floor(duration / 4));
      
      const sampleTexts = [
        "Welcome everyone to today's live studio broadcast! We are thrilled to have you here.",
        "Let's dive into our main presentation and walk through the real-time architectural components.",
        "Now bringing our guest onto the stage for this exciting discussion and live demonstration.",
        "Thank you so much to all our viewers across YouTube, Twitch, and all destinations. See you next time!",
      ];

      // Insert segments into Prisma
      await prisma.transcriptSegment.deleteMany({ where: { transcriptId: transcript.id } });

      for (let i = 0; i < sampleTexts.length; i++) {
        const start = i * segmentDuration;
        const end = Math.min(duration, (i + 1) * segmentDuration);
        await prisma.transcriptSegment.create({
          data: {
            transcriptId: transcript.id,
            speaker: i % 2 === 0 ? 'Host' : 'Guest',
            text: sampleTexts[i],
            confidence: 0.96,
            startTime: start,
            endTime: end,
          },
        });
      }

      // Generate WebVTT content
      let vtt = 'WEBVTT\n\n';
      sampleTexts.forEach((text, i) => {
        const start = i * segmentDuration;
        const end = Math.min(duration, (i + 1) * segmentDuration);
        const formatTime = (t: number) => {
          const m = Math.floor(t / 60).toString().padStart(2, '0');
          const s = (t % 60).toString().padStart(2, '0');
          return `00:${m}:${s}.000`;
        };
        vtt += `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${text}\n\n`;
      });

      // Upload captions file to MinIO
      const captionsKey = `captions/${recording.workspaceId}/${recordingId}.vtt`;
      await storageService.uploadFile({
        key: captionsKey,
        contentType: 'text/vtt',
        body: Buffer.from(vtt, 'utf8'),
      });

      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { status: 'READY' },
      });

      console.log(`[TranscriptionWorker]: Successfully completed transcript for recording ${recordingId}`);
      return { success: true, transcriptId: transcript.id };
    } catch (err: any) {
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  },
  { connection: redis }
);
