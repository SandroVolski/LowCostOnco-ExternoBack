// setup-chat-simples.js
// Script simplificado para criar as tabelas do chat no banco bd_onkhos

const mysql = require('mysql2/promise');
require('dotenv').config();

// Configurações do banco bd_onkhos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_onkhos',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function setupChatSimples() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco bd_onkhos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco bd_onkhos');
    
    // 1. Criar tabela conversas
    console.log('📋 Criando tabela conversas...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        operadora_id INT NOT NULL,
        clinica_id INT NOT NULL,
        nome_conversa VARCHAR(255) NOT NULL,
        descricao TEXT,
        ultima_mensagem_id INT NULL,
        ultima_mensagem_texto TEXT,
        ultima_mensagem_data TIMESTAMP NULL,
        operadora_ultima_leitura TIMESTAMP NULL,
        clinica_ultima_leitura TIMESTAMP NULL,
        ativa BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (operadora_id) REFERENCES operadoras(id) ON DELETE CASCADE,
        FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
        INDEX idx_operadora (operadora_id),
        INDEX idx_clinica (clinica_id),
        INDEX idx_operadora_clinica (operadora_id, clinica_id),
        INDEX idx_ultima_mensagem (ultima_mensagem_data),
        INDEX idx_ativa (ativa),
        UNIQUE KEY unique_operadora_clinica (operadora_id, clinica_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela conversas criada');
    
    // 2. Criar tabela mensagens
    console.log('📋 Criando tabela mensagens...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS mensagens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversa_id INT NOT NULL,
        remetente_id INT NOT NULL,
        remetente_tipo ENUM('operadora', 'clinica') NOT NULL,
        remetente_nome VARCHAR(255) NOT NULL,
        conteudo TEXT NOT NULL,
        tipo_mensagem ENUM('texto', 'imagem', 'arquivo') DEFAULT 'texto',
        status ENUM('enviada', 'entregue', 'lida') DEFAULT 'enviada',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE,
        INDEX idx_conversa (conversa_id),
        INDEX idx_remetente (remetente_id, remetente_tipo),
        INDEX idx_data (created_at),
        INDEX idx_status (status),
        INDEX idx_conversa_data (conversa_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela mensagens criada');
    
    // 3. Adicionar foreign key para última mensagem (se não existir)
    console.log('📋 Adicionando foreign key para última mensagem...');
    try {
      await connection.execute(`
        ALTER TABLE conversas 
        ADD CONSTRAINT fk_conversas_ultima_mensagem 
        FOREIGN KEY (ultima_mensagem_id) REFERENCES mensagens(id) ON DELETE SET NULL
      `);
      console.log('✅ Foreign key adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ Foreign key já existe');
      } else {
        throw error;
      }
    }
    
    // 4. Criar view conversas_completas
    console.log('📋 Criando view conversas_completas...');
    await connection.execute(`
      CREATE OR REPLACE VIEW conversas_completas AS
      SELECT 
        c.id,
        c.operadora_id,
        c.clinica_id,
        c.nome_conversa,
        c.descricao,
        c.ultima_mensagem_texto,
        c.ultima_mensagem_data,
        c.operadora_ultima_leitura,
        c.clinica_ultima_leitura,
        c.ativa,
        c.created_at,
        c.updated_at,
        o.nome as operadora_nome,
        o.codigo as operadora_codigo,
        cl.nome as clinica_nome,
        cl.codigo as clinica_codigo,
        (SELECT COUNT(*) FROM mensagens m 
         WHERE m.conversa_id = c.id 
         AND m.remetente_tipo != 'operadora' 
         AND m.created_at > COALESCE(c.operadora_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas_operadora,
        (SELECT COUNT(*) FROM mensagens m 
         WHERE m.conversa_id = c.id 
         AND m.remetente_tipo != 'clinica' 
         AND m.created_at > COALESCE(c.clinica_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas_clinica
      FROM conversas c
      JOIN operadoras o ON c.operadora_id = o.id
      JOIN clinicas cl ON c.clinica_id = cl.id
      WHERE c.ativa = TRUE
    `);
    console.log('✅ View conversas_completas criada');
    
    // 5. Criar view mensagens_completas
    console.log('📋 Criando view mensagens_completas...');
    await connection.execute(`
      CREATE OR REPLACE VIEW mensagens_completas AS
      SELECT 
        m.id,
        m.conversa_id,
        m.remetente_id,
        m.remetente_tipo,
        m.remetente_nome,
        m.conteudo,
        m.tipo_mensagem,
        m.status,
        m.created_at,
        m.updated_at,
        c.operadora_id,
        c.clinica_id,
        c.nome_conversa,
        o.nome as operadora_nome,
        cl.nome as clinica_nome
      FROM mensagens m
      JOIN conversas c ON m.conversa_id = c.id
      JOIN operadoras o ON c.operadora_id = o.id
      JOIN clinicas cl ON c.clinica_id = cl.id
      ORDER BY m.created_at ASC
    `);
    console.log('✅ View mensagens_completas criada');
    
    // 6. Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('conversas', 'mensagens')
    `, [process.env.DB_NAME || 'bd_onkhos']);
    
    console.log('📊 Tabelas encontradas:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });
    
    // 7. Verificar dados existentes
    console.log('🔍 Verificando dados existentes...');
    
    const [operadoras] = await connection.execute('SELECT COUNT(*) as count FROM operadoras');
    const [clinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');
    
    console.log(`📊 Operadoras cadastradas: ${operadoras[0].count}`);
    console.log(`📊 Clínicas cadastradas: ${clinicas[0].count}`);
    
    if (operadoras[0].count === 0 || clinicas[0].count === 0) {
      console.log('⚠️ É necessário ter pelo menos uma operadora e uma clínica para testar o chat');
    }
    
    console.log('\n🎉 Sistema de chat simplificado configurado com sucesso no bd_onkhos!');
    console.log('📝 Próximos passos:');
    console.log('   1. Reinicie o servidor backend');
    console.log('   2. Teste as funcionalidades de chat');
    console.log('   3. Verifique se as operadoras e clínicas podem se comunicar');
    
  } catch (error) {
    console.error('❌ Erro ao configurar sistema de chat:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Dica: Verifique se as tabelas operadoras e clinicas existem no bd_onkhos');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Dica: Verifique as credenciais do banco de dados');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Dica: Verifique se o banco bd_onkhos existe');
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
  setupChatSimples();
}

module.exports = { setupChatSimples };
