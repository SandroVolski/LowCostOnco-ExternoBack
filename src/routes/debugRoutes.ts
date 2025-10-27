// src/routes/debugRoutes.ts - Rotas para debug (apenas desenvolvimento)

import { Router } from 'express';
import { DebugController } from '../controllers/debugController';

const router = Router();

// Middleware para permitir debug apenas em desenvolvimento
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      message: 'Rotas de debug não disponíveis em produção'
    });
    return;
  }
  next();
});

// POST /api/debug/hash-password - Gerar hash de senha
router.post('/hash-password', DebugController.hashPassword);

// POST /api/debug/test-login - Testar login sem autenticação
router.post('/test-login', DebugController.testLogin);

// GET /api/debug/clinic-data - Verificar dados da clínica
router.get('/clinic-data', DebugController.getClinicData);

// POST /api/debug/reset-password - Resetar senha de um usuário
router.post('/reset-password', DebugController.resetPassword);

export default router;