// src/routes/adminRoutes.ts

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getSystemMetrics,
  getOperadorasInfo,
  getClinicasInfo,
  getChartsData
} from '../controllers/adminController';

const router = Router();

// Middleware de autenticação para todas as rotas administrativas
router.use(authenticateToken);

// Rotas administrativas
router.get('/metrics', getSystemMetrics);
router.get('/operadoras', getOperadorasInfo);
router.get('/clinicas', getClinicasInfo);
router.get('/charts', getChartsData);

export default router;
