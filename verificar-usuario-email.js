const mysql = require('mysql2/promise');
require('dotenv').config();

async function verificarUsuario() {
  const email = 'clinica.sandro.eduardo@onkhos.com';
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_onkhos',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado!\n');

    // Verificar na tabela usuarios (minúsculo)
    console.log(`📋 Verificando email: ${email}`);
    console.log('─'.repeat(50));
    
    const [usuarios] = await connection.execute(
      'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    
    if (usuarios.length > 0) {
      console.log('✅ Usuário encontrado na tabela "usuarios":');
      console.log(JSON.stringify(usuarios[0], null, 2));
    } else {
      console.log('❌ Não encontrado na tabela "usuarios"');
    }
    
    // Verificar na tabela Usuarios (maiúsculo)
    const [Usuarios] = await connection.execute(
      'SELECT * FROM Usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    
    if (Usuarios.length > 0) {
      console.log('\n✅ Usuário encontrado na tabela "Usuarios":');
      console.log(JSON.stringify(Usuarios[0], null, 2));
    } else {
      console.log('\n❌ Não encontrado na tabela "Usuarios"');
    }
    
    // Verificar na tabela clinicas (pode ter email no campo usuario)
    const [clinicas] = await connection.execute(
      'SELECT id, nome, usuario, email FROM clinicas WHERE usuario = ? OR email LIKE ? LIMIT 5',
      [email, `%${email}%`]
    );
    
    if (clinicas.length > 0) {
      console.log('\n📋 Encontrado na tabela "clinicas":');
      clinicas.forEach(c => {
        console.log(`  - ID: ${c.id}, Nome: ${c.nome}, Usuario: ${c.usuario || 'N/A'}`);
      });
    } else {
      console.log('\n❌ Não encontrado na tabela "clinicas"');
    }
    
    // Listar todos os emails similares
    console.log('\n🔍 Buscando emails similares...');
    const [similares] = await connection.execute(
      'SELECT email, username, nome, status FROM usuarios WHERE email LIKE ? OR username LIKE ? LIMIT 10',
      [`%sandro%`, `%sandro%`]
    );
    
    if (similares.length > 0) {
      console.log('📋 Emails similares encontrados:');
      similares.forEach(u => {
        console.log(`  - Email: ${u.email || 'N/A'}, Username: ${u.username || 'N/A'}, Nome: ${u.nome}, Status: ${u.status}`);
      });
    } else {
      console.log('❌ Nenhum email similar encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexão fechada');
    }
  }
}

verificarUsuario();

