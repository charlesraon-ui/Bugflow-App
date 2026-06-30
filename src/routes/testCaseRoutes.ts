import express from 'express';
import {
  getTestCases,
  getTestCaseById,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  getDashboardStats,
  getProjectActivityLogs
} from '../controllers/testCaseController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/dashboard', authMiddleware, getDashboardStats);
router.get('/projects/:projectId/activity-logs', authMiddleware, getProjectActivityLogs);
router.get('/', authMiddleware, getTestCases);
router.get('/:id', authMiddleware, getTestCaseById);
router.post('/', authMiddleware, createTestCase);
router.put('/:id', authMiddleware, updateTestCase);
router.delete('/:id', authMiddleware, deleteTestCase);

export default router;
