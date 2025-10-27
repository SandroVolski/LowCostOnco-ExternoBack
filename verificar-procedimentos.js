const mysql = require('mysql2/promise');

async function verificarTabelas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Pembrolizumabe2025',
    database: 'bd_onkhos'
  });

  try {
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se as tabelas existem
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'bd_onkhos' 
        AND TABLE_NAME LIKE 'procedimentos%'
    `);
    
    console.log('\n📋 Tabelas encontradas:', tables);
    
    if (tables.length === 0) {
      console.log('\n❌ PROBLEMA: Nenhuma tabela de procedimentos encontrada!');
      console.log('Execute o script: sistema-clinicas-backend/create-procedimentos-tables.sql');
      return;
    }
    
    // Verificar estrutura das tabelas
    for (const table of tables) {
      console.log(`\n📊 Estrutura da tabela ${table.TABLE_NAME}:`);
      const [columns] = await connection.execute(`
        DESCRIBE ${table.TABLE_NAME}
      `);
      console.table(columns);
      
      // Contar registros
      const [count] = await connection.execute(`
        SELECT COUNT(*) as total FROM ${table.TABLE_NAME}
      `);
      console.log(`Total de registros: ${count[0].total}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

verificarTabelas();

