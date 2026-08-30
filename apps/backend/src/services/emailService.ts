import { prisma } from '../config/database';
import { searchEmails as esSearchEmails } from '../integrations/elasticsearch/emailIndex';

export const getScheduledEmails = async (userId: string) => {
  return prisma.email.findMany({
    where: {
      campaignId: { in: (await getUserCampaignIds(userId)) },
      status: { in: ['PENDING', 'QUEUED', 'RATE_LIMITED'] },
    },
    orderBy: { scheduledAt: 'asc' },
  });
};

export const getSentEmails = async (userId: string) => {
  return prisma.email.findMany({
    where: {
      campaignId: { in: (await getUserCampaignIds(userId)) },
      status: 'SENT',
    },
    orderBy: { sentAt: 'desc' },
  });
};

export const getEmailById = async (userId: string, id: string) => {
  const email = await prisma.email.findUnique({
    where: { id },
  });
  if (!email) throw new Error('Email not found');
  
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: email.campaignId },
  });
  if (!campaign || campaign.userId !== userId) {
    throw new Error('Email does not belong to user');
  }
  
  return email;
};

export const searchEmails = async (userId: string, query: string, page = 1) => {
  return esSearchEmails(userId, query, page, 20);
};

const getUserCampaignIds = async (userId: string) => {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { userId },
    select: { id: true },
  });
  return campaigns.map(c => c.id);
};
