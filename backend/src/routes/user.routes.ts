import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMe } from '../controllers/auth.controller';
import { requireTenant } from '../middleware/tenant.middleware';
import prisma from '../config/db';
import { sendSuccess } from '../utils/controllerHelpers';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(path.basename(file.originalname)).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  }
});

// Get list of active users in the organization
router.get('/', authenticate, requireTenant, async (req: any, res) => {
  const users = await prisma.users.findMany({
    where: { organizationId: req.user.organizationId, is_active: true },
    select: { id: true, full_name: true, email: true, role: true, avatarUrl: true, jobTitle: true },
    orderBy: { full_name: 'asc' }
  });
  return sendSuccess(res, users);
});

// Get current user profile
router.get('/me', authenticate, getMe);

// Update current user profile
router.patch('/me', authenticate, async (req: any, res, next) => {
  try {
    const { fullName, jobTitle } = req.body;

    const updated = await prisma.users.update({
      where: { id: req.user.id },
      data: {
        ...(fullName && { full_name: fullName }),
        ...(jobTitle !== undefined && { jobTitle }),
      },
    });

    return sendSuccess(res, {
      id: updated.id,
      email: updated.email,
      fullName: updated.full_name,
      jobTitle: updated.jobTitle,
      avatarUrl: updated.avatarUrl,
    });
  } catch (error) {
    next(error);
  }
});

// Upload user avatar
router.put('/me/avatar', authenticate, upload.single('avatar'), async (req: any, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create unique file name
    const safeOriginalName = path.basename(req.file.originalname);
    const rawExt = path.extname(safeOriginalName).toLowerCase();
    const ext = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(rawExt) ? rawExt : '.png';
    const filename = `avatar-${req.user.id}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, path.basename(filename));

    // Save file
    fs.writeFileSync(filePath, req.file.buffer);

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/${filename}`;

    const updated = await prisma.users.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });

    return sendSuccess(res, { avatarUrl: updated.avatarUrl });
  } catch (error) {
    next(error);
  }
});

// Any authenticated user can access this
router.get('/dashboard', authenticate, getMe);

export default router;
