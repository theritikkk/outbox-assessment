import path from 'path';
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load .env from current directory and fallback to workspace root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),

  DATABASE_URL: z.string().default('postgresql://reachinbox:reachinbox@localhost:5433/reachinbox?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),

  SESSION_SECRET: z.string().default('dev-session-secret-change-in-production'),

  GOOGLE_CLIENT_ID: z.string().default('mock-google-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().default('mock-google-client-secret'),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/google/callback'),

  SLACK_CLIENT_ID: z.string().default(''),
  SLACK_CLIENT_SECRET: z.string().default(''),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:3001/api/slack/callback'),

  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),

  WORKER_CONCURRENCY: z.string().default('5'),
  DEFAULT_EMAIL_DELAY_SECONDS: z.string().default('2'),
  DEFAULT_HOURLY_LIMIT: z.string().default('200'),

  FRONTEND_URL: z.string().default('http://localhost:5173'),
  BACKEND_URL: z.string().default('http://localhost:3001'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.flatten().fieldErrors);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsedEnv.success ? parsedEnv.data : envSchema.parse({});
