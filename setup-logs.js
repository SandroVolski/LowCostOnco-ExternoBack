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
    console.log('🔧 Configurando sistema de logs...');
    
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
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
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          await connection.execute(command);
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`ℹ️  Tabela já existe (comando ${i + 1})`);
          } else {
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
    
    console.log('\n📊 Tabelas de logs criadas:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });
    
    // Verificar estrutura das tabelas
    for (const table of tables) {
      const [columns] = await connection.execute(`
        DESCRIBE ${table.TABLE_NAME}
      `);
      
      console.log(`\n🔍 Estrutura da tabela ${table.TABLE_NAME}:`);
      columns.forEach(col => {
        console.log(`   ${col.Field} - ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    }
    
    // Inserir logs de teste
    console.log('\n🧪 Inserindo logs de teste...');
    
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
    
    console.log('✅ Logs de teste inseridos com sucesso');
    
    // Verificar contagem de logs
    const [logCount] = await connection.execute('SELECT COUNT(*) as total FROM system_logs');
    console.log(`📊 Total de logs no sistema: ${logCount[0].total}`);
    
    console.log('\n🎉 Sistema de logs configurado com sucesso!');
    console.log('\n📚 Próximos passos:');
    console.log('   1. Reinicie o servidor backend');
    console.log('   2. Acesse a aba de Logs no painel admin');
    console.log('   3. Os logs reais aparecerão automaticamente');
    
  } catch (error) {
    console.error('❌ Erro ao configurar sistema de logs:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Dicas de solução:');
      console.log('   - Verifique se o MySQL está rodando');
      console.log('   - Confirme as credenciais no arquivo .env');
      console.log('   - Teste a conexão com: node test-db-connection.js');
    }
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupLogs().catch(console.error);
}

module.exports = { setupLogs };
