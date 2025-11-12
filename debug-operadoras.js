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
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    const [columns] = await connection.execute('DESCRIBE Operadoras');
    columns.forEach(col => {
      const nullable = col.Null === 'NO' ? 'NOT NULL' : '';
      const key = col.Key === 'PRI' ? 'PRIMARY KEY' : '';
      const defaultVal = col.Default ? `DEFAULT ${col.Default}` : '';
    });

    const [operadoras] = await connection.execute('SELECT * FROM Operadoras ORDER BY id');

    if (operadoras.length > 0) {
      operadoras.forEach((op, index) => {});

      const primeiraOperadora = operadoras[0];

      try {
        const testUpdate = await connection.execute(`
          UPDATE Operadoras 
          SET nome = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [`${primeiraOperadora.nome} (TESTE)`, primeiraOperadora.id]);

        // Reverter o teste
        await connection.execute(`
          UPDATE Operadoras 
          SET nome = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [primeiraOperadora.nome, primeiraOperadora.id]);
      } catch (error) {}
    }

    try {
      const response = await fetch('http://localhost:3001/api/operadoras');

      if (response.ok) {
        const data = await response.json();
      }
    } catch (error) {}

    // 6. TESTAR UPDATE VIA API (se houver operadoras)
    if (operadoras.length > 0) {
      const operadoraTeste = operadoras[0];

      const dadosUpdate = {
        nome: `${operadoraTeste.nome} (TESTE API)`,
        codigo: operadoraTeste.codigo,
        status: operadoraTeste.status
      };

      try {
        const updateResponse = await fetch(`http://localhost:3001/api/operadoras/admin/${operadoraTeste.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosUpdate)
        });

        const responseText = await updateResponse.text();

        if (updateResponse.ok) {
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
        } else {
          // Tentar parsear a resposta de erro
          try {
            const errorData = JSON.parse(responseText);
          } catch (e) {}
        }
      } catch (error) {}
    }
  } catch (error) {
    console.error('❌ Erro geral no debug:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugOperadoras().catch(console.error);
}

module.exports = { debugOperadoras };
