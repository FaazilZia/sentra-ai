import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware';
import {
  uploadEvidenceFile,
  listEvidenceFiles,
  deleteEvidenceFile
} from '../controllers/fileIngestion.controller';

const router = Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'evidence');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + require('crypto').randomInt(1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadEvidenceFile);
router.get('/:controlType/:controlId', listEvidenceFiles);
router.delete('/:id', deleteEvidenceFile);

export default router;
