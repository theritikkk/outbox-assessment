import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmailWorker } from '../../src/workers/emailWorker';
import { prisma } from '../../src/config/database';
import { checkRateLimit, getNextAvailableWindow } from '../../src/services/rateLimiter';
import { sendEmail } from '../../src/integrations/smtp/ethereal';
import { indexEmail } from '../../src/integrations/elasticsearch/emailIndex';
import { notifyRateLimit } from '../../src/integrations/slack/slackService';
import { emailQueue } from '../../src/queues/emailQueue';
import { Job } from 'bullmq';

// Mock dependencies
vi.mock('../../src/config/database', () => ({
  prisma: {
    email: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    emailCampaign: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/rateLimiter', () => ({
  checkRateLimit: vi.fn(),
  getNextAvailableWindow: vi.fn(),
}));

vi.mock('../../src/integrations/smtp/ethereal', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('../../src/integrations/elasticsearch/emailIndex', () => ({
  indexEmail: vi.fn(),
}));

vi.mock('../../src/integrations/slack/slackService', () => ({
  notifyRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/queues/emailQueue', () => ({
  emailQueue: {
    add: vi.fn(),
  },
}));

// Mock BullMQ Worker
let processorFn: (job: Job) => Promise<void>;
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((name, processor, options) => {
    processorFn = processor;
    return {
      on: vi.fn(),
      close: vi.fn(),
    };
  }),
}));

// Mock Logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }
}));

describe('Email Worker Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createEmailWorker(1); // Initializes the worker and sets processorFn
  });

  const createMockJob = (emailId: string): Job => ({
    id: 'job-1',
    data: { emailId },
  } as Job);

  const mockEmail = {
    id: 'email-1',
    senderId: 'sender-1',
    status: 'PENDING',
    recipient: 'test@test.com',
    subject: 'Test Subject',
    body: 'Test Body',
    scheduledAt: new Date(),
    sender: { email: 'sender@test.com' },
    campaign: { id: 'camp-1', hourlyLimit: 100, userId: 'user-1', totalEmails: 2 },
  };

  it('skips already-sent emails (idempotency)', async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue({ ...mockEmail, status: 'SENT' } as any);
    
    await processorFn(createMockJob('email-1'));

    expect(prisma.email.findUnique).toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends email and updates status to SENT', async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, currentCount: 1, hourWindow: 1 });
    vi.mocked(sendEmail).mockResolvedValue({ messageId: 'msg-1', previewUrl: 'url' } as any);
    vi.mocked(indexEmail).mockResolvedValue();
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(null as any); // Not completed yet

    await processorFn(createMockJob('email-1'));

    expect(prisma.email.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: { status: 'SENDING', attempts: { increment: 1 } },
    });

    expect(sendEmail).toHaveBeenCalledWith('sender@test.com', 'test@test.com', 'Test Subject', 'Test Body');

    expect(prisma.email.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: { status: 'SENT', sentAt: expect.any(Date), providerMessageId: 'msg-1' },
    });

    expect(prisma.emailCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      data: { sentCount: { increment: 1 } },
    });

    expect(indexEmail).toHaveBeenCalled();
  });

  it('handles SMTP failure and marks FAILED', async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, currentCount: 1, hourWindow: 1 });
    vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP Error'));

    await expect(processorFn(createMockJob('email-1'))).rejects.toThrow('SMTP Error');

    expect(prisma.email.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: { status: 'FAILED', errorMessage: 'SMTP Error' },
    });

    expect(prisma.emailCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      data: { failedCount: { increment: 1 } },
    });
  });

  it('reschedules when rate limited', async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, currentCount: 100, hourWindow: 1000 });
    vi.mocked(getNextAvailableWindow).mockResolvedValue(1001);

    await processorFn(createMockJob('email-1'));

    expect(prisma.email.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: { status: 'RATE_LIMITED', scheduledAt: expect.any(Date) },
    });

    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      { emailId: 'email-1' },
      expect.objectContaining({ jobId: 'email-email-1-reschedule-1001' })
    );

    expect(notifyRateLimit).toHaveBeenCalledWith('user-1', 'sender@test.com', 100, 100);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('handles missing email gracefully', async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(null);
    await processorFn(createMockJob('nonexistent'));
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('Elasticsearch indexing failure does not affect email status', async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, currentCount: 1, hourWindow: 1 });
    vi.mocked(sendEmail).mockResolvedValue({ messageId: 'msg-1' } as any);
    vi.mocked(indexEmail).mockRejectedValue(new Error('ES Down'));
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(null as any);

    await processorFn(createMockJob('email-1'));

    // Status is still SENT
    expect(prisma.email.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: { status: 'SENT', sentAt: expect.any(Date), providerMessageId: 'msg-1' },
    });
  });

  it('Slack notification failure does not affect rate limit rescheduling', async () => {
    vi.mocked(prisma.email.findUnique).mockResolvedValue(mockEmail as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, currentCount: 100, hourWindow: 1000 });
    vi.mocked(getNextAvailableWindow).mockResolvedValue(1001);
    vi.mocked(notifyRateLimit).mockRejectedValue(new Error('Slack down'));

    await processorFn(createMockJob('email-1'));

    // Rescheduling still happens
    expect(emailQueue.add).toHaveBeenCalled();
  });
});
