import * as dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { ensureEmailIndex } from './integrations/elasticsearch/emailIndex';

const startServer = async () => {
  try {
    await ensureEmailIndex();
    
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const shutdown = () => {
      logger.info('Shutting down server...');
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
