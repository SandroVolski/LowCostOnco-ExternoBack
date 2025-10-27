const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔧 Testando conexão com o banco de dados...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_sistema_clinicas',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ Conectado ao banco de dados MySQL');
    
    // Testar query simples
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query de teste executada:', rows);
    
    // Verificar se as tabelas existem
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tabelas encontradas:', tables.map(t => Object.values(t)[0]));
    
    // Verificar tabela usuarios
    try {
      const [usuarios] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
      console.log('👥 Total de usuários:', usuarios[0].total);
    } catch (error) {
      console.log('❌ Erro ao consultar tabela usuarios:', error.message);
    }
    
    // Verificar tabela clinicas
    try {
      const [clinicas] = await connection.execute('SELECT COUNT(*) as total FROM clinicas');
      console.log('🏥 Total de clínicas:', clinicas[0].total);
    } catch (error) {
      console.log('❌ Erro ao consultar tabela clinicas:', error.message);
    }
    
    await connection.end();
    console.log('✅ Conexão fechada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

testConnection();