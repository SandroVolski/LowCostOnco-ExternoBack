// src/routes/dashboardRoutes.ts

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';

const router = Router();

// 🆕 ROTAS DO DASHBOARD ADMINISTRATIVO
// Métricas principais do sistema
router.get('/metrics', DashboardController.getMetrics);                    // GET /api/dashboard/metrics
// Dados para gráficos
router.get('/charts', DashboardController.getChartsData);                  // GET /api/dashboard/charts
// Performance das clínicas
router.get('/performance', DashboardController.getClinicasPerformance);    // GET /api/dashboard/performance

export default router;
