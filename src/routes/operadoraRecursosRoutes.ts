import { Router } from 'express';
import operadoraRecursosController from '../controllers/operadoraRecursosController';
import { authenticateOperadora } from '../middleware/authOperadora';

const router = Router();

// Todas as rotas requerem autenticação de operadora
router.use(authenticateOperadora);

// Dashboard
router.get('/dashboard', operadoraRecursosController.dashboard);

// Recursos
router.get('/recursos', operadoraRecursosController.listarRecursos);
router.get('/recursos/:id', operadoraRecursosController.buscarRecurso);

// Ações sobre recursos
router.post('/recursos/:id/receber', operadoraRecursosController.receberRecurso);
router.post('/recursos/:id/aprovar', operadoraRecursosController.aprovarRecurso);
router.post('/recursos/:id/negar', operadoraRecursosController.negarRecurso);
router.post('/recursos/:id/solicitar-parecer', operadoraRecursosController.solicitarParecer);

// Chat com auditor
router.post('/recursos/:id/chat', operadoraRecursosController.enviarMensagem);

// Auditores
router.get('/auditores', operadoraRecursosController.listarAuditores);

export default router;
