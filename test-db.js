const { query } = require('./sistema-clinicas-backend/src/config/database');

async function testDatabase() {
  try {
    console.log('🔧 Testando conexão com banco de dados...');
    
    // Verificar usuários
    const usuarios = await query('SELECT * FROM usuarios LIMIT 5');
    console.log('👥 Usuários encontrados:', usuarios.length);
    console.log(usuarios);
    
    // Verificar clínicas
    const clinicas = await query('SELECT * FROM clinicas LIMIT 5');
    console.log('🏥 Clínicas encontradas:', clinicas.length);
    console.log(clinicas);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testDatabase();
