import { Router } from 'express';
import * as emailController from '../controllers/emailController';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv and .txt files are allowed'));
    }
  }
});

const router = Router();

router.get('/scheduled', requireAuth, emailController.scheduled);
router.get('/sent', requireAuth, emailController.sent);
router.get('/search', requireAuth, emailController.search);
router.post('/upload-csv', requireAuth, upload.single('file'), emailController.uploadCsv);
router.get('/:id', requireAuth, emailController.getById);

export default router;
