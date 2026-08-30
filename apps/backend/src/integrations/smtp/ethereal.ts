import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT, 10),
  secure: parseInt(env.SMTP_PORT, 10) === 465, 
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

export const sendEmail = async (
  from: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ messageId: string; previewUrl: string | false }> => {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html: htmlBody,
    });
    
    return {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  } catch (error: any) {
    logger.error('Failed to send email via SMTP', { error: error.message, to });
    throw error;
  }
};
