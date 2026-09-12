import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const transcodingQueue = new Queue('transcoding', { connection: redis });
export const recordingQueue = new Queue('recording', { connection: redis });

const transcodingJobSchema = z.object({
  streamId: z.string(),
  resolution: z.string(),
});

type TranscodingJobData = z.infer<typeof transcodingJobSchema>;

export const transcodingWorker = new Worker<TranscodingJobData>(
  'transcoding',
  async (job: Job<TranscodingJobData>) => {
    try {
      const data = transcodingJobSchema.parse(job.data);
      console.log(`Processing transcoding for stream ${data.streamId} at ${data.resolution}`);
      
      // Implementation logic goes here
      
      return { success: true, data: { status: 'completed' } };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Transcoding job failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  },
  { connection: redis }
);

transcodingWorker.on('failed', (job: Job<TranscodingJobData> | undefined, err: Error) => {
  if (job) {
    console.error(`Job ${job.id} failed with ${err.message}`);
  } else {
    console.error(`Job failed with ${err.message}`);
  }
});

export * from './transcription.worker';
export * from './ai-clip.worker';

