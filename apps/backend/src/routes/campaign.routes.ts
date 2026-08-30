import { Router } from 'express';
import * as campaignController from '../controllers/campaignController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.post('/', requireAuth, validate(campaignController.createCampaignSchema), campaignController.create);
router.get('/', requireAuth, campaignController.list);

export default router;
