import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://reachinbox:reachinbox@localhost:5432/reachinbox?schema=public',
      GOOGLE_CLIENT_ID: 'test-google-id',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
