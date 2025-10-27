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
    console.log('🔧 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // 1. Verificar se as tabelas existem
    console.log('\n📋 1. Verificando tabelas do chat...');
    
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'chat%' OR SHOW TABLES LIKE 'message%'
    `);
    
    const expectedTables = ['chats', 'messages', 'chat_participants'];
    const foundTables = tables.map(table => Object.values(table)[0]);
    
    console.log('Tabelas encontradas:', foundTables);
    
    const missingTables = expectedTables.filter(table => !foundTables.includes(table));
    if (missingTables.length > 0) {
      console.log('❌ Tabelas faltando:', missingTables);
      console.log('💡 Execute: node setup-chat-tables.js');
      return;
    }
    
    console.log('✅ Todas as tabelas do chat existem');
    
    // 2. Verificar dados de exemplo (operadoras e clínicas)
    console.log('\n📋 2. Verificando dados de exemplo...');
    
    const [operadoras] = await connection.execute('SELECT * FROM operadoras LIMIT 3');
    const [clinicas] = await connection.execute('SELECT * FROM clinicas LIMIT 3');
    
    console.log(`Operadoras encontradas: ${operadoras.length}`);
    operadoras.forEach(op => {
      console.log(`   - ${op.nome} (ID: ${op.id})`);
    });
    
    console.log(`Clínicas encontradas: ${clinicas.length}`);
    clinicas.forEach(cli => {
      console.log(`   - ${cli.nome} (ID: ${cli.id}, Operadora: ${cli.operadora_id})`);
    });
    
    if (operadoras.length === 0 || clinicas.length === 0) {
      console.log('⚠️ É necessário ter pelo menos uma operadora e uma clínica para testar o chat');
      console.log('💡 Crie dados de exemplo primeiro');
      return;
    }
    
    // 3. Criar um chat de teste
    console.log('\n📋 3. Criando chat de teste...');
    
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
    console.log(`✅ Chat criado com ID: ${chatId}`);
    
    // 4. Criar participantes do chat
    console.log('\n📋 4. Criando participantes do chat...');
    
    await connection.execute(`
      INSERT INTO chat_participants (chat_id, participant_id, participant_type, joined_at, is_active)
      VALUES (?, ?, 'operadora', NOW(), true)
    `, [chatId, operadora.id]);
    
    await connection.execute(`
      INSERT INTO chat_participants (chat_id, participant_id, participant_type, joined_at, is_active)
      VALUES (?, ?, 'clinica', NOW(), true)
    `, [chatId, clinica.id]);
    
    console.log('✅ Participantes criados');
    
    // 5. Enviar mensagens de teste
    console.log('\n📋 5. Enviando mensagens de teste...');
    
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
      
      console.log(`   ✅ Mensagem enviada: "${msg.content}"`);
    }
    
    // 6. Atualizar última mensagem do chat
    console.log('\n📋 6. Atualizando última mensagem do chat...');
    
    const [lastMessage] = await connection.execute(`
      SELECT id FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1
    `, [chatId]);
    
    if (lastMessage.length > 0) {
      await connection.execute(`
        UPDATE chats SET last_message_id = ?, updated_at = NOW() WHERE id = ?
      `, [lastMessage[0].id, chatId]);
      console.log('✅ Última mensagem atualizada');
    }
    
    // 7. Verificar dados criados
    console.log('\n📋 7. Verificando dados criados...');
    
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
    
    console.log('📊 Dados do chat:');
    console.log(`   - ID: ${chatData[0].id}`);
    console.log(`   - Nome: ${chatData[0].name}`);
    console.log(`   - Tipo: ${chatData[0].type}`);
    console.log(`   - Participantes: ${participants.length}`);
    console.log(`   - Mensagens: ${allMessages.length}`);
    console.log(`   - Última mensagem: "${chatData[0].last_message_content}"`);
    
    // 8. Testar API endpoints (simulação)
    console.log('\n📋 8. Testando funcionalidades...');
    
    // Simular busca de chats por operadora
    const [operadoraChats] = await connection.execute(`
      SELECT c.*, COUNT(m.id) as message_count
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.operadora_id = ?
      GROUP BY c.id
    `, [operadora.id]);
    
    console.log(`✅ Operadora tem ${operadoraChats.length} chat(s)`);
    
    // Simular busca de chats por clínica
    const [clinicaChats] = await connection.execute(`
      SELECT c.*, COUNT(m.id) as message_count
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.clinica_id = ?
      GROUP BY c.id
    `, [clinica.id]);
    
    console.log(`✅ Clínica tem ${clinicaChats.length} chat(s)`);
    
    // 9. Limpar dados de teste (opcional)
    console.log('\n📋 9. Limpando dados de teste...');
    
    const shouldCleanup = process.argv.includes('--cleanup');
    
    if (shouldCleanup) {
      await connection.execute('DELETE FROM messages WHERE chat_id = ?', [chatId]);
      await connection.execute('DELETE FROM chat_participants WHERE chat_id = ?', [chatId]);
      await connection.execute('DELETE FROM chats WHERE id = ?', [chatId]);
      console.log('✅ Dados de teste removidos');
    } else {
      console.log('💡 Para remover dados de teste, execute: node test-chat-system.js --cleanup');
    }
    
    console.log('\n🎉 Teste do sistema de chat concluído com sucesso!');
    console.log('📝 Próximos passos:');
    console.log('   1. Teste a interface do frontend');
    console.log('   2. Verifique se as mensagens aparecem em tempo real');
    console.log('   3. Teste o envio de mensagens entre operadora e clínica');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
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
  testChatSystem();
}

module.exports = { testChatSystem };
