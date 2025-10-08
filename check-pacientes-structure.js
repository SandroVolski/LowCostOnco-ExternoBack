const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStructure() {
  let connection;
  
  try {
    console.log('🔧 Verificando estrutura da tabela pacientes...');
    
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao banco de dados MySQL\n');
    
    // Verificar estrutura da tabela pacientes
    const [estrutura] = await connection.execute('DESCRIBE pacientes');
    
    console.log('📋 Estrutura da tabela pacientes:');
    console.log('=====================================');
    estrutura.forEach(campo => {
      console.log(`Campo: ${campo.Field.padEnd(30)} | Tipo: ${campo.Type.padEnd(20)} | Nulo: ${campo.Null}`);
    });
    
    console.log('\n📝 Lista de campos (para copiar):');
    const campos = estrutura.map(c => c.Field);
    console.log(campos.join(', '));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexão fechada.');
    }
  }
}

checkStructure();
