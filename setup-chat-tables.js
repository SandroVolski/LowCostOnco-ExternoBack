// setup-chat-tables.js
// Script para criar as tabelas do sistema de chat

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configurações do banco (use as mesmas do seu .env)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_sistema_clinicas',
  multipleStatements: true
};

async function setupChatTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);

    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'database-chat.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Executar o script SQL
    await connection.execute(sqlContent);

    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'chat%' OR SHOW TABLES LIKE 'message%'
    `);

    tables.forEach(table => {
      const tableName = Object.values(table)[0];
    });

    const [chatStructure] = await connection.execute('DESCRIBE chats');
    chatStructure.forEach(column => {});

    const [messageStructure] = await connection.execute('DESCRIBE messages');
    messageStructure.forEach(column => {});

    const [participantStructure] = await connection.execute('DESCRIBE chat_participants');
    participantStructure.forEach(column => {});
  } catch (error) {
    console.error('❌ Erro ao configurar tabelas do chat:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {} else if (error.code === 'ER_ACCESS_DENIED_ERROR') {} else if (error.code === 'ER_BAD_DB_ERROR') {}
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupChatTables();
}

module.exports = { setupChatTables };
