const { query } = require('./sistema-clinicas-backend/src/config/database');

async function testDatabase() {
  try {
    // Verificar usuários
    const usuarios = await query('SELECT * FROM usuarios LIMIT 5');

    // Verificar clínicas
    const clinicas = await query('SELECT * FROM clinicas LIMIT 5');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testDatabase();
