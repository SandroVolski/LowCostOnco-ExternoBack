const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStructure() {
  let connection;
  
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    };

    connection = await mysql.createConnection(config);

    // Verificar estrutura da tabela pacientes
    const [estrutura] = await connection.execute('DESCRIBE pacientes');

    estrutura.forEach(campo => {});

    const campos = estrutura.map(c => c.Field);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkStructure();
