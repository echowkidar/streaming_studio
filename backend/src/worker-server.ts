import { transcodingWorker } from './workers/index';

console.log('Worker server starting...');

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await transcodingWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await transcodingWorker.close();
  process.exit(0);
});

console.log('Worker server is running');
