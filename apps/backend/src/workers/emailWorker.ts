import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { checkRateLimit, getNextAvailableWindow } from '../services/rateLimiter';
import { sendEmail } from '../integrations/smtp/ethereal';
import { indexEmail } from '../integrations/elasticsearch/emailIndex';
import { notifyRateLimit } from '../integrations/slack/slackService';
import { emailQueue } from '../queues/emailQueue';

export const createEmailWorker = (concurrency: number) => {
  const worker = new Worker('email-send', async (job: Job) => {
    const { emailId } = job.data;
    const jobLogger = logger.child({ jobId: job.id, emailId });

    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: { sender: true, campaign: true },
    });

    if (!email) {
      jobLogger.warn('Email not found, skipping');
      return;
    }

    // Idempotency: skip if already sent
    if (email.status === 'SENT') {
      jobLogger.info('Email already sent, skipping (idempotency)');
      return;
    }

    const campaign = email.campaign;
    if (!campaign) {
      jobLogger.warn('Campaign not found for email');
      return;
    }

    // Rate limit check using atomic Redis counter
    const { allowed, currentCount, hourWindow } = await checkRateLimit(
      email.senderId,
      campaign.hourlyLimit
    );

    if (!allowed) {
      const nextWindow = await getNextAvailableWindow(
        email.senderId,
        campaign.hourlyLimit,
        hourWindow + 1
      );
      const nextWindowStartMs = nextWindow * 3600000;
      const delayMs = Math.max(1000, nextWindowStartMs - Date.now());

      await prisma.email.update({
        where: { id: email.id },
        data: { 
          status: 'RATE_LIMITED',
          scheduledAt: new Date(nextWindowStartMs),
        },
      });

      // Use a unique jobId for the rescheduled job to avoid BullMQ duplicate rejection
      // The worker still checks DB status (idempotency), so this is safe
      const rescheduleJobId = `email-${email.id}-reschedule-${nextWindow}`;
      await emailQueue.add(
        'send',
        { emailId: email.id },
        {
          jobId: rescheduleJobId,
          delay: delayMs,
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: { age: 172800 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );

      // Notify Slack (fire-and-forget safely)
      try {
        await notifyRateLimit(
          campaign.userId,
          email.sender.email,
          currentCount,
          campaign.hourlyLimit
        );
      } catch {
        // Slack notification errors must never break worker scheduling
      }

      jobLogger.info(
        `Rate limit hit for sender ${email.senderId}. Rescheduled to window ${nextWindow} (delay ${delayMs}ms)`
      );
      return;
    }

    // Mark as SENDING before SMTP call
    await prisma.email.update({
      where: { id: email.id },
      data: { status: 'SENDING', attempts: { increment: 1 } },
    });

    try {
      const result = await sendEmail(
        email.sender.email,
        email.recipient,
        email.subject,
        email.body
      );

      // SMTP success — update DB
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: result.messageId,
        },
      });

      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { sentCount: { increment: 1 } },
      });

      jobLogger.info(`Email sent to ${email.recipient}`, {
        recipient: email.recipient,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      });

      // Index in Elasticsearch (fire-and-forget — ES failure must never cause re-send)
      try {
        await indexEmail({
          id: email.id,
          recipient: email.recipient,
          sender: email.sender.email,
          subject: email.subject,
          body: email.body,
          status: 'SENT',
          scheduledAt: email.scheduledAt,
          sentAt: new Date(),
          userId: campaign.userId,
          campaignId: campaign.id,
        });
      } catch (err: any) {
        jobLogger.error('Failed to index email in ES (non-fatal)', {
          error: err.message,
        });
      }
    } catch (error: any) {
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { failedCount: { increment: 1 } },
      });

      jobLogger.error(`Failed to send email to ${email.recipient}`, {
        error: error.message,
      });

      // Re-throw to let BullMQ handle retries
      throw error;
    }

    // Check campaign completion
    const updated = await prisma.emailCampaign.findUnique({
      where: { id: campaign.id },
    });
    if (
      updated &&
      updated.sentCount + updated.failedCount >= updated.totalEmails
    ) {
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED' },
      });
      jobLogger.info(`Campaign ${campaign.id} completed`);
    }
  }, {
    connection: redis,
    concurrency,
    stalledInterval: 30000,
    lockDuration: 60000,
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    if (job) {
      logger.error(`Job ${job.id} failed: ${err.message}`, {
        jobId: job.id,
        error: err.message,
      });
    }
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  worker.on('completed', (job: Job) => {
    logger.debug(`Job ${job.id} completed`);
  });

  return worker;
};
