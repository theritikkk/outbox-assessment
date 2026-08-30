import { prisma } from '../config/database';
import { enqueueEmail } from '../queues/emailQueue';

export interface CreateCampaignRequest {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}

export const createCampaign = async (userId: string, data: CreateCampaignRequest) => {
  const sender = await prisma.senderAccount.findUnique({
    where: { id: data.senderId },
  });

  if (!sender || sender.userId !== userId) {
    throw new Error('Sender account not found or does not belong to user');
  }

  const delay = data.delayBetweenEmails ?? 2;
  const limit = data.hourlyLimit ?? sender.hourlyLimit;
  const startAtMs = new Date(data.startAt).getTime();
  const nowMs = Date.now();

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId,
      senderId: data.senderId,
      subject: data.subject,
      body: data.body,
      startAt: new Date(data.startAt),
      delayBetweenEmails: delay,
      hourlyLimit: limit,
      totalEmails: data.recipients.length,
      status: 'SCHEDULING',
    },
  });

  const emailsData = data.recipients.map((recipient, index) => {
    return {
      campaignId: campaign.id,
      senderId: sender.id,
      recipient,
      subject: data.subject,
      body: data.body,
      scheduledAt: new Date(startAtMs + index * delay * 1000),
      idempotencyKey: `${campaign.id}:${recipient}:${index}`,
      status: 'PENDING' as const,
    };
  });

  // Batch insert emails
  await prisma.email.createMany({
    data: emailsData,
  });

  const emails = await prisma.email.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: 'asc' },
  });

  for (const email of emails) {
    const delayMs = Math.max(0, email.scheduledAt.getTime() - nowMs);
    await enqueueEmail(email.id, delayMs);
  }

  const updatedCampaign = await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: 'ACTIVE' },
  });

  return updatedCampaign;
};

export const getCampaigns = async (userId: string) => {
  return prisma.emailCampaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getCampaignById = async (userId: string, id: string) => {
  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId },
    include: {
      user: { select: { name: true, email: true } },
    }
  });
  if (!campaign) throw new Error('Campaign not found');
  return campaign;
};
