import { Router } from 'express';
import { PerformanceController } from '../controllers/performanceController';
import { withCustomTimeout } from '../utils/performance-enhanced';

const router = Router();

// GET /api/performance/stats - Estatísticas de performance
router.get('/stats', PerformanceController.getStats);

// GET /api/performance/diagnose - Diagnóstico avançado
router.get('/diagnose', PerformanceController.diagnose);

// GET /api/performance/health - Health check avançado
router.get('/health', PerformanceController.healthCheck);

// PUT /api/performance/config - Atualizar configurações de performance
router.put('/config', PerformanceController.updateConfig);

// POST /api/performance/kill-requests - Emergência: matar requisições ativas
router.post('/kill-requests', PerformanceController.killActiveRequests);

// POST /api/performance/reset-circuit-breakers - Resetar circuit breakers
router.post('/reset-circuit-breakers', PerformanceController.resetCircuitBreakers);

export default router; 