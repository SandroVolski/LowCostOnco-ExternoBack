import { Request, Response } from 'express';
import { SystemLogModel, SystemLog, PerformanceLog, SecurityLog } from '../models/SystemLog';

export class LogController {
  // Obter todos os logs com filtros
  static async getLogs(req: Request, res: Response) {
    try {
      const {
        level = 'all',
        category = 'all',
        userId,
        endpoint,
        startDate,
        endDate,
        search = '',
        page = 1,
        pageSize = 50
      } = req.query;

      const filters = {
        level: level as string,
        category: category as string,
        userId: userId ? parseInt(userId as string) : undefined,
        endpoint: endpoint as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      };

      const result = await SystemLogModel.find(filters);

      res.json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total: result.total,
            totalPages: Math.ceil(result.total / filters.pageSize)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter estatísticas dos logs
  static async getLogStats(req: Request, res: Response) {
    try {
      const stats = await SystemLogModel.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas dos logs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Criar novo log do sistema
  static async createLog(req: Request, res: Response) {
    try {
      const logData: SystemLog = {
        timestamp: new Date(),
        level: req.body.level || 'info',
        category: req.body.category || 'system',
        message: req.body.message,
        details: req.body.details,
        userId: req.body.userId,
        userAgent: req.body.userAgent || req.get('User-Agent'),
        ipAddress: req.body.ipAddress || req.ip,
        endpoint: req.body.endpoint || req.path,
        method: req.body.method || req.method,
        statusCode: req.body.statusCode,
        responseTime: req.body.responseTime,
        stackTrace: req.body.stackTrace,
        metadata: req.body.metadata
      };

      const logId = await SystemLogModel.create(logData);

      res.status(201).json({
        success: true,
        message: 'Log criado com sucesso',
        data: { id: logId }
      });
    } catch (error) {
      console.error('Erro ao criar log:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Criar log de performance
  static async createPerformanceLog(req: Request, res: Response) {
    try {
      const logData: PerformanceLog = {
        timestamp: new Date(),
        operation: req.body.operation,
        durationMs: req.body.durationMs,
        resource: req.body.resource,
        userId: req.body.userId,
        details: req.body.details
      };

      const logId = await SystemLogModel.createPerformanceLog(logData);

      res.status(201).json({
        success: true,
        message: 'Log de performance criado com sucesso',
        data: { id: logId }
      });
    } catch (error) {
      console.error('Erro ao criar log de performance:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Criar log de segurança
  static async createSecurityLog(req: Request, res: Response) {
    try {
      const logData: SecurityLog = {
        timestamp: new Date(),
        eventType: req.body.eventType,
        userId: req.body.userId,
        ipAddress: req.body.ipAddress || req.ip,
        userAgent: req.body.userAgent || req.get('User-Agent'),
        details: req.body.details,
        riskLevel: req.body.riskLevel || 'low'
      };

      const logId = await SystemLogModel.createSecurityLog(logData);

      res.status(201).json({
        success: true,
        message: 'Log de segurança criado com sucesso',
        data: { id: logId }
      });
    } catch (error) {
      console.error('Erro ao criar log de segurança:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Limpar logs antigos
  static async cleanOldLogs(req: Request, res: Response) {
    try {
      const { daysToKeep = 30 } = req.body;
      
      if (daysToKeep < 1 || daysToKeep > 365) {
        return res.status(400).json({
          success: false,
          message: 'Dias para manter deve estar entre 1 e 365'
        });
      }

      const deletedCount = await SystemLogModel.cleanOldLogs(daysToKeep);

      res.json({
        success: true,
        message: `${deletedCount} logs antigos foram removidos`,
        data: { deletedCount }
      });
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Exportar logs para CSV
  static async exportLogs(req: Request, res: Response) {
    try {
      const {
        level = 'all',
        category = 'all',
        startDate,
        endDate,
        search = ''
      } = req.query;

      const filters = {
        level: level as string,
        category: category as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        page: 1,
        pageSize: 10000 // Buscar todos para exportação
      };

      const result = await SystemLogModel.find(filters);

      // Converter para CSV
      const csvHeaders = [
        'ID',
        'Timestamp',
        'Level',
        'Category',
        'Message',
        'Details',
        'User ID',
        'IP Address',
        'Endpoint',
        'Method',
        'Status Code',
        'Response Time (ms)'
      ].join(',');

      const csvRows = result.logs.map(log => [
        log.id,
        log.timestamp,
        log.level,
        log.category,
        `"${log.message?.replace(/"/g, '""')}"`,
        `"${log.details?.replace(/"/g, '""')}"`,
        log.userId || '',
        log.ipAddress || '',
        log.endpoint || '',
        log.method || '',
        log.statusCode || '',
        log.responseTime || ''
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="system-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter logs de performance
  static async getPerformanceLogs(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 50 } = req.query;
      
      // Implementar busca de logs de performance
      // Por enquanto, retornar dados básicos
      res.json({
        success: true,
        data: {
          logs: [],
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            total: 0,
            totalPages: 0
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs de performance:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter logs de segurança
  static async getSecurityLogs(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 50 } = req.query;
      
      // Implementar busca de logs de segurança
      // Por enquanto, retornar dados básicos
      res.json({
        success: true,
        data: {
          logs: [],
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            total: 0,
            totalPages: 0
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs de segurança:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
