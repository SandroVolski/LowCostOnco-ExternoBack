const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function createOperadoraUsersTable() {
  try {
    console.log('🔧 Criando tabela OperadoraUsers...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_sistema_clinicas',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ Conectado ao banco de dados MySQL');
    
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('create-operadora-users-table.sql', 'utf8');
    
    // Dividir em comandos individuais
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          console.log('🔄 Executando:', command.trim().substring(0, 50) + '...');
          await connection.execute(command.trim());
          console.log('✅ Comando executado com sucesso');
        } catch (error) {
          console.log('⚠️ Erro ao executar comando:', error.message);
          // Continuar mesmo com erro (pode ser que a tabela já exista)
        }
      }
    }
    
    // Verificar se a tabela foi criada
    const [tables] = await connection.execute('SHOW TABLES LIKE "OperadoraUsers"');
    if (tables.length > 0) {
      console.log('✅ Tabela OperadoraUsers criada com sucesso');
      
      // Verificar dados inseridos
      const [users] = await connection.execute('SELECT COUNT(*) as total FROM OperadoraUsers');
      console.log(`👥 Total de usuários inseridos: ${users[0].total}`);
      
      if (users[0].total > 0) {
        const [sampleUsers] = await connection.execute('SELECT id, nome, email, username, role, status FROM OperadoraUsers');
        console.log('📋 Usuários criados:');
        sampleUsers.forEach(user => {
          console.log(`  - ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Username: ${user.username}, Role: ${user.role}, Status: ${user.status}`);
        });
      }
    } else {
      console.log('❌ Falha ao criar tabela OperadoraUsers');
    }
    
    await connection.end();
    console.log('✅ Conexão fechada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela OperadoraUsers:', error);
    process.exit(1);
  }
}

createOperadoraUsersTable();
