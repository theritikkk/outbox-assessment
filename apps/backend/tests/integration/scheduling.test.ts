import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCampaign } from '../../src/services/campaignService';
import { prisma } from '../../src/config/database';
import { enqueueEmail } from '../../src/queues/emailQueue';

vi.mock('../../src/config/database', () => ({
  prisma: {
    senderAccount: {
      findUnique: vi.fn(),
    },
    emailCampaign: {
      create: vi.fn(),
      update: vi.fn(),
    },
    email: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/queues/emailQueue', () => ({
  enqueueEmail: vi.fn(),
}));

describe('Scheduling Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates campaign, schedules emails with stagger, and updates status', async () => {
    const now = new Date('2025-01-01T10:00:00Z').getTime();
    vi.setSystemTime(new Date(now));

    const mockSender = { id: 'sender-1', userId: 'user-1', hourlyLimit: 100 };
    vi.mocked(prisma.senderAccount.findUnique).mockResolvedValue(mockSender as any);

    const mockCampaign = { id: 'camp-1' };
    vi.mocked(prisma.emailCampaign.create).mockResolvedValue(mockCampaign as any);

    const mockEmails = [
      { id: 'email-1', scheduledAt: new Date(now) }, // 0s delay
      { id: 'email-2', scheduledAt: new Date(now + 2000) }, // 2s delay
    ];
    vi.mocked(prisma.email.findMany).mockResolvedValue(mockEmails as any);

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue({ id: 'camp-1', status: 'ACTIVE' } as any);

    const request = {
      senderId: 'sender-1',
      subject: 'Test Subject',
      body: 'Test Body',
      recipients: ['test1@example.com', 'test2@example.com'],
      startAt: new Date(now).toISOString(),
      delayBetweenEmails: 2,
    };

    const result = await createCampaign('user-1', request);

    expect(prisma.senderAccount.findUnique).toHaveBeenCalledWith({ where: { id: 'sender-1' } });
    
    expect(prisma.emailCampaign.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'SCHEDULING',
        totalEmails: 2,
      }),
    }));

    // Verify email creation parameters including idempotencyKey and scheduledAt staggering
    expect(prisma.email.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          recipient: 'test1@example.com',
          status: 'PENDING',
          idempotencyKey: 'camp-1:test1@example.com:0',
          scheduledAt: new Date(now),
        }),
        expect.objectContaining({
          recipient: 'test2@example.com',
          status: 'PENDING',
          idempotencyKey: 'camp-1:test2@example.com:1',
          scheduledAt: new Date(now + 2000), // 2 seconds delay
        }),
      ],
    });

    // Verify BullMQ jobs are created with correct delays
    expect(enqueueEmail).toHaveBeenCalledTimes(2);
    expect(enqueueEmail).toHaveBeenNthCalledWith(1, 'email-1', 0); // Math.max(0, now - now) = 0
    expect(enqueueEmail).toHaveBeenNthCalledWith(2, 'email-2', 2000);

    expect(prisma.emailCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      data: { status: 'ACTIVE' },
    });

    expect(result.status).toBe('ACTIVE');
  });

  it('throws an error if sender is not found or does not belong to user', async () => {
    vi.mocked(prisma.senderAccount.findUnique).mockResolvedValue(null);

    const request = {
      senderId: 'invalid-sender',
      subject: 'Test',
      body: 'Body',
      recipients: ['test@test.com'],
      startAt: new Date().toISOString(),
    };

    await expect(createCampaign('user-1', request)).rejects.toThrow('Sender account not found or does not belong to user');
    expect(prisma.emailCampaign.create).not.toHaveBeenCalled();
  });
});
