// test-chat-onkhos.js
// Script para testar o sistema de chat simplificado no banco bd_onkhos

const mysql = require('mysql2/promise');
require('dotenv').config(); // Carregar variáveis de ambiente

// Configurações do banco bd_onkhos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_onkhos',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function testChatOnkhos() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);

    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('conversas', 'mensagens')
    `, [process.env.DB_NAME || 'bd_onkhos']);

    const expectedTables = ['conversas', 'mensagens'];
    const foundTables = tables.map(table => table.TABLE_NAME);

    const missingTables = expectedTables.filter(table => !foundTables.includes(table));
    if (missingTables.length > 0) {
      return;
    }

    const [operadoras] = await connection.execute('SELECT * FROM operadoras LIMIT 3');
    const [clinicas] = await connection.execute('SELECT * FROM clinicas LIMIT 3');

    operadoras.forEach(op => {});

    clinicas.forEach(cli => {});

    if (operadoras.length === 0 || clinicas.length === 0) {
      return;
    }

    const operadora = operadoras[0];
    const clinica = clinicas.find(c => c.operadora_id === operadora.id) || clinicas[0];

    // Verificar se já existe conversa
    const [existingConversa] = await connection.execute(`
      SELECT * FROM conversas 
      WHERE operadora_id = ? AND clinica_id = ? AND ativa = TRUE
    `, [operadora.id, clinica.id]);

    let conversa;
    if (existingConversa.length > 0) {
      conversa = existingConversa[0];
    } else {
      const [conversaResult] = await connection.execute(`
        INSERT INTO conversas (
          operadora_id, clinica_id, nome_conversa, descricao, ativa, created_at, updated_at
        ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
      `, [
        operadora.id,
        clinica.id,
        `${operadora.nome} - ${clinica.nome}`,
        `Chat entre ${operadora.nome} e ${clinica.nome}`
      ]);

      const conversaId = conversaResult.insertId;

      // Buscar a conversa criada
      const [newConversa] = await connection.execute(`
        SELECT * FROM conversas WHERE id = ?
      `, [conversaId]);

      conversa = newConversa[0];
    }

    const messages = [
      {
        conversa_id: conversa.id,
        remetente_id: operadora.id,
        remetente_tipo: 'operadora',
        remetente_nome: operadora.nome,
        conteudo: 'Olá! Esta é uma mensagem de teste da operadora.'
      },
      {
        conversa_id: conversa.id,
        remetente_id: clinica.id,
        remetente_tipo: 'clinica',
        remetente_nome: clinica.nome,
        conteudo: 'Olá! Esta é uma mensagem de resposta da clínica.'
      },
      {
        conversa_id: conversa.id,
        remetente_id: operadora.id,
        remetente_tipo: 'operadora',
        remetente_nome: operadora.nome,
        conteudo: 'Perfeito! O sistema de chat está funcionando.'
      }
    ];

    for (const msg of messages) {
      await connection.execute(`
        INSERT INTO mensagens (
          conversa_id, remetente_id, remetente_tipo, remetente_nome, 
          conteudo, tipo_mensagem, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'texto', 'enviada', NOW(), NOW())
      `, [msg.conversa_id, msg.remetente_id, msg.remetente_tipo, msg.remetente_nome, msg.conteudo]);
    }

    const [conversaData] = await connection.execute(`
      SELECT c.*, o.nome as operadora_nome, cl.nome as clinica_nome
      FROM conversas c
      JOIN operadoras o ON c.operadora_id = o.id
      JOIN clinicas cl ON c.clinica_id = cl.id
      WHERE c.id = ?
    `, [conversa.id]);

    const [allMessages] = await connection.execute(`
      SELECT * FROM mensagens WHERE conversa_id = ? ORDER BY created_at ASC
    `, [conversa.id]);

    // Simular busca de conversas por operadora
    const [operadoraConversas] = await connection.execute(`
      SELECT 
        c.*, 
        o.nome as operadora_nome, 
        cl.nome as clinica_nome,
        (SELECT COUNT(*) FROM mensagens m 
         WHERE m.conversa_id = c.id 
         AND m.remetente_tipo != 'operadora' 
         AND m.created_at > COALESCE(c.operadora_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas
      FROM conversas c
      JOIN operadoras o ON c.operadora_id = o.id
      JOIN clinicas cl ON c.clinica_id = cl.id
      WHERE c.operadora_id = ? AND c.ativa = TRUE
      ORDER BY c.ultima_mensagem_data DESC
    `, [operadora.id]);

    // Simular busca de conversas por clínica
    const [clinicaConversas] = await connection.execute(`
      SELECT 
        c.*, 
        o.nome as operadora_nome, 
        cl.nome as clinica_nome,
        (SELECT COUNT(*) FROM mensagens m 
         WHERE m.conversa_id = c.id 
         AND m.remetente_tipo != 'clinica' 
         AND m.created_at > COALESCE(c.clinica_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas
      FROM conversas c
      JOIN operadoras o ON c.operadora_id = o.id
      JOIN clinicas cl ON c.clinica_id = cl.id
      WHERE c.clinica_id = ? AND c.ativa = TRUE
      ORDER BY c.ultima_mensagem_data DESC
    `, [clinica.id]);

    const [conversasCompletas] = await connection.execute(`
      SELECT * FROM conversas_completas WHERE id = ?
    `, [conversa.id]);

    const [mensagensCompletas] = await connection.execute(`
      SELECT * FROM mensagens_completas WHERE conversa_id = ? ORDER BY created_at ASC
    `, [conversa.id]);

    const shouldCleanup = process.argv.includes('--cleanup');

    if (shouldCleanup) {
      await connection.execute('DELETE FROM mensagens WHERE conversa_id = ?', [conversa.id]);
      await connection.execute('DELETE FROM conversas WHERE id = ?', [conversa.id]);
    } else {}
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testChatOnkhos();
}

module.exports = { testChatOnkhos };
