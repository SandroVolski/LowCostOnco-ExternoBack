// src/routes/operadoraRoutes.ts

import { Router } from 'express';
import { OperadoraController } from '../controllers/operadoraController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = Router();

// 🆕 ROTAS ADMINISTRATIVAS PARA CRUD COMPLETO
// Listar todas as operadoras (para administradores)
router.get('/admin', authenticateToken, requireRole(['admin']), OperadoraController.getAllOperadoras);           // GET /api/operadoras/admin
// Buscar operadora por ID (para administradores)
router.get('/admin/:id', authenticateToken, requireRole(['admin']), OperadoraController.getOperadoraById);       // GET /api/operadoras/admin/:id
// Criar nova operadora (para administradores)
router.post('/admin', authenticateToken, requireRole(['admin']), OperadoraController.createOperadora);           // POST /api/operadoras/admin
// Atualizar operadora (para administradores)
router.put('/admin/:id', authenticateToken, requireRole(['admin']), OperadoraController.updateOperadora);        // PUT /api/operadoras/admin/:id
// Deletar operadora (para administradores)
router.delete('/admin/:id', authenticateToken, requireRole(['admin']), OperadoraController.deleteOperadora);     // DELETE /api/operadoras/admin/:id

export default router;
