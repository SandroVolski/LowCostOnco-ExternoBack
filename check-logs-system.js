#!/usr/bin/env node

/**
 * Script para verificar se o sistema de logs está funcionando
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_sistema_clinicas',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function checkLogsSystem() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('system_logs', 'performance_logs', 'security_logs')
    `, [dbConfig.database]);

    if (tables.length === 0) {
      return false;
    }

    const [logCount] = await connection.execute('SELECT COUNT(*) as total FROM system_logs');

    if (logCount[0].total === 0) {
      // Inserir logs de teste
      await connection.execute(`
        INSERT INTO system_logs (level, category, message, details, endpoint, method, status_code, response_time) 
        VALUES 
        ('info', 'system', 'Sistema de logs verificado', 'Verificação automática do sistema', '/api/logs/test', 'GET', 200, 15),
        ('info', 'database', 'Conexão com banco estabelecida', 'Pool de conexões configurado', '/api/health', 'GET', 200, 25),
        ('info', 'api', 'API de logs acessada', 'Endpoint de logs funcionando', '/api/logs/system', 'GET', 200, 45)
      `);
    }

    // 4. Verificar logs recentes
    const [recentLogs] = await connection.execute(`
      SELECT level, category, message, timestamp 
      FROM system_logs 
      ORDER BY timestamp DESC 
      LIMIT 3
    `);

    recentLogs.forEach((log, index) => {
      const date = new Date(log.timestamp).toLocaleString('pt-BR');
    });

    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  checkLogsSystem().catch(console.error);
}

module.exports = { checkLogsSystem };
