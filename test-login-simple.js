const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    // Conectar ao banco
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'bd_sistema_clinicas'
    });

    // Verificar se a tabela Clinicas existe
    const [tables] = await connection.execute('SHOW TABLES LIKE "Clinicas"');
    if (tables.length === 0) {
      return;
    }

    // Verificar estrutura da tabela
    const [columns] = await connection.execute('DESCRIBE Clinicas');
    columns.forEach(col => {});

    // Verificar se há clínicas cadastradas
    const [clinicas] = await connection.execute('SELECT id, nome, usuario, status FROM Clinicas LIMIT 5');
    if (clinicas.length === 0) {} else {
      clinicas.forEach(clinica => {});
    }

    // Testar busca por usuário específico
    const testUser = 'LCOClinica';
    const [testClinica] = await connection.execute('SELECT * FROM Clinicas WHERE usuario = ?', [testUser]);

    if (testClinica.length === 0) {} else {}

    await connection.end();
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testLogin();
