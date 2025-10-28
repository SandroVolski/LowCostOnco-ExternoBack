import { Router } from 'express';
import adminAuditoresController from '../controllers/adminAuditoresController';

const router = Router();

// Todas as rotas aqui assumem que já passaram por authAdmin middleware

router.get('/', adminAuditoresController.listar);
router.get('/:id', adminAuditoresController.buscar);
router.post('/', adminAuditoresController.criar);
router.put('/:id', adminAuditoresController.atualizar);
router.delete('/:id', adminAuditoresController.excluir);

export default router;
