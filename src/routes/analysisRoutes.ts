// src/routes/analysisRoutes.ts

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AnalysisController } from '../controllers/analysisController';

const router = Router();

// Rotas para análise de dados
router.get('/organs', authenticateToken, AnalysisController.getOrganAnalysis);           // GET /api/analysis/organs
router.get('/metrics', authenticateToken, AnalysisController.getAnalysisMetrics);        // GET /api/analysis/metrics

export default router;
