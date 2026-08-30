import { Router } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { esClient } from '../config/elasticsearch';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    await esClient.ping();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
