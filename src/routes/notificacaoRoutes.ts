import { Router } from 'express';
import { NotificacaoController } from '../controllers/notificacaoController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Rotas de notificações (apenas clínicas e admin)
router.get('/', authenticateToken, requireRole(['clinica', 'admin']), NotificacaoController.index);
router.post('/:id/lida', authenticateToken, requireRole(['clinica', 'admin']), NotificacaoController.marcarLida);
router.post('/lidas', authenticateToken, requireRole(['clinica', 'admin']), NotificacaoController.marcarTodas);
router.post('/', authenticateToken, requireRole(['clinica', 'admin']), NotificacaoController.criar); // opcional/dev

export default router; 