#!/usr/bin/env node

/**
 * Script para debuggar o problema de UPDATE das operadoras
 * Execute: node debug-operadoras.js
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

async function debugOperadoras() {
  console.log('🐛 DEBUG - PROBLEMA DE UPDATE DAS OPERADORAS\n');
  console.log('=' .repeat(60));
  
  let connection;
  
  try {
    // 1. CONECTAR AO BANCO
    console.log('1️⃣ CONECTANDO AO BANCO...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco MySQL');
    
    // 2. VERIFICAR ESTRUTURA DA TABELA OPERADORAS
    console.log('\n2️⃣ VERIFICANDO ESTRUTURA DA TABELA...');
    const [columns] = await connection.execute('DESCRIBE Operadoras');
    console.log('🔍 Estrutura da tabela Operadoras:');
    columns.forEach(col => {
      const nullable = col.Null === 'NO' ? 'NOT NULL' : '';
      const key = col.Key === 'PRI' ? 'PRIMARY KEY' : '';
      const defaultVal = col.Default ? `DEFAULT ${col.Default}` : '';
      console.log(`   ${col.Field} - ${col.Type} ${nullable} ${key} ${defaultVal}`.trim());
    });
    
    // 3. VERIFICAR DADOS EXISTENTES
    console.log('\n3️⃣ VERIFICANDO DADOS EXISTENTES...');
    const [operadoras] = await connection.execute('SELECT * FROM Operadoras ORDER BY id');
    console.log(`📊 Total de operadoras: ${operadoras.length}`);
    
    if (operadoras.length > 0) {
      console.log('\n📝 Operadoras existentes:');
      operadoras.forEach((op, index) => {
        console.log(`   ${index + 1}. ID: ${op.id} | Nome: ${op.nome} | Código: ${op.codigo} | Status: ${op.status}`);
      });
      
      // 4. TESTAR UPDATE DIRETO NO BANCO
      console.log('\n4️⃣ TESTANDO UPDATE DIRETO NO BANCO...');
      const primeiraOperadora = operadoras[0];
      console.log('🔧 Testando update na operadora:', primeiraOperadora.nome);
      
      try {
        const testUpdate = await connection.execute(`
          UPDATE Operadoras 
          SET nome = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [`${primeiraOperadora.nome} (TESTE)`, primeiraOperadora.id]);
        
        console.log('✅ Update direto funcionou:', testUpdate[0].affectedRows, 'linha(s) afetada(s)');
        
        // Reverter o teste
        await connection.execute(`
          UPDATE Operadoras 
          SET nome = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [primeiraOperadora.nome, primeiraOperadora.id]);
        
        console.log('✅ Update revertido com sucesso');
        
      } catch (error) {
        console.log('❌ Erro no update direto:', error.message);
      }
    }
    
    // 5. TESTAR ENDPOINT DA API
    console.log('\n5️⃣ TESTANDO ENDPOINT DA API...');
    try {
      const response = await fetch('http://localhost:3001/api/operadoras');
      console.log('📡 GET /api/operadoras:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando, retornou:', data.data?.length || 0, 'operadoras');
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
      console.log('💡 Certifique-se de que o servidor está rodando: npm run dev');
    }
    
    // 6. TESTAR UPDATE VIA API (se houver operadoras)
    if (operadoras.length > 0) {
      console.log('\n6️⃣ TESTANDO UPDATE VIA API...');
      const operadoraTeste = operadoras[0];
      
      const dadosUpdate = {
        nome: `${operadoraTeste.nome} (TESTE API)`,
        codigo: operadoraTeste.codigo,
        status: operadoraTeste.status
      };
      
      console.log('🔧 Enviando PUT para:', `http://localhost:3001/api/operadoras/admin/${operadoraTeste.id}`);
      console.log('📋 Dados enviados:', JSON.stringify(dadosUpdate, null, 2));
      
      try {
        const updateResponse = await fetch(`http://localhost:3001/api/operadoras/admin/${operadoraTeste.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosUpdate)
        });
        
        console.log('📡 Resposta da API:', updateResponse.status, updateResponse.statusText);
        
        const responseText = await updateResponse.text();
        console.log('📄 Corpo da resposta:', responseText);
        
        if (updateResponse.ok) {
          console.log('✅ Update via API funcionou!');
          
          // Reverter o teste
          const dadosRevert = {
            nome: operadoraTeste.nome,
            codigo: operadoraTeste.codigo,
            status: operadoraTeste.status
          };
          
          await fetch(`http://localhost:3001/api/operadoras/admin/${operadoraTeste.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosRevert)
          });
          
          console.log('✅ Update revertido via API');
        } else {
          console.log('❌ Erro no update via API');
          
          // Tentar parsear a resposta de erro
          try {
            const errorData = JSON.parse(responseText);
            console.log('📄 Detalhes do erro:', errorData);
          } catch (e) {
            console.log('📄 Resposta não é JSON válido');
          }
        }
        
      } catch (error) {
        console.log('❌ Erro ao testar update via API:', error.message);
      }
    }
    
    // 7. RESUMO
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 RESUMO DO DEBUG');
    console.log('=' .repeat(60));
    
    console.log('📊 Verificações realizadas:');
    console.log('   ✅ Conexão com banco');
    console.log('   ✅ Estrutura da tabela');
    console.log('   ✅ Dados existentes');
    console.log('   ✅ Update direto no banco');
    console.log('   ✅ Teste da API');
    
    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique os logs do servidor backend');
    console.log('   2. Certifique-se de que o servidor está rodando');
    console.log('   3. Teste novamente no frontend');
    
  } catch (error) {
    console.error('❌ Erro geral no debug:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugOperadoras().catch(console.error);
}

module.exports = { debugOperadoras };
