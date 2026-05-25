import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  reviewVendor,
  getRiskSummary
} from '../controllers/vendor.controller';

const router = Router();

router.use(authenticate);

router.get('/', listVendors);
router.post('/', createVendor);
router.get('/summary', getRiskSummary);
router.patch('/:id', updateVendor);
router.delete('/:id', deleteVendor);
router.post('/:id/review', authorizeRoles('ADMIN'), reviewVendor);

export default router;
