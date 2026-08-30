import { WebClient } from '@slack/web-api';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export const getSlackAuthorizeUrl = (state: string): string => {
  const scopes = ['chat:write', 'chat:write.public', 'channels:read'];
  return `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&user_scope=&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(env.SLACK_REDIRECT_URI)}&state=${encodeURIComponent(state)}`;
};

export const exchangeSlackCode = async (code: string) => {
  const web = new WebClient();
  const response = await web.oauth.v2.access({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_REDIRECT_URI,
  });

  if (!response.ok) {
    throw new Error(`Slack OAuth error: ${response.error}`);
  }
  
  return response;
};

export const sendSlackNotification = async (accessToken: string, channelId: string, message: string) => {
  try {
    const web = new WebClient(accessToken);
    await web.chat.postMessage({
      channel: channelId,
      text: message,
    });
  } catch (error: any) {
    logger.error('Failed to send Slack notification', { error: error.message });
  }
};

export const notifyRateLimit = async (userId: string, senderEmail: string, sentCount: number, hourlyLimit: number) => {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!connection || !connection.accessToken || connection.accessToken === 'REVOKED') {
      return;
    }

    let targetChannel = connection.channelId || connection.botUserId;
    const web = new WebClient(connection.accessToken);

    if (!targetChannel) {
      try {
        const list = await web.conversations.list({ types: 'public_channel', limit: 5 });
        if (list.channels && list.channels.length > 0 && list.channels[0].id) {
          targetChannel = list.channels[0].id;
        }
      } catch (err: any) {
        logger.debug('Could not list Slack channels', { error: err.message });
      }
    }

    if (!targetChannel) {
      targetChannel = '#general';
    }

    const message = `⚠️ *Rate Limit Reached* ⚠️\nYour sender account \`${senderEmail}\` has hit its hourly limit of ${hourlyLimit} emails. Sent so far: ${sentCount}. Further emails have been queued for the next window.`;
    
    await web.chat.postMessage({
      channel: targetChannel,
      text: message,
    });
  } catch (error: any) {
    logger.error('Error notifying rate limit to Slack', { error: error.message, userId });
  }
};
