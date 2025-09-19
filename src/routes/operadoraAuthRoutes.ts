// src/routes/operadoraAuthRoutes.ts

import { Router } from 'express';
import { OperadoraAuthController } from '../controllers/operadoraAuthController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/login', OperadoraAuthController.login);
router.post('/refresh', OperadoraAuthController.refresh);
router.post('/logout', OperadoraAuthController.logout);
router.get('/me', OperadoraAuthController.me);

// Rotas protegidas (apenas para admin do sistema)
router.post('/register', authenticateToken, requireRole(['admin']), OperadoraAuthController.register);
router.get('/users/:operadoraId', authenticateToken, requireRole(['admin']), OperadoraAuthController.getUsersByOperadora);

export default router;
