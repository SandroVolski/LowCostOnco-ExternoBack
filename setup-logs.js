#!/usr/bin/env node

/**
 * Script para configurar o sistema de logs
 * Execute: node setup-logs.js
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

async function setupLogs() {
  let connection;
  
  try {
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);

    // Ler e executar o script SQL
    const fs = require('fs');
    const path = require('path');

    const sqlFile = path.join(__dirname, 'database-logs.sql');

    if (!fs.existsSync(sqlFile)) {
      console.error('❌ Arquivo database-logs.sql não encontrado');
      return;
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Dividir o SQL em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          await connection.execute(command);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {} else {
            console.error(`❌ Erro no comando ${i + 1}:`, error.message);
          }
        }
      }
    }

    // Verificar se as tabelas foram criadas
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('system_logs', 'performance_logs', 'security_logs')
    `, [dbConfig.database]);

    tables.forEach(table => {});

    // Verificar estrutura das tabelas
    for (const table of tables) {
      const [columns] = await connection.execute(`
        DESCRIBE ${table.TABLE_NAME}
      `);

      columns.forEach(col => {});
    }

    const testLogs = [
      {
        level: 'info',
        category: 'system',
        message: 'Sistema de logs configurado com sucesso',
        details: 'Tabelas criadas e sistema inicializado',
        endpoint: '/setup',
        method: 'POST',
        statusCode: 200,
        responseTime: 150
      },
      {
        level: 'info',
        category: 'database',
        message: 'Conexão com banco estabelecida',
        details: 'Pool de conexões MySQL configurado',
        endpoint: '/health',
        method: 'GET',
        statusCode: 200,
        responseTime: 25
      },
      {
        level: 'warn',
        category: 'performance',
        message: 'Primeira execução do sistema',
        details: 'Sistema iniciando pela primeira vez',
        endpoint: '/startup',
        method: 'GET',
        statusCode: 200,
        responseTime: 1200
      }
    ];

    for (const log of testLogs) {
      await connection.execute(`
        INSERT INTO system_logs (
          timestamp, level, category, message, details, 
          endpoint, method, status_code, response_time
        ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)
      `, [
        log.level, log.category, log.message, log.details,
        log.endpoint, log.method, log.statusCode, log.responseTime
      ]);
    }

    // Verificar contagem de logs
    const [logCount] = await connection.execute('SELECT COUNT(*) as total FROM system_logs');
  } catch (error) {
    console.error('❌ Erro ao configurar sistema de logs:', error);
    
    if (error.code === 'ECONNREFUSED') {}
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupLogs().catch(console.error);
}

module.exports = { setupLogs };
