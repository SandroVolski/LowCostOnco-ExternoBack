const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  let connection;
  
  try {
    console.log('🔧 Verificando tabelas do banco de dados...');
    
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao banco de dados MySQL');
    
    // Listar tabelas
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Tabelas encontradas:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });
    
    // Verificar estrutura da tabela pacientes
    console.log('\n🔍 Estrutura da tabela pacientes:');
    const [columns] = await connection.execute('DESCRIBE pacientes');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Verificar se há dados na tabela pacientes
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM pacientes');
    console.log(`\n📊 Total de pacientes: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables();
