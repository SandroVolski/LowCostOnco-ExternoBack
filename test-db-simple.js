const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
  let connection;
  
  try {
    console.log('🔧 Testando conexão com banco de dados...');
    
    // Configuração do banco
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    console.log('📋 Configuração:', {
      host: config.host,
      user: config.user,
      database: config.database,
      port: config.port
    });
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao banco de dados MySQL');
    
    // Verificar usuários
    const [usuarios] = await connection.execute('SELECT * FROM usuarios LIMIT 5');
    console.log('👥 Usuários encontrados:', usuarios.length);
    console.log(usuarios);
    
    // Verificar clínicas
    const [clinicas] = await connection.execute('SELECT * FROM clinicas LIMIT 5');
    console.log('🏥 Clínicas encontradas:', clinicas.length);
    console.log(clinicas);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testDatabase();
