# Demo Instructions

Step-by-step guide to demonstrate the ReachInbox Email Scheduler.

## Prerequisites

Ensure you have:
- Docker running
- `.env` file configured with Google OAuth and Ethereal SMTP credentials
- All services started (see below)

## Setup (One-Time)

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Wait for Elasticsearch (~30s)
curl http://localhost:9200/_cluster/health

# 3. Install dependencies
pnpm install

# 4. Generate Prisma client and push schema
cd apps/backend
npx prisma generate
npx prisma db push
cd ../..
```

## Start Services

Open 3 terminal windows:

**Terminal 1 — API Server:**
```bash
pnpm dev:backend
```
Expected: `Server running on port 3001`

**Terminal 2 — Worker:**
```bash
pnpm dev:worker
```
Expected: `Worker started with concurrency 5`

**Terminal 3 — Frontend:**
```bash
pnpm dev:frontend
```
Expected: `Local: http://localhost:5173/`

## Demo Flow

### 1. Login with Google OAuth
1. Open `http://localhost:5173`
2. Click "Login with Google"
3. Authenticate with your Google account
4. You should be redirected to the dashboard

### 2. Dashboard
- Left sidebar shows your name, email, and avatar
- Navigation: Scheduled, Sent, Search
- Green "Compose" button

### 3. Compose & Schedule Emails

1. Click **Compose** in the sidebar
2. **From**: Your auto-created sender account should appear
3. **Recipients**: Either:
   - Upload a CSV file with an `email` column, OR
   - Type comma-separated emails: `test1@example.com, test2@example.com, test3@example.com`
4. **Subject**: "Test Campaign from ReachInbox"
5. **Body**: "Hello! This is a test email from the ReachInbox scheduler."
6. **Start At**: Set to 1-2 minutes from now
7. **Delay between emails**: 5 seconds
8. **Hourly Limit**: 2 (set low to demonstrate rate limiting!)
9. Click **Schedule Campaign**

### 4. View Scheduled Emails
- You should be redirected to the Scheduled page
- See your emails with status badges (PENDING → QUEUED)
- Status auto-updates every 10 seconds

### 5. BullMQ Dashboard
1. Open `http://localhost:3001/admin/queues`
2. See the `email-send` queue
3. Observe: **Delayed** tab shows waiting jobs
4. Watch jobs move to **Active** → **Completed** as they're processed

### 6. Watch Emails Get Sent
- Switch back to the dashboard
- Navigate to **Sent** when emails start being sent
- Each email shows: recipient, subject, sent time, status
- Check Terminal 2 (worker) for logs showing email sends

### 7. Verify on Ethereal
1. Go to [Ethereal Messages](https://ethereal.email/)
2. Login with your Ethereal credentials
3. See the actual emails that were sent!

### 8. Rate Limiting Demo
With hourly limit set to 2:
- First 2 emails send successfully
- Remaining emails get status `RATE_LIMITED`
- Worker logs show: "Rate limit hit for sender..."
- Emails are rescheduled to the next hour window
- If Slack is connected: a rate-limit notification is sent

### 9. Search
1. Go to **Search** in the sidebar
2. Type a recipient email or subject keyword
3. Results appear from Elasticsearch
4. Click on a result to see full email details

### 10. Slack Integration (Optional)
1. In the sidebar, click **Connect Slack**
2. Authorize the app in your Slack workspace
3. Trigger a rate limit (set hourly limit to 1, send 2+ emails)
4. Check Slack for the rate-limit notification message

### 11. Restart Persistence Demo
1. Schedule some emails for 5 minutes in the future
2. Stop the worker (Ctrl+C in Terminal 2)
3. Wait a moment
4. Restart the worker: `pnpm dev:worker`
5. Worker logs: "Reconciliation complete. Enqueued X jobs."
6. Emails still send at their scheduled time!

### 12. Email Detail View
- Click any email row in Scheduled or Sent
- See full details: sender, recipient, subject, body, timestamps, status, attempts

## Sample CSV File

Create a file `test-recipients.csv`:
```csv
email
alice@example.com
bob@example.com
charlie@example.com
diana@example.com
eve@example.com
```

## Quick Rate Limit Test

To quickly demonstrate rate limiting:
1. Upload CSV with 5 recipients
2. Set hourly limit to 2
3. Set delay to 2 seconds
4. Set start time to 1 minute from now
5. Schedule
6. Watch: 2 emails send, 3 get rate-limited and rescheduled

## Troubleshooting

| Issue | Solution |
|---|---|
| Google OAuth redirect mismatch | Ensure callback URL matches in both `.env` and Google Console |
| Elasticsearch not ready | Wait 30s after `docker compose up -d`, check with `curl localhost:9200` |
| Redis connection error | Ensure `docker compose ps` shows redis running |
| Prisma errors | Run `npx prisma generate` then `npx prisma db push` |
| SMTP auth failed | Verify Ethereal credentials in `.env` |
