const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkOperadoraUsers() {
  try {
    console.log('🔧 Verificando tabela OperadoraUsers...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_sistema_clinicas',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ Conectado ao banco de dados MySQL');
    
    // Verificar se a tabela OperadoraUsers existe
    try {
      const [tables] = await connection.execute('SHOW TABLES LIKE "OperadoraUsers"');
      if (tables.length > 0) {
        console.log('✅ Tabela OperadoraUsers encontrada');
        
        // Verificar estrutura da tabela
        const [columns] = await connection.execute('DESCRIBE OperadoraUsers');
        console.log('📋 Estrutura da tabela OperadoraUsers:');
        columns.forEach(col => {
          console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });
        
        // Verificar dados
        const [users] = await connection.execute('SELECT COUNT(*) as total FROM OperadoraUsers');
        console.log(`👥 Total de usuários de operadoras: ${users[0].total}`);
        
        if (users[0].total > 0) {
          const [sampleUsers] = await connection.execute('SELECT id, nome, email, username, role, status FROM OperadoraUsers LIMIT 5');
          console.log('📋 Exemplos de usuários:');
          sampleUsers.forEach(user => {
            console.log(`  - ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Role: ${user.role}, Status: ${user.status}`);
          });
        }
      } else {
        console.log('❌ Tabela OperadoraUsers NÃO encontrada');
        
        // Verificar se existe com nome diferente
        const [allTables] = await connection.execute('SHOW TABLES');
        console.log('📋 Todas as tabelas disponíveis:');
        allTables.forEach(table => {
          console.log(`  - ${Object.values(table)[0]}`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao verificar tabela OperadoraUsers:', error.message);
    }
    
    await connection.end();
    console.log('✅ Conexão fechada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

checkOperadoraUsers();
