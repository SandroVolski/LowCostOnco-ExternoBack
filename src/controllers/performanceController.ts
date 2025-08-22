import { Request, Response } from 'express';
import { 
  getAdvancedPerformanceStats, 
  diagnosePerformanceIssues,
  updatePerformanceConfig,
  killAllActiveRequests,
  resetCircuitBreakers
} from '../utils/performance-enhanced';

export class PerformanceController {
  
  // GET /api/performance/stats - Estatísticas detalhadas
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = getAdvancedPerformanceStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas de performance',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // GET /api/performance/diagnose - Diagnóstico avançado
  static async diagnose(req: Request, res: Response): Promise<void> {
    try {
      const diagnosis = diagnosePerformanceIssues();
      res.json({
        success: true,
        data: diagnosis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao executar diagnóstico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // PUT /api/performance/config - Atualizar configurações
  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { 
        slowRequestThreshold,
        criticalRequestThreshold,
        timeoutThreshold,
        maxConcurrentRequests,
        enableAutoKill,
        enableCircuitBreaker 
      } = req.body;

      const newConfig: any = {};
      
      if (slowRequestThreshold !== undefined) {
        newConfig.slowRequestThreshold = parseInt(slowRequestThreshold);
      }
      if (criticalRequestThreshold !== undefined) {
        newConfig.criticalRequestThreshold = parseInt(criticalRequestThreshold);
      }
      if (timeoutThreshold !== undefined) {
        newConfig.timeoutThreshold = parseInt(timeoutThreshold);
      }
      if (maxConcurrentRequests !== undefined) {
        newConfig.maxConcurrentRequests = parseInt(maxConcurrentRequests);
      }
      if (enableAutoKill !== undefined) {
        newConfig.enableAutoKill = Boolean(enableAutoKill);
      }
      if (enableCircuitBreaker !== undefined) {
        newConfig.enableCircuitBreaker = Boolean(enableCircuitBreaker);
      }

      updatePerformanceConfig(newConfig);
      
      res.json({
        success: true,
        message: 'Configuração atualizada com sucesso',
        data: newConfig
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configuração',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // POST /api/performance/kill-requests - Matar todas as requisições ativas (emergência)
  static async killActiveRequests(req: Request, res: Response): Promise<void> {
    try {
      killAllActiveRequests();
      res.json({
        success: true,
        message: 'Todas as requisições ativas foram canceladas'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao cancelar requisições',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // POST /api/performance/reset-circuit-breakers - Resetar circuit breakers
  static async resetCircuitBreakers(req: Request, res: Response): Promise<void> {
    try {
      resetCircuitBreakers();
      res.json({
        success: true,
        message: 'Circuit breakers resetados com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao resetar circuit breakers',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // GET /api/performance/health - Health check avançado
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const stats = getAdvancedPerformanceStats();
      const diagnosis = diagnosePerformanceIssues();
      
      const isHealthy = diagnosis.issues.length === 0 && stats.activeRequests < 30;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        data: {
          activeRequests: stats.activeRequests,
          circuitBreakersActive: stats.circuitBreakers.length,
          issues: diagnosis.issues,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Erro no health check',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
} 