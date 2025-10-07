// setup-chat-onkhos.js
// Script para criar as tabelas do sistema de chat no banco bd_onkhos

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Carregar variáveis de ambiente

// Configurações do banco bd_onkhos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_onkhos',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

async function setupChatOnkhos() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco bd_onkhos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco bd_onkhos');
    
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'database-chat-simples-onkhos.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📋 Executando script SQL do chat simplificado...');
    
    // Executar o script SQL
    await connection.execute(sqlContent);
    
    console.log('✅ Tabelas do chat criadas com sucesso no bd_onkhos!');
    
    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'conversas' OR SHOW TABLES LIKE 'mensagens'
    `);
    
    console.log('📊 Tabelas encontradas:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    
    // Verificar estrutura das tabelas
    console.log('🔍 Verificando estrutura das tabelas...');
    
    const [conversasStructure] = await connection.execute('DESCRIBE conversas');
    console.log('📋 Estrutura da tabela conversas:');
    conversasStructure.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key ? column.Key : ''}`);
    });
    
    const [mensagensStructure] = await connection.execute('DESCRIBE mensagens');
    console.log('📋 Estrutura da tabela mensagens:');
    mensagensStructure.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key ? column.Key : ''}`);
    });
    
    // Verificar se existem dados de exemplo
    console.log('🔍 Verificando dados existentes...');
    
    const [operadoras] = await connection.execute('SELECT COUNT(*) as count FROM operadoras');
    const [clinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');
    
    console.log(`📊 Operadoras cadastradas: ${operadoras[0].count}`);
    console.log(`📊 Clínicas cadastradas: ${clinicas[0].count}`);
    
    if (operadoras[0].count === 0 || clinicas[0].count === 0) {
      console.log('⚠️ É necessário ter pelo menos uma operadora e uma clínica para testar o chat');
      console.log('💡 Certifique-se de que o banco bd_onkhos tem dados básicos');
    }
    
    console.log('\n🎉 Sistema de chat configurado com sucesso no bd_onkhos!');
    console.log('📝 Próximos passos:');
    console.log('   1. Atualize o controller para usar ChatOnkhosController');
    console.log('   2. Reinicie o servidor backend');
    console.log('   3. Teste as funcionalidades de chat');
    console.log('   4. Verifique se as operadoras e clínicas podem se comunicar');
    
  } catch (error) {
    console.error('❌ Erro ao configurar tabelas do chat no bd_onkhos:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Dica: Verifique se as tabelas operadoras e clinicas existem no bd_onkhos');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Dica: Verifique as credenciais do banco de dados');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Dica: Verifique se o banco bd_onkhos existe');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.log('💡 Dica: Verifique se existem operadoras e clínicas cadastradas no bd_onkhos');
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
  setupChatOnkhos();
}

module.exports = { setupChatOnkhos };
