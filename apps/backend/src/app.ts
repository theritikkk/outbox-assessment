import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { redis } from './config/redis';
import { emailQueue } from './queues/emailQueue';
import { errorHandler } from './middleware/errorHandler';

import './integrations/google/passport-google';

import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaign.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import healthRoutes from './routes/health.routes';

import path from 'path';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Session with Redis store
const RedisStore = require('connect-redis').default;
const redisStore = new RedisStore({
  client: redis,
  prefix: 'session:',
});

app.use(
  session({
    store: redisStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/', healthRoutes);

// Bull Board dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

// Serve frontend static build if available
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') || 
    req.path.startsWith('/admin') || 
    req.path === '/health' || 
    req.path === '/ready'
  ) {
    return next();
  }
  const indexPath = path.resolve(frontendDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Error handler (must be last)
app.use(errorHandler);

export { app };
