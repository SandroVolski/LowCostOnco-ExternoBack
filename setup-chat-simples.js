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
    connection = await mysql.createConnection(dbConfig);
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
    try {
      await connection.execute(`
        ALTER TABLE conversas 
        ADD CONSTRAINT fk_conversas_ultima_mensagem 
        FOREIGN KEY (ultima_mensagem_id) REFERENCES mensagens(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {} else {
        throw error;
      }
    }

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

    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('conversas', 'mensagens')
    `, [process.env.DB_NAME || 'bd_onkhos']);

    tables.forEach(table => {});

    const [operadoras] = await connection.execute('SELECT COUNT(*) as count FROM operadoras');
    const [clinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');

    if (operadoras[0].count === 0 || clinicas[0].count === 0) {}
  } catch (error) {
    console.error('❌ Erro ao configurar sistema de chat:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {} else if (error.code === 'ER_ACCESS_DENIED_ERROR') {} else if (error.code === 'ER_BAD_DB_ERROR') {}
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupChatSimples();
}

module.exports = { setupChatSimples };
