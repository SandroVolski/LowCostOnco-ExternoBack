import { Request, Response, NextFunction } from 'express';
import { SystemLogModel } from '../models/SystemLog';

export interface LoggedRequest extends Request {
  startTime?: number;
  logId?: number;
}

export const loggingMiddleware = async (req: LoggedRequest, res: Response, next: NextFunction) => {
  // Capturar tempo de início
  req.startTime = Date.now();
  
  // Capturar informações da requisição
  const requestInfo = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date()
  };

  // Interceptar o final da resposta
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - (req.startTime || 0);
    
    // Determinar nível do log baseado no status code
    let level: 'error' | 'warn' | 'info' | 'debug' = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';
    else if (res.statusCode >= 300) level = 'info';
    else level = 'info';

    // Determinar categoria baseada no endpoint
    let category: 'system' | 'database' | 'api' | 'auth' | 'user' | 'performance' | 'security' = 'api';
    if (req.path.includes('/auth')) category = 'auth';
    else if (req.path.includes('/database') || req.path.includes('/db')) category = 'database';
    else if (req.path.includes('/performance')) category = 'performance';
    else if (req.path.includes('/security')) category = 'security';
    else if (req.path.includes('/user') || req.path.includes('/profile')) category = 'user';

    // Criar log da requisição
    const logData = {
      timestamp: requestInfo.timestamp,
      level,
      category,
      message: `${req.method} ${req.path} - ${res.statusCode}`,
      details: `Requisição processada em ${responseTime}ms`,
      userId: requestInfo.userId,
      userAgent: requestInfo.userAgent,
      ipAddress: requestInfo.ip,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      metadata: {
        requestBody: req.body,
        queryParams: req.query,
        headers: {
          'content-type': req.get('Content-Type'),
          'authorization': req.get('Authorization') ? 'Bearer ***' : undefined,
          'user-agent': req.get('User-Agent')
        }
      }
    };

    // Logar de forma assíncrona (não bloquear a resposta)
    SystemLogModel.create(logData).catch(error => {
      console.error('Erro ao criar log automático:', error);
    });

    // Chamar o método send original
    return originalSend.call(this, data);
  };

  next();
};

// Middleware para logging de erros
export const errorLoggingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const logData = {
    timestamp: new Date(),
    level: 'error' as const,
    category: 'system' as const,
    message: `Erro na requisição: ${error.message}`,
    details: error.stack,
    userId: (req as any).user?.id,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    endpoint: req.path,
    method: req.method,
    statusCode: res.statusCode || 500,
    stackTrace: error.stack,
    metadata: {
      errorName: error.name,
      errorMessage: error.message,
      requestBody: req.body,
      queryParams: req.query
    }
  };

  // Logar erro de forma assíncrona
  SystemLogModel.create(logData).catch(logError => {
    console.error('Erro ao criar log de erro:', logError);
  });

  next(error);
};

// Função para logging manual de eventos específicos
export const logEvent = async (eventData: {
  level: 'error' | 'warn' | 'info' | 'debug';
  category: 'system' | 'database' | 'api' | 'auth' | 'user' | 'performance' | 'security';
  message: string;
  details?: string;
  userId?: number;
  metadata?: any;
}) => {
  try {
    await SystemLogModel.create({
      timestamp: new Date(),
      ...eventData
    });
  } catch (error) {
    console.error('Erro ao criar log manual:', error);
  }
};

// Função para logging de performance
export const logPerformance = async (operation: string, durationMs: number, resource?: string, userId?: number, details?: any) => {
  try {
    await SystemLogModel.createPerformanceLog({
      timestamp: new Date(),
      operation,
      durationMs,
      resource,
      userId,
      details
    });
  } catch (error) {
    console.error('Erro ao criar log de performance:', error);
  }
};

// Função para logging de segurança
export const logSecurityEvent = async (
  eventType: 'login' | 'logout' | 'failed_login' | 'password_change' | 'permission_change' | 'data_access' | 'data_modification',
  userId?: number,
  ipAddress?: string,
  userAgent?: string,
  details?: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
) => {
  try {
    await SystemLogModel.createSecurityLog({
      timestamp: new Date(),
      eventType,
      userId,
      ipAddress,
      userAgent,
      details,
      riskLevel
    });
  } catch (error) {
    console.error('Erro ao criar log de segurança:', error);
  }
};
