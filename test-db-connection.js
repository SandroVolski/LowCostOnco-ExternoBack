const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_sistema_clinicas',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    // Testar query simples
    const [rows] = await connection.execute('SELECT 1 as test');

    // Verificar se as tabelas existem
    const [tables] = await connection.execute('SHOW TABLES');

    // Verificar tabela usuarios
    try {
      const [usuarios] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
    } catch (error) {}

    // Verificar tabela clinicas
    try {
      const [clinicas] = await connection.execute('SELECT COUNT(*) as total FROM clinicas');
    } catch (error) {}

    await connection.end();
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

testConnection();