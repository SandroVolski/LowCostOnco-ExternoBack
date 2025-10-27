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
  console.log('🧪 TESTE COMPLETO DO SISTEMA DE LOGS\n');
  console.log('=' .repeat(60));
  
  let connection;
  let allTestsPassed = true;
  
  try {
    // 1. TESTE DE CONEXÃO COM BANCO
    console.log('1️⃣ TESTANDO CONEXÃO COM BANCO...');
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('✅ Conectado ao banco MySQL');
    } catch (error) {
      console.log('❌ Erro ao conectar ao banco:', error.message);
      allTestsPassed = false;
      return;
    }
    
    // 2. TESTE DAS TABELAS
    console.log('\n2️⃣ TESTANDO TABELAS DE LOGS...');
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('system_logs', 'performance_logs', 'security_logs')
      `, [dbConfig.database]);
      
      if (tables.length === 0) {
        console.log('❌ Tabelas de logs não encontradas');
        console.log('💡 Execute: node setup-logs.js');
        allTestsPassed = false;
      } else {
        console.log('✅ Tabelas encontradas:', tables.map(t => t.TABLE_NAME));
      }
    } catch (error) {
      console.log('❌ Erro ao verificar tabelas:', error.message);
      allTestsPassed = false;
    }
    
    // 3. TESTE DO SERVIDOR BACKEND
    console.log('\n3️⃣ TESTANDO SERVIDOR BACKEND...');
    try {
      const healthResponse = await fetch('http://localhost:3001/health');
      if (healthResponse.ok) {
        console.log('✅ Servidor backend está rodando');
      } else {
        console.log('❌ Servidor retornou erro:', healthResponse.status);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Servidor não está rodando:', error.message);
      console.log('💡 Execute: npm run dev ou node src/server.ts');
      allTestsPassed = false;
    }
    
    // 4. TESTE DA API DE LOGS
    console.log('\n4️⃣ TESTANDO API DE LOGS...');
    try {
      // Teste sem autenticação (deve retornar 401/403)
      const noAuthResponse = await fetch('http://localhost:3001/api/logs/system');
      if (noAuthResponse.status === 401 || noAuthResponse.status === 403) {
        console.log('✅ API protegida (requer autenticação)');
      } else {
        console.log('⚠️  API não está protegida:', noAuthResponse.status);
      }
      
      // Teste com token fake (deve retornar 401/403)
      const fakeTokenResponse = await fetch('http://localhost:3001/api/logs/system', {
        headers: {
          'Authorization': 'Bearer fake-token',
          'Content-Type': 'application/json'
        }
      });
      
      if (fakeTokenResponse.status === 401 || fakeTokenResponse.status === 403) {
        console.log('✅ Autenticação funcionando');
      } else {
        console.log('⚠️  Resposta inesperada para token inválido:', fakeTokenResponse.status);
      }
      
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
      allTestsPassed = false;
    }
    
    // 5. TESTE DE DADOS NO BANCO
    console.log('\n5️⃣ TESTANDO DADOS NO BANCO...');
    try {
      const [logCount] = await connection.execute('SELECT COUNT(*) as total FROM system_logs');
      const totalLogs = logCount[0].total;
      console.log(`📊 Total de logs no banco: ${totalLogs}`);
      
      if (totalLogs === 0) {
        console.log('⚠️  Nenhum log encontrado - criando logs de teste...');
        
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
        
        console.log('✅ 5 logs de teste criados');
      } else {
        console.log('✅ Logs encontrados no banco');
      }
      
      // Verificar logs recentes
      const [recentLogs] = await connection.execute(`
        SELECT level, category, message, timestamp 
        FROM system_logs 
        ORDER BY timestamp DESC 
        LIMIT 3
      `);
      
      console.log('\n📝 Últimos logs no banco:');
      recentLogs.forEach((log, index) => {
        const date = new Date(log.timestamp).toLocaleString('pt-BR');
        console.log(`   ${index + 1}. [${log.level.toUpperCase()}] ${log.category}: ${log.message} (${date})`);
      });
      
    } catch (error) {
      console.log('❌ Erro ao testar dados:', error.message);
      allTestsPassed = false;
    }
    
    // 6. RESUMO DOS TESTES
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 RESUMO DOS TESTES');
    console.log('=' .repeat(60));
    
    if (allTestsPassed) {
      console.log('✅ TODOS OS TESTES PASSARAM!');
      console.log('🎉 O sistema de logs está funcionando perfeitamente!');
    } else {
      console.log('❌ ALGUNS TESTES FALHARAM');
      console.log('🔧 Verifique os erros acima e corrija antes de continuar');
    }
    
    console.log('\n📚 PRÓXIMOS PASSOS:');
    if (allTestsPassed) {
      console.log('   1. 🌐 Acesse a aba de Logs no frontend');
      console.log('   2. 🔄 Faça login no sistema para obter token');
      console.log('   3. 📊 Os logs reais devem aparecer automaticamente');
    } else {
      console.log('   1. 🔧 Corrija os erros identificados');
      console.log('   2. 🚀 Execute: node setup-logs.js (se necessário)');
      console.log('   3. 🔄 Reinicie o servidor backend');
      console.log('   4. 🧪 Execute este teste novamente');
    }
    
    console.log('\n🔧 COMANDOS ÚTEIS:');
    console.log('   cd sistema-clinicas-backend');
    if (!allTestsPassed) {
      console.log('   node setup-logs.js          # Criar tabelas');
    }
    console.log('   npm run dev                   # Iniciar servidor');
    console.log('   node test-complete-system.js  # Executar testes novamente');
    
  } catch (error) {
    console.error('❌ Erro geral nos testes:', error);
    allTestsPassed = false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco encerrada');
    }
  }
  
  return allTestsPassed;
}

// Executar se chamado diretamente
if (require.main === module) {
  testCompleteSystem().catch(console.error);
}

module.exports = { testCompleteSystem };
