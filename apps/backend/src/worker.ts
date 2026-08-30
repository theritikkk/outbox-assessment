import { env } from './config/env';
import { logger } from './utils/logger';
import { runReconciliation } from './services/reconciliationService';
import { createEmailWorker } from './workers/emailWorker';

const startWorker = async () => {
  await runReconciliation();
  
  const concurrency = parseInt(env.WORKER_CONCURRENCY, 10) || 10;
  const worker = createEmailWorker(concurrency);
  
  logger.info(`Worker started with concurrency ${concurrency}`);

  const shutdown = async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startWorker().catch(err => {
  logger.error('Failed to start worker', { error: err.message });
  process.exit(1);
});
