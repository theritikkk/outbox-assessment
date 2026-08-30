import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as slackService from '../integrations/slack/slackService';
import { prisma } from '../config/database';
import { env } from '../config/env';

export const connect = (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  (req.session as any).slackState = state;
  const url = slackService.getSlackAuthorizeUrl(state);
  res.redirect(url);
};

export const callback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;
    const sessionState = (req.session as any).slackState;
    
    if (state !== sessionState) {
      return res.redirect(`${env.FRONTEND_URL}/dashboard/scheduled?error=slack_state_mismatch`);
    }
    
    if (!req.user) {
      return res.redirect(`${env.FRONTEND_URL}/?error=unauthorized`);
    }

    const response = await slackService.exchangeSlackCode(code as string);
    
    await prisma.slackConnection.upsert({
      where: { userId: req.user.id },
      update: {
        accessToken: response.access_token as string,
        teamId: response.team?.id as string,
        teamName: response.team?.name as string,
        botUserId: response.bot_user_id,
        channelId: response.incoming_webhook?.channel_id || null,
        disconnectedAt: null,
      },
      create: {
        userId: req.user.id,
        accessToken: response.access_token as string,
        teamId: response.team?.id as string,
        teamName: response.team?.name as string,
        botUserId: response.bot_user_id,
        channelId: response.incoming_webhook?.channel_id || null,
      },
    });

    res.redirect(`${env.FRONTEND_URL}/dashboard/scheduled?slack=connected`);
  } catch (error) {
    res.redirect(`${env.FRONTEND_URL}/dashboard/scheduled?error=slack_auth_failed`);
  }
};

export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.slackConnection.update({
      where: { userId: req.user!.id },
      data: {
        accessToken: 'REVOKED',
        disconnectedAt: new Date(),
      }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const status = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conn = await prisma.slackConnection.findUnique({
      where: { userId: req.user!.id }
    });
    const connected = conn && !conn.disconnectedAt && conn.accessToken !== 'REVOKED';
    res.json({ 
      success: true, 
      data: { connected: !!connected, teamName: conn?.teamName } 
    });
  } catch (error) {
    next(error);
  }
};
