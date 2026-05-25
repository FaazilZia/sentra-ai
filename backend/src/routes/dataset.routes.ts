import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listDatasets,
  createDataset,
  updateDataset,
  deleteDataset,
  archiveDataset,
  linkToSystem
} from '../controllers/dataset.controller';

const router = Router();

router.get('/', authenticate, listDatasets);
router.post('/', authenticate, createDataset);
router.patch('/:id', authenticate, updateDataset);
router.delete('/:id', authenticate, deleteDataset);
router.patch('/:id/archive', authenticate, archiveDataset);
router.post('/:id/link', authenticate, linkToSystem);

export default router;
