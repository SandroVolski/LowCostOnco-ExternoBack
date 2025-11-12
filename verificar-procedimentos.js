const mysql = require('mysql2/promise');

async function verificarTabelas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Pembrolizumabe2025',
    database: 'bd_onkhos'
  });

  try {
    // Verificar se as tabelas existem
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'bd_onkhos' 
        AND TABLE_NAME LIKE 'procedimentos%'
    `);

    if (tables.length === 0) {
      return;
    }

    // Verificar estrutura das tabelas
    for (const table of tables) {
      const [columns] = await connection.execute(`
        DESCRIBE ${table.TABLE_NAME}
      `);
      console.table(columns);

      // Contar registros
      const [count] = await connection.execute(`
        SELECT COUNT(*) as total FROM ${table.TABLE_NAME}
      `);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

verificarTabelas();

