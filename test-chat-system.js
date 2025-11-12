// test-chat-system.js
// Script para testar o sistema de chat

const mysql = require('mysql2/promise');

// Configurações do banco
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_sistema_clinicas'
};

async function testChatSystem() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);

    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'chat%' OR SHOW TABLES LIKE 'message%'
    `);

    const expectedTables = ['chats', 'messages', 'chat_participants'];
    const foundTables = tables.map(table => Object.values(table)[0]);

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

    const [chatResult] = await connection.execute(`
      INSERT INTO chats (type, operadora_id, clinica_id, name, description, created_at, updated_at)
      VALUES ('individual', ?, ?, ?, ?, NOW(), NOW())
    `, [
      operadora.id,
      clinica.id,
      `Chat de Teste - ${operadora.nome} & ${clinica.nome}`,
      `Chat de teste entre ${operadora.nome} e ${clinica.nome}`
    ]);

    const chatId = chatResult.insertId;

    await connection.execute(`
      INSERT INTO chat_participants (chat_id, participant_id, participant_type, joined_at, is_active)
      VALUES (?, ?, 'operadora', NOW(), true)
    `, [chatId, operadora.id]);

    await connection.execute(`
      INSERT INTO chat_participants (chat_id, participant_id, participant_type, joined_at, is_active)
      VALUES (?, ?, 'clinica', NOW(), true)
    `, [chatId, clinica.id]);

    const messages = [
      {
        sender_id: operadora.id,
        sender_type: 'operadora',
        sender_name: operadora.nome,
        content: 'Olá! Esta é uma mensagem de teste da operadora.'
      },
      {
        sender_id: clinica.id,
        sender_type: 'clinica',
        sender_name: clinica.nome,
        content: 'Olá! Esta é uma mensagem de resposta da clínica.'
      },
      {
        sender_id: operadora.id,
        sender_type: 'operadora',
        sender_name: operadora.nome,
        content: 'Perfeito! O sistema de chat está funcionando.'
      }
    ];

    for (const msg of messages) {
      await connection.execute(`
        INSERT INTO messages (chat_id, sender_id, sender_type, sender_name, content, message_type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'text', 'sent', NOW(), NOW())
      `, [chatId, msg.sender_id, msg.sender_type, msg.sender_name, msg.content]);
    }

    const [lastMessage] = await connection.execute(`
      SELECT id FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1
    `, [chatId]);

    if (lastMessage.length > 0) {
      await connection.execute(`
        UPDATE chats SET last_message_id = ?, updated_at = NOW() WHERE id = ?
      `, [lastMessage[0].id, chatId]);
    }

    const [chatData] = await connection.execute(`
      SELECT c.*, m.content as last_message_content, m.created_at as last_message_time
      FROM chats c
      LEFT JOIN messages m ON c.last_message_id = m.id
      WHERE c.id = ?
    `, [chatId]);

    const [participants] = await connection.execute(`
      SELECT * FROM chat_participants WHERE chat_id = ?
    `, [chatId]);

    const [allMessages] = await connection.execute(`
      SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
    `, [chatId]);

    // Simular busca de chats por operadora
    const [operadoraChats] = await connection.execute(`
      SELECT c.*, COUNT(m.id) as message_count
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.operadora_id = ?
      GROUP BY c.id
    `, [operadora.id]);

    // Simular busca de chats por clínica
    const [clinicaChats] = await connection.execute(`
      SELECT c.*, COUNT(m.id) as message_count
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.clinica_id = ?
      GROUP BY c.id
    `, [clinica.id]);

    const shouldCleanup = process.argv.includes('--cleanup');

    if (shouldCleanup) {
      await connection.execute('DELETE FROM messages WHERE chat_id = ?', [chatId]);
      await connection.execute('DELETE FROM chat_participants WHERE chat_id = ?', [chatId]);
      await connection.execute('DELETE FROM chats WHERE id = ?', [chatId]);
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
  testChatSystem();
}

module.exports = { testChatSystem };
