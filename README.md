# ReachInbox Email Scheduler

A production-grade full-stack email scheduling system demonstrating outbound email infrastructure for ReachInbox.ai.

## Overview

This application allows authenticated users to compose, schedule, and send emails at configurable rates with robust reliability guarantees. It uses BullMQ delayed jobs for scheduling (not cron), Redis for distributed rate limiting, PostgreSQL as the source of truth, and Elasticsearch for full-text search.

## Features

- **Google OAuth** — Real authentication with user profiles
- **Email Campaigns** — Compose emails to CSV-uploaded recipient lists
- **Delayed Scheduling** — BullMQ delayed jobs fire at the exact scheduled time
- **Configurable Delay** — Set delay between individual emails (seconds)
- **Hourly Rate Limiting** — Redis atomic counter limits sends per sender per hour
- **Automatic Rescheduling** — Rate-limited emails are deferred to the next window
- **Restart Persistence** — Jobs survive backend/worker/Redis restarts
- **Idempotency** — Duplicate sends are prevented through DB state checks
- **Ethereal SMTP** — Real email sending with preview URLs
- **Elasticsearch Search** — Full-text search across emails
- **Slack Notifications** — Real OAuth + rate-limit alerts via Slack API
- **BullMQ Dashboard** — Live job monitoring via Bull Board
- **Concurrent Workers** — Configurable worker concurrency
- **CSV Upload** — File upload with validation and deduplication

## Architecture

```
┌─────────────┐     ┌─────────────────────────────────────┐
│   Frontend  │────▶│          Express API Server         │
│  React+Vite │     │  Auth · Routes · Controllers · Svc  │
└─────────────┘     └──────────┬──────────────┬───────────┘
                               │              │
                    ┌──────────▼──┐    ┌──────▼───────┐
                    │  PostgreSQL │    │    Redis     │
                    │  (Source of │    │  (BullMQ +   │
                    │    Truth)   │    │  Rate Limit  │
                    └─────────────┘    │  + Sessions) │
                                       └──────┬───────┘
                                              │
                               ┌──────────────▼────────────────┐
                               │      BullMQ Email Worker      │
                               │  Concurrent · Idempotent      │
                               │  Rate-Limited · Resilient     │
                               └──┬───────┬────────┬──────┬────┘
                                  │       │        │      │
                            ┌─────▼──┐ ┌──▼──┐ ┌───▼──┐ ┌─▼────┐
                            │Ethereal│ │ ES  │ │Slack │ │  DB  │
                            │ SMTP   │ │Index│ │Notify│ │Update│
                            └────────┘ └─────┘ └──────┘ └──────┘
```

### Data Flow

1. User creates a campaign via the Compose UI
2. API validates inputs, creates campaign + email records in PostgreSQL
3. Each email gets a BullMQ delayed job with `delay = scheduledAt - now`
4. When delay expires, BullMQ makes the job available
5. Worker picks up job, checks DB status (idempotency), checks rate limit
6. If allowed: sends via Ethereal SMTP, updates DB, indexes in ES
7. If rate-limited: reschedules to next hour window, notifies Slack

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15 |
| Queue | BullMQ + Redis 7 |
| Search | Elasticsearch 8.12 |
| Auth | Passport.js + Google OAuth 2.0 |
| Email | Nodemailer + Ethereal SMTP |
| Slack | @slack/web-api + OAuth v2 |
| Dashboard | @bull-board/express |
| Validation | Zod |

## Project Structure

```
outbox-assessment/
├── apps/
│   ├── backend/
│   │   ├── prisma/schema.prisma     # Database schema
│   │   ├── src/
│   │   │   ├── config/              # env, redis, database, elasticsearch
│   │   │   ├── controllers/         # HTTP request handlers
│   │   │   ├── routes/              # Express route definitions
│   │   │   ├── middleware/          # auth, error, validation
│   │   │   ├── services/            # Business logic
│   │   │   ├── workers/             # BullMQ worker processor
│   │   │   ├── queues/              # Queue definitions
│   │   │   ├── integrations/        # SMTP, Google, Slack, ES
│   │   │   ├── utils/               # Logger
│   │   │   ├── app.ts               # Express app
│   │   │   ├── server.ts            # API entry point
│   │   │   └── worker.ts            # Worker entry point
│   │   └── tests/
│   └── frontend/
│       └── src/
│           ├── components/          # Reusable UI components
│           ├── pages/               # Route pages
│           ├── layouts/             # Dashboard layout
│           ├── hooks/               # useAuth
│           ├── services/            # API client
│           └── types/               # TypeScript types
├── packages/shared/                 # Shared types/constants
├── docker-compose.yml               # PostgreSQL, Redis, ES
├── .env.example                     # Environment template
└── README.md
```

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose
- Google Cloud Console project (for OAuth)
- Slack App (for notifications) — optional for basic testing
- Ethereal email account

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Key variables to configure:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SMTP_USER` | Ethereal email username |
| `SMTP_PASSWORD` | Ethereal email password |
| `SLACK_CLIENT_ID` | Slack app client ID (optional) |
| `SLACK_CLIENT_SECRET` | Slack app client secret (optional) |
| `WORKER_CONCURRENCY` | Number of concurrent worker threads (default: 5) |

## Running Infrastructure

```bash
# Start PostgreSQL, Redis, and Elasticsearch
docker compose up -d

# Verify all services are running
docker compose ps
```

Wait for Elasticsearch to become healthy (takes ~30 seconds):
```bash
curl http://localhost:9200/_cluster/health
```

## Running Backend

```bash
# Install dependencies (from project root)
pnpm install

# Generate Prisma client
cd apps/backend && npx prisma generate

# Run database migrations
npx prisma db push

# Start the API server
cd ../.. && pnpm dev:backend
```

The API server starts at `http://localhost:3001`.

## Running Worker

**In a separate terminal:**

```bash
pnpm dev:worker
```

The worker connects to Redis and starts processing email jobs.

## Running Frontend

**In a separate terminal:**

```bash
pnpm dev:frontend
```

The frontend starts at `http://localhost:5173` and proxies API requests to the backend.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
4. Application type: "Web application"
5. Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## Slack OAuth Setup

1. Go to [Slack API](https://api.slack.com/apps) → "Create New App"
2. Choose "From scratch", name it, select workspace
3. Under "OAuth & Permissions":
   - Add Bot Token Scopes: `chat:write`, `chat:write.public`, `channels:read`
   - Add Redirect URL: `http://localhost:3001/api/slack/callback`
4. Under "Basic Information", copy Client ID and Client Secret to `.env`
5. Install the app to your workspace

## Ethereal SMTP Setup

1. Go to [Ethereal](https://ethereal.email/create)
2. Click "Create Ethereal Account"
3. Copy the SMTP credentials to `.env`:
   ```
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_USER=your.username@ethereal.email
   SMTP_PASSWORD=your-password
   ```
4. View sent emails at [Ethereal Messages](https://ethereal.email/messages)

## Elasticsearch Setup

Elasticsearch runs in Docker (single-node, security disabled for local dev).

The `emails` index is automatically created when the server starts.

Verify:
```bash
curl http://localhost:9200/emails/_mapping
```

## BullMQ Dashboard

Available at: `http://localhost:3001/admin/queues`

Shows:
- **Waiting** — Jobs waiting to be processed
- **Active** — Jobs currently being processed
- **Delayed** — Jobs scheduled for future execution
- **Completed** — Successfully processed jobs
- **Failed** — Jobs that failed (with error details)

## API Documentation

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user + sender accounts |
| POST | `/api/auth/logout` | Logout |

### Campaigns
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/campaigns` | Create campaign with recipients |
| GET | `/api/campaigns` | List user's campaigns |

### Emails
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/emails/scheduled` | List scheduled emails |
| GET | `/api/emails/sent` | List sent emails |
| GET | `/api/emails/search?q=term` | Search emails via ES |
| GET | `/api/emails/:id` | Get email detail |
| POST | `/api/emails/upload-csv` | Upload CSV recipient file |

### Slack
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/slack/connect` | Initiate Slack OAuth |
| GET | `/api/slack/callback` | Slack OAuth callback |
| POST | `/api/slack/disconnect` | Disconnect Slack |
| GET | `/api/slack/status` | Get connection status |

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Basic health check |
| GET | `/ready` | Readiness check (DB + Redis + ES) |

## Scheduling Architecture

### Why BullMQ (Not Cron)?

Cron runs on a fixed schedule (e.g., every minute) and polls for work. BullMQ delayed jobs are event-driven — each job fires at exactly its scheduled time without polling. This is more efficient and precise.

### How Delayed Jobs Work

```
Email Record Created in PostgreSQL
        │
        ▼
BullMQ Job Created with:
  - jobId: "email:{emailId}"     ← idempotent
  - delay: scheduledAt - now()   ← fires at exact time
  - data: { emailId }            ← DB is source of truth
        │
        ▼
Redis Sorted Set (ZSET)
  Score = timestamp when job becomes active
        │
        ▼ (when delay expires)
Worker picks up job
  → Loads email from PostgreSQL
  → Checks status (idempotency)
  → Checks rate limit (Redis)
  → Sends via SMTP
  → Updates PostgreSQL
  → Indexes Elasticsearch
```

## Persistence / Restart Behavior

### Backend Restart
- No impact on scheduled jobs. They live in Redis.
- Sessions are stored in Redis, so users remain logged in.

### Worker Restart
1. BullMQ jobs remain in Redis sorted sets.
2. Active jobs at crash time: BullMQ's stalled job detection moves them back to waiting (after `stalledInterval` of 30s).
3. On startup: reconciliation service scans PostgreSQL for PENDING/QUEUED emails and re-enqueues any that are missing from BullMQ (using idempotent jobIds — duplicates are safely rejected).

### Redis Restart
- If Redis has AOF persistence (configured in docker-compose: `--appendonly yes`), jobs survive.
- If Redis loses data: reconciliation service re-enqueues from PostgreSQL on next worker start.

**PostgreSQL is always the source of truth.** The worker loads the email record fresh from PostgreSQL before every send.

## Idempotency

### Strategy

1. **Unique jobId**: `email:{emailId}` prevents duplicate BullMQ job creation
2. **DB status check**: Worker checks `email.status === 'SENT'` before sending — skips if already sent
3. **Status transition**: Email goes PENDING → SENDING → SENT. The SENDING state prevents concurrent processing.

### Honest Limitation

There is an unavoidable distributed systems gap:

```
SMTP Send Succeeds
        │
   ─── CRASH HERE ───
        │
DB Update to SENT never happens
        │
BullMQ retries the job
        │
Worker sees status = SENDING (not SENT)
        │
Email may be sent again
```

**We cannot atomically commit to both an external SMTP server and PostgreSQL.** This is a fundamental distributed systems limitation.

**Practical mitigation**: The window is very small (milliseconds between SMTP success and DB commit). For a true exactly-once guarantee, you would need SMTP-level deduplication (e.g., provider-specific idempotency keys), which is beyond this assessment's scope.

**We do NOT falsely claim exactly-once delivery.**

## Concurrency

Worker concurrency is configurable via `WORKER_CONCURRENCY` environment variable (default: 5).

Multiple jobs run concurrently within a single worker process. BullMQ uses Redis distributed locks to ensure each job is processed by exactly one worker, even across multiple processes.

Rate limit state is shared via Redis atomic operations (Lua script), so multiple concurrent workers safely share the same rate limit counter.

## Rate Limiting

### Implementation

Uses a Redis Lua script for atomic check-and-increment:

```lua
-- Key: rate-limit:{senderId}:{hourWindow}
local current = redis.call('get', KEYS[1])
if current and tonumber(current) >= tonumber(ARGV[1]) then
  return {0, tonumber(current)}  -- Blocked
end
current = redis.call('incr', KEYS[1])
if tonumber(current) == 1 then
  redis.call('expire', KEYS[1], ARGV[2])
end
return {1, tonumber(current)}  -- Allowed
```

### Behavior

- Hour window = `Math.floor(Date.now() / 3600000)`
- Counter key has TTL of 2 hours (covers the window + cleanup)
- When limit is reached:
  1. Email status → RATE_LIMITED
  2. Find next available hour window
  3. Create new delayed job targeting that window
  4. Send Slack notification (if connected)
- **Jobs are never dropped or permanently failed due to rate limiting**

### Example

With `hourlyLimit = 100`:
- Emails 1-100: Sent in hour 0
- Emails 101-200: Automatically rescheduled to hour 1
- Emails 201-300: Automatically rescheduled to hour 2

## Slack Notifications

Real Slack OAuth flow:

1. User clicks "Connect Slack" in the sidebar
2. Backend redirects to Slack authorization URL
3. User authorizes the app in their Slack workspace
4. Slack redirects back with auth code
5. Backend exchanges code for bot token
6. Token stored in `SlackConnection` table

When rate limit is hit, the worker sends a Slack message:

> ⚠️ **Rate Limit Reached** ⚠️
> Your sender account `user@ethereal.email` has hit its hourly limit of 200 emails. Sent so far: 200. Further emails have been queued for the next window.

If Slack is not connected, the worker simply skips the notification. If the Slack API fails, it logs the error and continues — Slack failures never affect email delivery.

## Elasticsearch

Emails are indexed in Elasticsearch when they are sent. The index supports full-text search across:
- Recipient (boosted 2x)
- Subject (boosted 1.5x)
- Body

Search uses `multi_match` with `fuzziness: AUTO` for typo tolerance.

**ES failure tolerance**: If Elasticsearch is down when an email is sent, the email is still marked as SENT in PostgreSQL. ES indexing is fire-and-forget — failures are logged but never cause re-sending.

## 1000+ Email Scenario

With `hourlyLimit=100`, `delayBetweenEmails=2s`, `WORKER_CONCURRENCY=5`:

1. Campaign created with 1000 recipients
2. 1000 email records created in PostgreSQL
3. 1000 BullMQ delayed jobs created (staggered by 2s each)
4. First 100 emails: processed within hour 0
5. Emails 101-200: Rate-limited → rescheduled to hour 1
6. This continues until all 1000 emails are sent across ~10 hours
7. Workers process 5 jobs concurrently
8. Redis rate counter ensures no sender exceeds the hourly limit
9. BullMQ's sorted set efficiently manages delayed jobs

BullMQ handles delayed jobs in O(log N) via Redis sorted sets, so 1000+ jobs are not a problem.

## Testing

```bash
# Run all tests
pnpm test:backend

# Run tests in watch mode
cd apps/backend && pnpm test:watch
```

Tests cover:
- Rate limiter logic
- CSV parsing and validation
- Campaign validation schemas
- Worker idempotency
- Worker failure handling
- Auth middleware
- Search service

## Demo Instructions

See [DEMO.md](./DEMO.md) for step-by-step demo instructions.

Quick start:
```bash
# 1. Start infrastructure
docker compose up -d

# 2. Copy and configure .env
cp .env.example .env
# Edit .env with your credentials

# 3. Install and setup
pnpm install
cd apps/backend && npx prisma generate && npx prisma db push && cd ../..

# 4. Start all services (3 terminals)
pnpm dev:backend    # Terminal 1
pnpm dev:worker     # Terminal 2
pnpm dev:frontend   # Terminal 3

# 5. Open http://localhost:5173
```

## Assumptions and Trade-offs

### Assumptions
- Single Ethereal SMTP account shared across all users (for demo simplicity)
- SenderAccount is auto-created on Google OAuth login using env SMTP credentials
- Slack notifications go to the channel where the bot was installed
- Elasticsearch runs in single-node mode without security

### Trade-offs
- **Idempotency gap**: A tiny window exists where SMTP succeeds but DB update crashes, potentially causing a duplicate send. Documented honestly above.
- **Rate limit precision**: The hourly window is based on clock-aligned hours (0:00-0:59, 1:00-1:59), not sliding windows. This is simpler and sufficient for the use case.
- **No email attachments**: The compose form supports text/HTML body but not file attachments.
- **No real-time updates**: The frontend polls for updates rather than using WebSockets.
- **Session-based auth**: Uses server-side sessions via Redis rather than JWTs. This is more secure for a traditional web app but doesn't support stateless scaling.

### Why Not Cron?
BullMQ delayed jobs are precise (fire at exact time), event-driven (no polling), and persistent (survive restarts). Cron-based approaches poll periodically, are less precise, and typically keep scheduling state in memory. The assignment explicitly prohibits cron.

### Why Redis for Rate Limiting?
In-memory counters would be lost on restart and can't be shared across multiple workers. Redis Lua scripts provide atomic check-and-increment that is safe under concurrent access from multiple workers.

### Why PostgreSQL as Source of Truth?
BullMQ/Redis is ephemeral by nature. If Redis loses data, we can reconstruct the job queue from PostgreSQL. The worker always loads the authoritative email state from PostgreSQL before processing, ensuring correctness even after data loss.
