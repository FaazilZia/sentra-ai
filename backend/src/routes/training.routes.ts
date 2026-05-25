import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  recordCompletion,
  getCompletionStatus
} from '../controllers/training.controller';

const router = Router();

router.get('/courses', authenticate, listCourses);
router.post('/courses', authenticate, createCourse);
router.patch('/courses/:id', authenticate, updateCourse);
router.delete('/courses/:id', authenticate, deleteCourse);
router.post('/courses/:id/complete', authenticate, recordCompletion);
router.get('/status', authenticate, getCompletionStatus);

export default router;
