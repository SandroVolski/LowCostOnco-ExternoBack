// setup-chat-tables.js
// Script para criar as tabelas do sistema de chat

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configurações do banco (use as mesmas do seu .env)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_sistema_clinicas',
  multipleStatements: true
};

async function setupChatTables() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'database-chat.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📋 Executando script SQL do chat...');
    
    // Executar o script SQL
    await connection.execute(sqlContent);
    
    console.log('✅ Tabelas do chat criadas com sucesso!');
    
    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'chat%' OR SHOW TABLES LIKE 'message%'
    `);
    
    console.log('📊 Tabelas encontradas:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    
    // Verificar estrutura das tabelas
    console.log('🔍 Verificando estrutura das tabelas...');
    
    const [chatStructure] = await connection.execute('DESCRIBE chats');
    console.log('📋 Estrutura da tabela chats:');
    chatStructure.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key ? column.Key : ''}`);
    });
    
    const [messageStructure] = await connection.execute('DESCRIBE messages');
    console.log('📋 Estrutura da tabela messages:');
    messageStructure.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key ? column.Key : ''}`);
    });
    
    const [participantStructure] = await connection.execute('DESCRIBE chat_participants');
    console.log('📋 Estrutura da tabela chat_participants:');
    participantStructure.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key ? column.Key : ''}`);
    });
    
    console.log('\n🎉 Sistema de chat configurado com sucesso!');
    console.log('📝 Próximos passos:');
    console.log('   1. Reinicie o servidor backend');
    console.log('   2. Teste as funcionalidades de chat');
    console.log('   3. Verifique se as operadoras e clínicas podem se comunicar');
    
  } catch (error) {
    console.error('❌ Erro ao configurar tabelas do chat:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Dica: Verifique se as tabelas operadoras e clinicas existem no banco');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Dica: Verifique as credenciais do banco de dados');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Dica: Verifique se o banco de dados existe');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupChatTables();
}

module.exports = { setupChatTables };
