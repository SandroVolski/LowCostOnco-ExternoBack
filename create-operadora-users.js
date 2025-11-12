const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function createOperadoraUsersTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_sistema_clinicas',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('create-operadora-users-table.sql', 'utf8');

    // Dividir em comandos individuais
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);

    for (const command of commands) {
      if (command.trim()) {
        try {
          await connection.execute(command.trim());
        } catch (error) {}
      }
    }

    // Verificar se a tabela foi criada
    const [tables] = await connection.execute('SHOW TABLES LIKE "OperadoraUsers"');
    if (tables.length > 0) {
      // Verificar dados inseridos
      const [users] = await connection.execute('SELECT COUNT(*) as total FROM OperadoraUsers');

      if (users[0].total > 0) {
        const [sampleUsers] = await connection.execute('SELECT id, nome, email, username, role, status FROM OperadoraUsers');
        sampleUsers.forEach(user => {});
      }
    } else {}

    await connection.end();
  } catch (error) {
    console.error('❌ Erro ao criar tabela OperadoraUsers:', error);
    process.exit(1);
  }
}

createOperadoraUsersTable();
