import { pool } from '../config/database';

export interface SystemLog {
  id?: number;
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: 'system' | 'database' | 'api' | 'auth' | 'user' | 'performance' | 'security';
  message: string;
  details?: string;
  userId?: number;
  userAgent?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  stackTrace?: string;
  metadata?: any;
  createdAt?: Date;
}

export interface PerformanceLog {
  id?: number;
  timestamp: Date;
  operation: string;
  durationMs: number;
  resource?: string;
  userId?: number;
  details?: any;
  createdAt?: Date;
}

export interface SecurityLog {
  id?: number;
  timestamp: Date;
  eventType: 'login' | 'logout' | 'failed_login' | 'password_change' | 'permission_change' | 'data_access' | 'data_modification';
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: Date;
}

const sanitize = (v: any) => (v === undefined ? null : v);

export class SystemLogModel {
  // Criar novo log do sistema
  static async create(log: SystemLog): Promise<number> {
    try {
      const [result] = await pool.execute(
        `INSERT INTO system_logs (
          timestamp, level, category, message, details, user_id, 
          user_agent, ip_address, endpoint, method, status_code, 
          response_time, stack_trace, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitize(log.timestamp),
          sanitize(log.level),
          sanitize(log.category),
          sanitize(log.message),
          sanitize(log.details),
          sanitize(log.userId),
          sanitize(log.userAgent),
          sanitize(log.ipAddress),
          sanitize(log.endpoint),
          sanitize(log.method),
          sanitize(log.statusCode),
          sanitize(log.responseTime),
          sanitize(log.stackTrace),
          log.metadata ? JSON.stringify(log.metadata) : null
        ]
      );
      
      return (result as any).insertId;
    } catch (error) {
      console.error('Erro ao criar log do sistema:', error);
      throw error;
    }
  }

  // Buscar logs com filtros
  static async find(filters: {
    level?: string;
    category?: string;
    userId?: number;
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ logs: SystemLog[], total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.level && filters.level !== 'all') {
        whereClause += ' AND level = ?';
        params.push(filters.level);
      }

      if (filters.category && filters.category !== 'all') {
        whereClause += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.userId) {
        whereClause += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.endpoint) {
        whereClause += ' AND endpoint LIKE ?';
        params.push(`%${filters.endpoint}%`);
      }

      if (filters.startDate) {
        whereClause += ' AND timestamp >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClause += ' AND timestamp <= ?';
        params.push(filters.endDate);
      }

      if (filters.search) {
        whereClause += ' AND (message LIKE ? OR details LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      // Contar total de registros
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM system_logs ${whereClause}`,
        params
      );
      const total = (countResult as any)[0].total;

      // Buscar logs com paginação
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 50;
      const offset = (page - 1) * pageSize;

      const [logsResult] = await pool.execute(
        `SELECT * FROM system_logs ${whereClause} 
         ORDER BY timestamp DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      const logs = (logsResult as any[]).map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        level: row.level,
        category: row.category,
        message: row.message,
        details: row.details,
        userId: row.user_id,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        endpoint: row.endpoint,
        method: row.method,
        statusCode: row.status_code,
        responseTime: row.response_time,
        stackTrace: row.stack_trace,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        createdAt: row.created_at
      }));

      return { logs, total };
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      throw error;
    }
    }

  // Criar log de performance
  static async createPerformanceLog(log: PerformanceLog): Promise<number> {
    try {
      const [result] = await pool.execute(
        `INSERT INTO performance_logs (
          timestamp, operation, duration_ms, resource, user_id, details
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sanitize(log.timestamp),
          sanitize(log.operation),
          sanitize(log.durationMs),
          sanitize(log.resource),
          sanitize(log.userId),
          log.details ? JSON.stringify(log.details) : null
        ]
      );
      
      return (result as any).insertId;
    } catch (error) {
      console.error('Erro ao criar log de performance:', error);
      throw error;
    }
  }

  // Criar log de segurança
  static async createSecurityLog(log: SecurityLog): Promise<number> {
    try {
      const [result] = await pool.execute(
        `INSERT INTO security_logs (
          timestamp, event_type, user_id, ip_address, user_agent, details, risk_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitize(log.timestamp),
          sanitize(log.eventType),
          sanitize(log.userId),
          sanitize(log.ipAddress),
          sanitize(log.userAgent),
          sanitize(log.details),
          sanitize(log.riskLevel)
        ]
      );
      
      return (result as any).insertId;
    } catch (error) {
      console.error('Erro ao criar log de segurança:', error);
      throw error;
    }
  }

  // Limpar logs antigos
  static async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const [result] = await pool.execute(
        'DELETE FROM system_logs WHERE timestamp < ?',
        [cutoffDate]
      );

      return (result as any).affectedRows;
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
      throw error;
    }
  }

  // Obter estatísticas dos logs
  static async getStats(): Promise<{
    totalLogs: number;
    logsByLevel: { [key: string]: number };
    logsByCategory: { [key: string]: number };
    recentErrors: number;
    averageResponseTime: number;
  }> {
    try {
      const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM system_logs');
      const [levelResult] = await pool.execute('SELECT level, COUNT(*) as count FROM system_logs GROUP BY level');
      const [categoryResult] = await pool.execute('SELECT category, COUNT(*) as count FROM system_logs GROUP BY category');
      const [errorResult] = await pool.execute('SELECT COUNT(*) as count FROM system_logs WHERE level = "error" AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
      const [responseTimeResult] = await pool.execute('SELECT AVG(response_time) as avg FROM system_logs WHERE response_time IS NOT NULL');

      const totalLogs = (totalResult as any)[0].total;
      const logsByLevel = (levelResult as any[]).reduce((acc, row) => {
        acc[row.level] = row.count;
        return acc;
      }, {});
      const logsByCategory = (categoryResult as any[]).reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {});
      const recentErrors = (errorResult as any)[0].count;
      const averageResponseTime = (responseTimeResult as any)[0].avg || 0;

      return {
        totalLogs,
        logsByLevel,
        logsByCategory,
        recentErrors,
        averageResponseTime
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas dos logs:', error);
      throw error;
    }
  }
}
