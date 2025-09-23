// src/routes/analysisRoutes.ts

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AnalysisController } from '../controllers/analysisController';

const router = Router();

// Rotas para análise de dados
router.get('/organs', authenticateToken, AnalysisController.getOrganAnalysis);           // GET /api/analysis/organs
router.get('/metrics', authenticateToken, AnalysisController.getAnalysisMetrics);        // GET /api/analysis/metrics
router.get('/kpis', authenticateToken, AnalysisController.getOperationalKPIs);           // GET /api/analysis/kpis
router.get('/charts', authenticateToken, AnalysisController.getChartData);               // GET /api/analysis/charts

export default router;
