import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/me', requireAuth, authController.me);
router.post('/logout', authController.logout);

export default router;
