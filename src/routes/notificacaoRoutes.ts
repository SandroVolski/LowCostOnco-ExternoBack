import { Router } from 'express';
import { NotificacaoController } from '../controllers/notificacaoController';

const router = Router();

router.get('/', NotificacaoController.index);
router.post('/:id/lida', NotificacaoController.marcarLida);
router.post('/lidas', NotificacaoController.marcarTodas);
router.post('/', NotificacaoController.criar); // opcional/dev

export default router; 