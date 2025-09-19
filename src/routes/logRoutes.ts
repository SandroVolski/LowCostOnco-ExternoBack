import express from 'express';
import { LogController } from '../controllers/logController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticação para todas as rotas de logs
router.use(authenticateToken);

// Rotas para logs do sistema
router.get('/system', LogController.getLogs);
router.get('/system/stats', LogController.getLogStats);
router.post('/system', LogController.createLog);
router.delete('/system/clean', LogController.cleanOldLogs);
router.get('/system/export', LogController.exportLogs);

// Rotas para logs de performance
router.get('/performance', LogController.getPerformanceLogs);
router.post('/performance', LogController.createPerformanceLog);

// Rotas para logs de segurança
router.get('/security', LogController.getSecurityLogs);
router.post('/security', LogController.createSecurityLog);

export default router;
