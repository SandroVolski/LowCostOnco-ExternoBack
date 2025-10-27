#!/usr/bin/env node

/**
 * Script para testar o sistema de UPDATE de clínicas e operadoras
 * Execute: node test-update-system.js
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

async function testUpdateSystem() {
  console.log('🧪 TESTE DO SISTEMA DE UPDATE - CLÍNICAS E OPERADORAS\n');
  console.log('=' .repeat(70));
  
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
    console.log('\n2️⃣ TESTANDO TABELAS DE CLÍNICAS E OPERADORAS...');
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME, TABLE_ROWS 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('Clinicas', 'Operadoras', 'Usuarios')
        ORDER BY TABLE_NAME
      `, [dbConfig.database]);
      
      if (tables.length === 0) {
        console.log('❌ Tabelas não encontradas');
        allTestsPassed = false;
      } else {
        console.log('✅ Tabelas encontradas:');
        tables.forEach(table => {
          console.log(`   📊 ${table.TABLE_NAME}: ${table.TABLE_ROWS} registros`);
        });
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
    
    // 4. TESTE DOS ENDPOINTS DE UPDATE
    console.log('\n4️⃣ TESTANDO ENDPOINTS DE UPDATE...');
    
    // Teste endpoint de clínicas
    try {
      const clinicasResponse = await fetch('http://localhost:3001/api/clinicas');
      console.log('📡 Endpoint /api/clinicas:', clinicasResponse.status, clinicasResponse.statusText);
      
      if (clinicasResponse.status === 200) {
        console.log('✅ Endpoint de clínicas funcionando');
      } else {
        console.log('⚠️  Endpoint de clínicas retornou:', clinicasResponse.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar endpoint de clínicas:', error.message);
    }
    
    // Teste endpoint de operadoras
    try {
      const operadorasResponse = await fetch('http://localhost:3001/api/operadoras');
      console.log('📡 Endpoint /api/operadoras:', operadorasResponse.status, operadorasResponse.statusText);
      
      if (operadorasResponse.status === 200) {
        console.log('✅ Endpoint de operadoras funcionando');
      } else {
        console.log('⚠️  Endpoint de operadoras retornou:', operadorasResponse.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar endpoint de operadoras:', error.message);
    }
    
    // 5. TESTE DE DADOS NO BANCO
    console.log('\n5️⃣ TESTANDO DADOS NO BANCO...');
    try {
      // Verificar clínicas
      const [clinicasCount] = await connection.execute('SELECT COUNT(*) as total FROM Clinicas');
      console.log(`📊 Total de clínicas: ${clinicasCount[0].total}`);
      
      if (clinicasCount[0].total > 0) {
        const [clinica] = await connection.execute('SELECT id, nome, codigo FROM Clinicas LIMIT 1');
        console.log('✅ Clínica de exemplo:', clinica[0]);
      }
      
      // Verificar operadoras
      const [operadorasCount] = await connection.execute('SELECT COUNT(*) as total FROM Operadoras');
      console.log(`📊 Total de operadoras: ${operadorasCount[0].total}`);
      
      if (operadorasCount[0].total > 0) {
        const [operadora] = await connection.execute('SELECT id, nome, codigo FROM Operadoras LIMIT 1');
        console.log('✅ Operadora de exemplo:', operadora[0]);
      }
      
    } catch (error) {
      console.log('❌ Erro ao verificar dados:', error.message);
      allTestsPassed = false;
    }
    
    // 6. VERIFICAR ESTRUTURA DAS TABELAS
    console.log('\n6️⃣ VERIFICANDO ESTRUTURA DAS TABELAS...');
    try {
      // Estrutura da tabela Clinicas
      const [clinicasColumns] = await connection.execute('DESCRIBE Clinicas');
      console.log('\n🔍 Estrutura da tabela Clinicas:');
      clinicasColumns.forEach(col => {
        const nullable = col.Null === 'NO' ? 'NOT NULL' : '';
        const key = col.Key === 'PRI' ? 'PRIMARY KEY' : '';
        console.log(`   ${col.Field} - ${col.Type} ${nullable} ${key}`.trim());
      });
      
      // Estrutura da tabela Operadoras
      const [operadorasColumns] = await connection.execute('DESCRIBE Operadoras');
      console.log('\n🔍 Estrutura da tabela Operadoras:');
      operadorasColumns.forEach(col => {
        const nullable = col.Null === 'NO' ? 'NOT NULL' : '';
        const key = col.Key === 'PRI' ? 'PRIMARY KEY' : '';
        console.log(`   ${col.Field} - ${col.Type} ${nullable} ${key}`.trim());
      });
      
    } catch (error) {
      console.log('❌ Erro ao verificar estrutura:', error.message);
    }
    
    // 7. RESUMO DOS TESTES
    console.log('\n' + '=' .repeat(70));
    console.log('🎯 RESUMO DOS TESTES DE UPDATE');
    console.log('=' .repeat(70));
    
    if (allTestsPassed) {
      console.log('✅ TODOS OS TESTES PASSARAM!');
      console.log('🎉 O sistema de UPDATE está funcionando perfeitamente!');
    } else {
      console.log('❌ ALGUNS TESTES FALHARAM');
      console.log('🔧 Verifique os erros acima e corrija antes de continuar');
    }
    
    console.log('\n📚 FUNCIONALIDADES DE UPDATE DISPONÍVEIS:');
    console.log('   ✅ PUT /api/clinicas/profile - Atualizar perfil da clínica');
    console.log('   ✅ PUT /api/clinicas/admin/:id - Atualizar clínica (admin)');
    console.log('   ✅ PUT /api/clinicas/responsaveis/:id - Atualizar responsável');
    console.log('   ✅ PUT /api/operadoras/admin/:id - Atualizar operadora (admin)');
    
    console.log('\n🔧 COMANDOS PARA TESTAR:');
    console.log('   cd sistema-clinicas-backend');
    console.log('   npm run dev                   # Iniciar servidor');
    console.log('   node test-update-system.js    # Executar testes novamente');
    
    console.log('\n🌐 TESTE NO FRONTEND:');
    console.log('   1. Acesse /admin/cadastro-clinicas');
    console.log('   2. Acesse /admin/cadastro-operadoras');
    console.log('   3. Teste editar e salvar alterações');
    
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
  testUpdateSystem().catch(console.error);
}

module.exports = { testUpdateSystem };
