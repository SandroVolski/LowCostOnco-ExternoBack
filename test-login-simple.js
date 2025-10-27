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

    console.log('✅ Conectado ao banco de dados');

    // Verificar se a tabela Clinicas existe
    const [tables] = await connection.execute('SHOW TABLES LIKE "Clinicas"');
    if (tables.length === 0) {
      console.log('❌ Tabela Clinicas não encontrada');
      return;
    }
    console.log('✅ Tabela Clinicas encontrada');

    // Verificar estrutura da tabela
    const [columns] = await connection.execute('DESCRIBE Clinicas');
    console.log('📋 Colunas da tabela Clinicas:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Verificar se há clínicas cadastradas
    const [clinicas] = await connection.execute('SELECT id, nome, usuario, status FROM Clinicas LIMIT 5');
    console.log('\n🏥 Clínicas cadastradas:');
    if (clinicas.length === 0) {
      console.log('  Nenhuma clínica encontrada');
    } else {
      clinicas.forEach(clinica => {
        console.log(`  - ID: ${clinica.id}, Nome: ${clinica.nome}, Usuário: ${clinica.usuario}, Status: ${clinica.status}`);
      });
    }

    // Testar busca por usuário específico
    const testUser = 'LCOClinica';
    const [testClinica] = await connection.execute('SELECT * FROM Clinicas WHERE usuario = ?', [testUser]);
    
    if (testClinica.length === 0) {
      console.log(`\n❌ Usuário "${testUser}" não encontrado`);
    } else {
      console.log(`\n✅ Usuário "${testUser}" encontrado:`);
      console.log(`  - ID: ${testClinica[0].id}`);
      console.log(`  - Nome: ${testClinica[0].nome}`);
      console.log(`  - Status: ${testClinica[0].status}`);
      console.log(`  - Tem senha: ${testClinica[0].senha ? 'Sim' : 'Não'}`);
    }

    await connection.end();
    console.log('\n✅ Teste concluído');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testLogin();
