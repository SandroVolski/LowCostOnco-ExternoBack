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
        SELECT TABLE_NAME, TABLE_ROWS 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('Clinicas', 'Operadoras', 'Usuarios')
        ORDER BY TABLE_NAME
      `, [dbConfig.database]);
      
      if (tables.length === 0) {
        allTestsPassed = false;
      } else {
        tables.forEach(table => {});
      }
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

    // Teste endpoint de clínicas
    try {
      const clinicasResponse = await fetch('http://localhost:3001/api/clinicas');

      if (clinicasResponse.status === 200) {} else {}
    } catch (error) {}

    // Teste endpoint de operadoras
    try {
      const operadorasResponse = await fetch('http://localhost:3001/api/operadoras');

      if (operadorasResponse.status === 200) {} else {}
    } catch (error) {}

    try {
      // Verificar clínicas
      const [clinicasCount] = await connection.execute('SELECT COUNT(*) as total FROM Clinicas');

      if (clinicasCount[0].total > 0) {
        const [clinica] = await connection.execute('SELECT id, nome, codigo FROM Clinicas LIMIT 1');
      }

      // Verificar operadoras
      const [operadorasCount] = await connection.execute('SELECT COUNT(*) as total FROM Operadoras');

      if (operadorasCount[0].total > 0) {
        const [operadora] = await connection.execute('SELECT id, nome, codigo FROM Operadoras LIMIT 1');
      }
    } catch (error) {
      allTestsPassed = false;
    }

    try {
      // Estrutura da tabela Clinicas
      const [clinicasColumns] = await connection.execute('DESCRIBE Clinicas');
      clinicasColumns.forEach(col => {
        const nullable = col.Null === 'NO' ? 'NOT NULL' : '';
        const key = col.Key === 'PRI' ? 'PRIMARY KEY' : '';
      });

      // Estrutura da tabela Operadoras
      const [operadorasColumns] = await connection.execute('DESCRIBE Operadoras');
      operadorasColumns.forEach(col => {
        const nullable = col.Null === 'NO' ? 'NOT NULL' : '';
        const key = col.Key === 'PRI' ? 'PRIMARY KEY' : '';
      });
    } catch (error) {}

    if (allTestsPassed) {} else {}
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
  testUpdateSystem().catch(console.error);
}

module.exports = { testUpdateSystem };
