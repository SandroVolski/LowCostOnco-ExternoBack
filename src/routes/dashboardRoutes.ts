// src/routes/dashboardRoutes.ts

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DashboardController } from '../controllers/dashboardController';

const router = Router();

// Rotas para dashboard
router.get('/metrics', authenticateToken, DashboardController.getMetrics);           // GET /api/dashboard/metrics
router.get('/charts', authenticateToken, DashboardController.getChartsData);        // GET /api/dashboard/charts
router.get('/performance', authenticateToken, DashboardController.getClinicasPerformance); // GET /api/dashboard/performance

export default router;