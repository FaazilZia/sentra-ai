import { Router } from 'express';
import multer from 'multer';
import {
  uploadEvidenceFile,
  getEvidenceList,
  getEvidenceById,
  deleteEvidenceRecord
} from '../controllers/evidence.controller';
import { authenticate } from '../middleware/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB file size limit for evidence files
  }
});

const router = Router();

router.post('/', authenticate, upload.single('file'), uploadEvidenceFile);
router.get('/', authenticate, getEvidenceList);
router.get('/:id', authenticate, getEvidenceById);
router.delete('/:id', authenticate, deleteEvidenceRecord);

export default router;
