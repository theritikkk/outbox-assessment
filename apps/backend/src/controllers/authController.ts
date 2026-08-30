import { Request, Response } from 'express';
import passport from 'passport';
import { env } from '../config/env';
import { prisma } from '../config/database';

export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleCallback = (req: Request, res: Response) => {
  passport.authenticate('google', { failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed` }, (err: any, user: any) => {
    if (err || !user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
      }
      return res.redirect(`${env.FRONTEND_URL}/auth/callback`);
    });
  })(req, res);
};

export const me = async (req: Request, res: Response) => {
  const user = req.user as any;
  const senderAccounts = await prisma.senderAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      hourlyLimit: true,
    },
  });

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      senderAccounts,
    },
  });
};

export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
};
