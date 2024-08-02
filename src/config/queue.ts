// src/config/queue.ts
import Queue from 'bull';
import processFile from '../worker/importWorker'; // Correct import path

const importQueue = new Queue('importQueue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});

importQueue.process(processFile);

export default importQueue;
