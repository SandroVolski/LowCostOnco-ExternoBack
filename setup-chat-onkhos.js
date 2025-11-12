// setup-chat-onkhos.js
// Script para criar as tabelas do sistema de chat no banco bd_onkhos

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Carregar variáveis de ambiente

// Configurações do banco bd_onkhos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_onkhos',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

async function setupChatOnkhos() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);

    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'database-chat-simples-onkhos.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Executar o script SQL
    await connection.execute(sqlContent);

    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'conversas' OR SHOW TABLES LIKE 'mensagens'
    `);

    tables.forEach(table => {
      const tableName = Object.values(table)[0];
    });

    const [conversasStructure] = await connection.execute('DESCRIBE conversas');
    conversasStructure.forEach(column => {});

    const [mensagensStructure] = await connection.execute('DESCRIBE mensagens');
    mensagensStructure.forEach(column => {});

    const [operadoras] = await connection.execute('SELECT COUNT(*) as count FROM operadoras');
    const [clinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');

    if (operadoras[0].count === 0 || clinicas[0].count === 0) {}
  } catch (error) {
    console.error('❌ Erro ao configurar tabelas do chat no bd_onkhos:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {} else if (error.code === 'ER_ACCESS_DENIED_ERROR') {} else if (error.code === 'ER_BAD_DB_ERROR') {} else if (error.code === 'ER_NO_REFERENCED_ROW_2') {}
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupChatOnkhos();
}

module.exports = { setupChatOnkhos };
