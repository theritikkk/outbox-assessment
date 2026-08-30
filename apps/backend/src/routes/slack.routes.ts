import { Router } from 'express';
import * as slackController from '../controllers/slackController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/connect', requireAuth, slackController.connect);
router.get('/callback', slackController.callback);
router.post('/disconnect', requireAuth, slackController.disconnect);
router.get('/status', requireAuth, slackController.status);

export default router;
