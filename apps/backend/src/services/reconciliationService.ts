import { prisma } from '../config/database';
import { enqueueEmail } from '../queues/emailQueue';
import { logger } from '../utils/logger';

export const runReconciliation = async () => {
  logger.info('Running email reconciliation...');
  
  try {
    const emails = await prisma.email.findMany({
      where: {
        status: { in: ['PENDING', 'QUEUED', 'RATE_LIMITED'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    let count = 0;
    const nowMs = Date.now();

    for (const email of emails) {
      const delayMs = Math.max(0, email.scheduledAt.getTime() - nowMs);
      await enqueueEmail(email.id, delayMs);
      count++;
    }

    logger.info(`Reconciliation complete. Enqueued ${count} jobs.`);
  } catch (error: any) {
    logger.error('Error during reconciliation', { error: error.message });
  }
};
