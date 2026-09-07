import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const c = new DashboardController();
router.get('/metrics', authMiddleware, c.metrics.bind(c));
export default router;
