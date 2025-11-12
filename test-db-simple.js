const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
  let connection;
  
  try {
    // Configuração do banco
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    };

    connection = await mysql.createConnection(config);

    // Verificar usuários
    const [usuarios] = await connection.execute('SELECT * FROM usuarios LIMIT 5');

    // Verificar clínicas
    const [clinicas] = await connection.execute('SELECT * FROM clinicas LIMIT 5');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testDatabase();
