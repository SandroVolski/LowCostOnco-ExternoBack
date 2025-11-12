import { Request, Response, NextFunction } from 'express';

// Interface para métricas de performance
interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
}

// Armazenamento de métricas
const performanceStore = new Map<string, PerformanceMetrics>();

// Função para gerar ID único
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Middleware para monitorar performance
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Criar métrica inicial
  const metric: PerformanceMetrics = {
    requestId,
    method: req.method,
    path: req.path,
    startTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress || 'unknown'
  };
  
  performanceStore.set(requestId, metric);
  
  // Interceptar resposta para capturar dados finais
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Atualizar métrica
    const updatedMetric = performanceStore.get(requestId);
    if (updatedMetric) {
      updatedMetric.endTime = endTime;
      updatedMetric.duration = duration;
      updatedMetric.statusCode = res.statusCode;
      
      // Log de performance lenta
      if (duration > 5000) { // Mais de 5 segundos
        console.warn(`🐌 Requisição lenta detectada: ${req.method} ${req.path} - ${duration}ms`);
      }
      
      // Limpar métricas antigas (mais de 1 hora)
      if (performanceStore.size > 1000) {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [key, value] of performanceStore.entries()) {
          if (value.startTime < oneHourAgo) {
            performanceStore.delete(key);
          }
        }
      }
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Função para obter estatísticas de performance
export const getPerformanceStats = () => {
  const now = Date.now();
  const metrics = Array.from(performanceStore.values());
  
  // Filtrar métricas das últimas 24 horas
  const last24Hours = metrics.filter(m => m.startTime > now - (24 * 60 * 60 * 1000));
  
  // Calcular estatísticas
  const totalRequests = last24Hours.length;
  const completedRequests = last24Hours.filter(m => m.duration !== undefined);
  
  if (completedRequests.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      topSlowEndpoints: []
    };
  }
  
  const averageResponseTime = completedRequests.reduce((sum, m) => sum + (m.duration || 0), 0) / completedRequests.length;
  const slowRequests = completedRequests.filter(m => (m.duration || 0) > 5000).length;
  const errorRequests = completedRequests.filter(m => (m.statusCode || 200) >= 400).length;
  const errorRate = (errorRequests / completedRequests.length) * 100;
  
  // Top endpoints mais lentos
  const endpointStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();
  
  completedRequests.forEach(m => {
    const key = `${m.method} ${m.path}`;
    const current = endpointStats.get(key) || { count: 0, totalTime: 0, avgTime: 0 };
    current.count++;
    current.totalTime += m.duration || 0;
    current.avgTime = current.totalTime / current.count;
    endpointStats.set(key, current);
  });
  
  const topSlowEndpoints = Array.from(endpointStats.entries())
    .sort((a, b) => b[1].avgTime - a[1].avgTime)
    .slice(0, 10)
    .map(([endpoint, stats]) => ({
      endpoint,
      averageTime: Math.round(stats.avgTime),
      requestCount: stats.count
    }));
  
  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    slowRequests,
    errorRate: Math.round(errorRate * 100) / 100,
    topSlowEndpoints
  };
};

// Função para diagnosticar problemas de performance
export const diagnosePerformanceIssues = () => {
  const stats = getPerformanceStats();
  const issues: string[] = [];
  
  if (stats.averageResponseTime > 2000) {
    issues.push(`⚠️ Tempo médio de resposta alto: ${stats.averageResponseTime}ms`);
  }
  
  if (stats.slowRequests > 10) {
    issues.push(`🐌 Muitas requisições lentas: ${stats.slowRequests}`);
  }
  
  if (stats.errorRate > 5) {
    issues.push(`❌ Taxa de erro alta: ${stats.errorRate}%`);
  }
  
  if (stats.totalRequests > 1000) {
    issues.push(`📊 Alto volume de requisições: ${stats.totalRequests} nas últimas 24h`);
  }
  
  return {
    issues,
    recommendations: [
      'Considere implementar cache mais agressivo',
      'Otimize queries do banco de dados',
      'Implemente paginação em listagens grandes',
      'Monitore o uso de memória do servidor',
      'Considere usar CDN para arquivos estáticos'
    ]
  };
};

// Função para limpar métricas antigas
export const cleanupOldMetrics = () => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  let deletedCount = 0;

  for (const [key, value] of performanceStore.entries()) {
    if (value.startTime < oneDayAgo) {
      performanceStore.delete(key);
      deletedCount++;
    }
  }

  return deletedCount;
};

// Executar limpeza automática a cada hora
setInterval(cleanupOldMetrics, 60 * 60 * 1000); 