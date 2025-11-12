import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

// Event emitter para notificações de performance
const performanceEvents = new EventEmitter();

// Configurações ajustáveis
interface PerformanceConfig {
  slowRequestThreshold: number;     // ms - limite para requisição lenta
  criticalRequestThreshold: number; // ms - limite para requisição crítica
  timeoutThreshold: number;         // ms - timeout para cancelar requisições
  maxConcurrentRequests: number;    // máximo de requisições simultâneas
  enableAutoKill: boolean;          // mata requisições que excedem timeout
  enableCircuitBreaker: boolean;    // circuit breaker para endpoints problemáticos
}

const defaultConfig: PerformanceConfig = {
  slowRequestThreshold: 5000,      // 5 segundos
  criticalRequestThreshold: 15000, // 15 segundos
  timeoutThreshold: 30000,         // 30 segundos
  maxConcurrentRequests: 50,       // 50 requisições simultâneas
  enableAutoKill: false,           // Desabilitado para desenvolvimento
  enableCircuitBreaker: true
};

// Estado global de performance
interface PerformanceState {
  activeRequests: Map<string, {
    req: Request;
    res: Response;
    startTime: number;
    timeout?: NodeJS.Timeout;
  }>;
  circuitBreakers: Map<string, {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
  }>;
  config: PerformanceConfig;
}

const performanceState: PerformanceState = {
  activeRequests: new Map(),
  circuitBreakers: new Map(),
  config: { ...defaultConfig }
};

// Função para atualizar configurações
export const updatePerformanceConfig = (newConfig: Partial<PerformanceConfig>) => {
  performanceState.config = { ...performanceState.config, ...newConfig };
};

// Circuit breaker para endpoints problemáticos
const checkCircuitBreaker = (endpoint: string): boolean => {
  if (!performanceState.config.enableCircuitBreaker) return false;
  
  const breaker = performanceState.circuitBreakers.get(endpoint);
  if (!breaker) return false;
  
  // Se o circuit breaker está aberto, verificar se deve fechar
  if (breaker.isOpen) {
    const timeSinceLastFailure = Date.now() - breaker.lastFailure;
    if (timeSinceLastFailure > 60000) {
      // 1 minuto
      breaker.isOpen = false;
      breaker.failures = 0;
      return false;
    }
    return true;
  }
  
  return false;
};

// Registrar falha no circuit breaker
const recordCircuitBreakerFailure = (endpoint: string) => {
  if (!performanceState.config.enableCircuitBreaker) return;
  
  const breaker = performanceState.circuitBreakers.get(endpoint) || {
    failures: 0,
    lastFailure: 0,
    isOpen: false
  };
  
  breaker.failures++;
  breaker.lastFailure = Date.now();
  
  // Abrir circuit breaker após 5 falhas
  if (breaker.failures >= 5) {
    breaker.isOpen = true;
    console.warn(`🚨 Circuit breaker aberto para ${endpoint} (${breaker.failures} falhas)`);
  }
  
  performanceState.circuitBreakers.set(endpoint, breaker);
};

// Middleware avançado de performance
export const enhancedPerformanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
  const endpoint = `${req.method} ${req.path}`;
  
  // Verificar circuit breaker
  if (checkCircuitBreaker(endpoint)) {
    return res.status(503).json({
      success: false,
      message: 'Serviço temporariamente indisponível',
      error: 'Circuit breaker ativo para este endpoint'
    });
  }
  
  // Verificar limite de requisições simultâneas
  if (performanceState.activeRequests.size >= performanceState.config.maxConcurrentRequests) {
    console.warn(`🚨 Limite de requisições simultâneas excedido: ${performanceState.activeRequests.size}`);
    return res.status(429).json({
      success: false,
      message: 'Muitas requisições simultâneas',
      error: 'Tente novamente em alguns segundos'
    });
  }
  
  // Configurar timeout para a requisição
  let timeoutHandler: NodeJS.Timeout | undefined;
  
  if (performanceState.config.enableAutoKill) {
    timeoutHandler = setTimeout(() => {
      console.error(`⏰ Timeout: Matando requisição ${endpoint} após ${performanceState.config.timeoutThreshold}ms`);
      
      // Registrar falha no circuit breaker
      recordCircuitBreakerFailure(endpoint);
      
      // Remover da lista de requisições ativas
      performanceState.activeRequests.delete(requestId);
      
      // Enviar resposta de timeout se ainda não foi enviada
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Requisição expirou',
          error: 'Tempo limite excedido'
        });
      }
      
      // Emitir evento de timeout
      performanceEvents.emit('timeout', { endpoint, duration: performanceState.config.timeoutThreshold });
      
    }, performanceState.config.timeoutThreshold);
  }
  
  // Registrar requisição ativa
  performanceState.activeRequests.set(requestId, {
    req,
    res,
    startTime,
    timeout: timeoutHandler
  });
  
  // Interceptar resposta
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Limpar timeout
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
    }
    
    // Remover da lista de requisições ativas
    performanceState.activeRequests.delete(requestId);
    
    // Análise de performance
    if (duration > performanceState.config.criticalRequestThreshold) {
      console.error(`🚨 REQUISIÇÃO CRÍTICA: ${endpoint} - ${duration}ms`);
      recordCircuitBreakerFailure(endpoint);
      performanceEvents.emit('critical', { endpoint, duration, requestId });
      
    } else if (duration > performanceState.config.slowRequestThreshold) {
      console.warn(`🐌 Requisição lenta detectada: ${endpoint} - ${duration}ms`);
      performanceEvents.emit('slow', { endpoint, duration, requestId });
    }
    
    // Log detalhado para requisições muito lentas
    if (duration > 10000) {}
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Função para obter estatísticas avançadas
export const getAdvancedPerformanceStats = () => {
  const activeCount = performanceState.activeRequests.size;
  const circuitBreakers = Array.from(performanceState.circuitBreakers.entries()).map(([endpoint, breaker]) => ({
    endpoint,
    ...breaker
  }));
  
  // Calcular tempo médio das requisições ativas
  const activeRequests = Array.from(performanceState.activeRequests.values());
  const avgActiveTime = activeRequests.length > 0 
    ? activeRequests.reduce((sum, req) => sum + (Date.now() - req.startTime), 0) / activeRequests.length
    : 0;
  
  return {
    config: performanceState.config,
    activeRequests: activeCount,
    averageActiveRequestTime: Math.round(avgActiveTime),
    circuitBreakers: circuitBreakers.filter(cb => cb.failures > 0),
    longestRunningRequest: activeRequests.length > 0 
      ? Math.max(...activeRequests.map(req => Date.now() - req.startTime))
      : 0
  };
};

// Função para matar todas as requisições ativas (emergência)
export const killAllActiveRequests = () => {
  console.warn(`🚨 EMERGÊNCIA: Matando ${performanceState.activeRequests.size} requisições ativas`);
  
  performanceState.activeRequests.forEach((request, requestId) => {
    if (request.timeout) {
      clearTimeout(request.timeout);
    }
    
    if (!request.res.headersSent) {
      request.res.status(503).json({
        success: false,
        message: 'Serviço reiniciado',
        error: 'Requisição cancelada por manutenção'
      });
    }
  });
  
  performanceState.activeRequests.clear();
};

// Função para resetar circuit breakers
export const resetCircuitBreakers = () => {
  performanceState.circuitBreakers.clear();
};

// Middleware para endpoints específicos com timeout customizado
export const withCustomTimeout = (timeoutMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: `Operação expirou após ${timeoutMs}ms`,
          error: 'Timeout customizado'
        });
      }
    }, timeoutMs);
    
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      clearTimeout(timeout);
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
};

// Event listeners para ações automáticas
performanceEvents.on('critical', (data) => {});

performanceEvents.on('slow', (data) => {
  // Log adicional ou métricas para requisições lentas
});

// Função para diagnóstico avançado
export const diagnosePerformanceIssues = () => {
  const stats = getAdvancedPerformanceStats();
  const issues = [];
  
  if (stats.activeRequests > 30) {
    issues.push('🚨 Muitas requisições ativas simultaneamente');
  }
  
  if (stats.averageActiveRequestTime > 10000) {
    issues.push('🐌 Tempo médio das requisições ativas muito alto');
  }
  
  if (stats.circuitBreakers.length > 0) {
    issues.push(`⚡ ${stats.circuitBreakers.length} circuit breaker(s) com falhas`);
  }
  
  if (stats.longestRunningRequest > 20000) {
    issues.push('⏰ Requisição muito longa em execução');
  }
  
  return {
    ...stats,
    issues,
    recommendations: issues.length > 0 ? [
      'Considere reiniciar o servidor se os problemas persistirem',
      'Verifique a conectividade com o banco de dados',
      'Monitore o uso de CPU e memória',
      'Analise queries SQL lentas'
    ] : ['Sistema funcionando normalmente']
  };
};

export { performanceEvents }; 