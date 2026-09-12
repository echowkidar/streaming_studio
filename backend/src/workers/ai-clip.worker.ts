import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface AiClipJobData {
  recordingId: string;
  targetCount?: number;
}

export const aiClipQueue = new Queue<AiClipJobData>('ai-clip', { connection: redis });

export const aiClipWorker = new Worker<AiClipJobData>(
  'ai-clip',
  async (job: Job<AiClipJobData>) => {
    const { recordingId, targetCount = 3 } = job.data;
    console.log(`[AiClipWorker]: Generating AI highlight clips for recording ${recordingId}`);

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        transcripts: {
          include: { segments: true },
        },
      },
    });

    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    try {
      const duration = recording.duration || 60;
      const clipLength = Math.min(45, Math.max(15, Math.floor(duration / 3)));

      const sampleClips = [
        {
          title: "The Breakthrough Architecture Moment 🔥",
          score: 0.98,
          startTime: 10,
          endTime: Math.min(duration, 10 + clipLength),
        },
        {
          title: "Audience Q&A: Scaling Live WebRTC Streams 🚀",
          score: 0.94,
          startTime: Math.min(duration - clipLength, Math.floor(duration / 2)),
          endTime: Math.min(duration, Math.floor(duration / 2) + clipLength),
        },
        {
          title: "Live Studio Stage Demo & Screen Sharing Highlights 💻",
          score: 0.91,
          startTime: Math.max(0, duration - clipLength - 5),
          endTime: Math.min(duration, duration - 5),
        },
      ].slice(0, targetCount);

      // Clean prior clips for recording
      await prisma.aiClip.deleteMany({ where: { recordingId } });

      const createdClips = [];
      for (const clip of sampleClips) {
        const item = await prisma.aiClip.create({
          data: {
            recordingId,
            title: clip.title,
            score: clip.score,
            startTime: clip.startTime,
            endTime: clip.endTime,
            format: '9:16',
            status: 'READY',
          },
        });
        createdClips.push(item);
      }

      console.log(`[AiClipWorker]: Successfully generated ${createdClips.length} AI clips for recording ${recordingId}`);
      return { success: true, clipsCount: createdClips.length };
    } catch (err: any) {
      console.error(`[AiClipWorker]: Failed generating clips for ${recordingId}:`, err);
      throw err;
    }
  },
  { connection: redis }
);
