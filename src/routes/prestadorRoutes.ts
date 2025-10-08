// src/routes/prestadorRoutes.ts

import { Router } from 'express';
import { PrestadorController } from '../controllers/prestadorController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = Router();

// Listar prestadores por clínica
router.get('/', authenticateToken, PrestadorController.getPrestadoresByClinica);

// Listar todos os prestadores (para admin)
router.get('/admin', authenticateToken, requireRole(['admin']), PrestadorController.getAllPrestadores);

// Buscar prestador por ID
router.get('/:id', authenticateToken, PrestadorController.getPrestadorById);

export default router;
