import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as campaignService from '../services/campaignService';

export const createCampaignSchema = z.object({
  senderId: z.string().min(1, 'Sender account is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email('Invalid email')).min(1, 'At least one recipient is required'),
  startAt: z.string().min(1, 'Start time is required'),
  delayBetweenEmails: z.number().min(0).default(2),
  hourlyLimit: z.number().min(1).default(200),
});

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const campaign = await campaignService.createCampaign(userId, req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const campaigns = await campaignService.getCampaigns(userId);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
};
