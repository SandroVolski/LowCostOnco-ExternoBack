const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkOperadoraUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_sistema_clinicas',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    // Verificar se a tabela OperadoraUsers existe
    try {
      const [tables] = await connection.execute('SHOW TABLES LIKE "OperadoraUsers"');
      if (tables.length > 0) {
        // Verificar estrutura da tabela
        const [columns] = await connection.execute('DESCRIBE OperadoraUsers');
        columns.forEach(col => {});

        // Verificar dados
        const [users] = await connection.execute('SELECT COUNT(*) as total FROM OperadoraUsers');

        if (users[0].total > 0) {
          const [sampleUsers] = await connection.execute('SELECT id, nome, email, username, role, status FROM OperadoraUsers LIMIT 5');
          sampleUsers.forEach(user => {});
        }
      } else {
        // Verificar se existe com nome diferente
        const [allTables] = await connection.execute('SHOW TABLES');
        allTables.forEach(table => {});
      }
    } catch (error) {}

    await connection.end();
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

checkOperadoraUsers();
