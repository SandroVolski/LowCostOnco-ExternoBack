const mysql = require('mysql2/promise');

async function adicionarOperadora() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'bd_onkhos'
  });

  try {
    console.log('🔗 Conectado ao banco de dados');

    // Inserir operadora se não existir
    const [result] = await connection.execute(
      `INSERT IGNORE INTO operadoras (nome, codigo, registroANS, status, created_at, updated_at)
       VALUES ('Operadora ANS 412589', '412589', '412589', 'ativo', NOW(), NOW())`
    );

    if (result.affectedRows > 0) {
      console.log('✅ Operadora ANS 412589 adicionada com sucesso!');
    } else {
      console.log('ℹ️  Operadora ANS 412589 já existe no banco');
    }

    // Verificar operadoras cadastradas
    const [operadoras] = await connection.execute(
      'SELECT id, nome, registroANS, status FROM operadoras ORDER BY id'
    );

    console.log('\n📋 Operadoras cadastradas:');
    console.table(operadoras);

  } catch (error) {
    console.error('❌ Erro ao adicionar operadora:', error);
  } finally {
    await connection.end();
    console.log('🔚 Conexão encerrada');
  }
}

adicionarOperadora();

