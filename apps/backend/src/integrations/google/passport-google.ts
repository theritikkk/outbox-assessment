import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: any) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email: email,
              name: profile.displayName || 'Unknown User',
              avatarUrl: profile.photos?.[0]?.value || null,
            },
          });
        } else {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              name: profile.displayName || user.name,
              avatarUrl: profile.photos?.[0]?.value || user.avatarUrl,
            },
          });
        }

        // Auto-create sender account if none exists
        const senderAccountsCount = await prisma.senderAccount.count({
          where: { userId: user.id },
        });

        if (senderAccountsCount === 0) {
          await prisma.senderAccount.create({
            data: {
              userId: user.id,
              email: env.SMTP_USER || email,
              displayName: profile.displayName || 'Default Sender',
              smtpHost: env.SMTP_HOST,
              smtpPort: parseInt(env.SMTP_PORT, 10),
              smtpUser: env.SMTP_USER || email,
              smtpPassword: env.SMTP_PASSWORD,
              hourlyLimit: parseInt(env.DEFAULT_HOURLY_LIMIT, 10),
            },
          });
          logger.info(`Auto-created sender account for user ${user.id}`);
        }

        return done(null, user);
      } catch (error) {
        logger.error('Google Auth Error', { error });
        return done(error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done: any) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
