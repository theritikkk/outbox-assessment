import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export const emailQueue = new Queue('email-send', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 172800 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const enqueueEmail = async (emailId: string, delayMs: number): Promise<void> => {
  const jobId = `email-${emailId}`;
  try {
    await emailQueue.add(
      'send',
      { emailId },
      {
        jobId,
        delay: Math.max(0, delayMs),
      }
    );
    logger.debug(`Enqueued email job ${jobId} with delay ${delayMs}ms`);
  } catch (error: any) {
    // BullMQ throws if jobId already exists — this is expected and safe (idempotent)
    if (error.message?.includes('Job already exists')) {
      logger.debug(`Job ${jobId} already exists, skipping (idempotent)`);
      return;
    }
    throw error;
  }
};
