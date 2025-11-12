#!/usr/bin/env node

/**
 * Script completo para testar o sistema de logs
 * Execute: node test-complete-system.js
 */

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_sistema_clinicas',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function testCompleteSystem() {
  let connection;
  let allTestsPassed = true;

  try {
    try {
      connection = await mysql.createConnection(dbConfig);
    } catch (error) {
      allTestsPassed = false;
      return;
    }

    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('system_logs', 'performance_logs', 'security_logs')
      `, [dbConfig.database]);
      
      if (tables.length === 0) {
        allTestsPassed = false;
      } else {}
    } catch (error) {
      allTestsPassed = false;
    }

    try {
      const healthResponse = await fetch('http://localhost:3001/health');
      if (healthResponse.ok) {} else {
        allTestsPassed = false;
      }
    } catch (error) {
      allTestsPassed = false;
    }

    try {
      // Teste sem autenticação (deve retornar 401/403)
      const noAuthResponse = await fetch('http://localhost:3001/api/logs/system');
      if (noAuthResponse.status === 401 || noAuthResponse.status === 403) {} else {}
      
      // Teste com token fake (deve retornar 401/403)
      const fakeTokenResponse = await fetch('http://localhost:3001/api/logs/system', {
        headers: {
          'Authorization': 'Bearer fake-token',
          'Content-Type': 'application/json'
        }
      });
      
      if (fakeTokenResponse.status === 401 || fakeTokenResponse.status === 403) {} else {}
      
    } catch (error) {
      allTestsPassed = false;
    }

    try {
      const [logCount] = await connection.execute('SELECT COUNT(*) as total FROM system_logs');
      const totalLogs = logCount[0].total;

      if (totalLogs === 0) {
        // Criar logs de teste
        await connection.execute(`
          INSERT INTO system_logs (level, category, message, details, endpoint, method, status_code, response_time) 
          VALUES 
          ('info', 'system', 'Sistema de logs testado', 'Teste automático do sistema', '/api/logs/test', 'GET', 200, 25),
          ('info', 'database', 'Conexão com banco verificada', 'Teste de conexão bem-sucedido', '/api/health', 'GET', 200, 15),
          ('info', 'api', 'API de logs funcionando', 'Todos os endpoints respondendo', '/api/logs/system', 'GET', 200, 35),
          ('warn', 'performance', 'Teste de performance', 'Sistema funcionando dentro dos parâmetros', '/api/test', 'GET', 200, 120),
          ('error', 'system', 'Log de erro de teste', 'Este é um log de teste para verificar o sistema', '/api/test/error', 'POST', 500, 250)
        `);
      } else {}

      // Verificar logs recentes
      const [recentLogs] = await connection.execute(`
        SELECT level, category, message, timestamp 
        FROM system_logs 
        ORDER BY timestamp DESC 
        LIMIT 3
      `);

      recentLogs.forEach((log, index) => {
        const date = new Date(log.timestamp).toLocaleString('pt-BR');
      });
    } catch (error) {
      allTestsPassed = false;
    }

    if (allTestsPassed) {} else {}

    if (allTestsPassed) {} else {}

    if (!allTestsPassed) {}
  } catch (error) {
    console.error('❌ Erro geral nos testes:', error);
    allTestsPassed = false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  return allTestsPassed;
}

// Executar se chamado diretamente
if (require.main === module) {
  testCompleteSystem().catch(console.error);
}

module.exports = { testCompleteSystem };
