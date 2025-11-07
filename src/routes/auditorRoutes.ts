import { Router } from 'express';
import auditorController from '../controllers/auditorController';
import { authenticateAuditor } from '../middleware/authAuditor';

const router = Router();

// Autenticação
router.post('/login', auditorController.login);

// Rotas protegidas (requerem autenticação)
router.use(authenticateAuditor);

// Dashboard
router.get('/dashboard', auditorController.dashboard);

// Pacientes atendidos
router.get('/pacientes', auditorController.listarPacientes);

// Recursos
router.get('/recursos', auditorController.listarRecursos);
router.get('/recursos/:id', auditorController.buscarRecurso);
router.get('/recursos/:id/guia-completa', auditorController.getGuiaCompleta);

// Pareceres
router.post('/recursos/:id/parecer', auditorController.emitirParecer);

// Chat
router.get('/recursos/:id/chat', auditorController.listarMensagens);
router.post('/recursos/:id/chat', auditorController.enviarMensagem);

// Histórico do Paciente
router.get('/historico-paciente', auditorController.buscarHistoricoPorCarteira);

export default router;
