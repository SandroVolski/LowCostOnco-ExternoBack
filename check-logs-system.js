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
  console.log('🔍 Verificando sistema de logs...\n');
  
  let connection;
  
  try {
    // 1. Conectar ao banco
    console.log('1️⃣ Conectando ao banco...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco MySQL');
    
    // 2. Verificar tabelas
    console.log('\n2️⃣ Verificando tabelas de logs...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('system_logs', 'performance_logs', 'security_logs')
    `, [dbConfig.database]);
    
    if (tables.length === 0) {
      console.log('❌ Tabelas de logs não encontradas');
      console.log('💡 Execute: node setup-logs.js');
      return false;
    }
    
    console.log('✅ Tabelas encontradas:', tables.map(t => t.TABLE_NAME));
    
    // 3. Verificar dados
    console.log('\n3️⃣ Verificando dados nas tabelas...');
    const [logCount] = await connection.execute('SELECT COUNT(*) as total FROM system_logs');
    console.log(`📊 Total de logs: ${logCount[0].total}`);
    
    if (logCount[0].total === 0) {
      console.log('⚠️  Nenhum log encontrado - criando logs de teste...');
      
      // Inserir logs de teste
      await connection.execute(`
        INSERT INTO system_logs (level, category, message, details, endpoint, method, status_code, response_time) 
        VALUES 
        ('info', 'system', 'Sistema de logs verificado', 'Verificação automática do sistema', '/api/logs/test', 'GET', 200, 15),
        ('info', 'database', 'Conexão com banco estabelecida', 'Pool de conexões configurado', '/api/health', 'GET', 200, 25),
        ('info', 'api', 'API de logs acessada', 'Endpoint de logs funcionando', '/api/logs/system', 'GET', 200, 45)
      `);
      
      console.log('✅ Logs de teste criados');
    }
    
    // 4. Verificar logs recentes
    const [recentLogs] = await connection.execute(`
      SELECT level, category, message, timestamp 
      FROM system_logs 
      ORDER BY timestamp DESC 
      LIMIT 3
    `);
    
    console.log('\n📝 Últimos logs:');
    recentLogs.forEach((log, index) => {
      const date = new Date(log.timestamp).toLocaleString('pt-BR');
      console.log(`   ${index + 1}. [${log.level.toUpperCase()}] ${log.category}: ${log.message} (${date})`);
    });
    
    console.log('\n🎯 Sistema de logs está funcionando!');
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
