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
    console.log('🔧 Conectando ao banco bd_onkhos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco bd_onkhos');
    
    // 1. Verificar se as tabelas existem
    console.log('\n📋 1. Verificando tabelas do chat...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('conversas', 'mensagens')
    `, [process.env.DB_NAME || 'bd_onkhos']);
    
    const expectedTables = ['conversas', 'mensagens'];
    const foundTables = tables.map(table => table.TABLE_NAME);
    
    console.log('Tabelas encontradas:', foundTables);
    
    const missingTables = expectedTables.filter(table => !foundTables.includes(table));
    if (missingTables.length > 0) {
      console.log('❌ Tabelas faltando:', missingTables);
      console.log('💡 Execute: node setup-chat-onkhos.js');
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
    
    // 3. Criar uma conversa de teste
    console.log('\n📋 3. Criando conversa de teste...');
    
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
      console.log(`✅ Conversa existente encontrada: ID ${conversa.id}`);
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
      console.log(`✅ Conversa criada com ID: ${conversaId}`);
      
      // Buscar a conversa criada
      const [newConversa] = await connection.execute(`
        SELECT * FROM conversas WHERE id = ?
      `, [conversaId]);
      
      conversa = newConversa[0];
    }
    
    // 4. Enviar mensagens de teste
    console.log('\n📋 4. Enviando mensagens de teste...');
    
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
      
      console.log(`   ✅ Mensagem enviada: "${msg.conteudo}"`);
    }
    
    // 5. Verificar dados criados
    console.log('\n📋 5. Verificando dados criados...');
    
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
    
    console.log('📊 Dados da conversa:');
    console.log(`   - ID: ${conversaData[0].id}`);
    console.log(`   - Nome: ${conversaData[0].nome_conversa}`);
    console.log(`   - Operadora: ${conversaData[0].operadora_nome}`);
    console.log(`   - Clínica: ${conversaData[0].clinica_nome}`);
    console.log(`   - Mensagens: ${allMessages.length}`);
    console.log(`   - Última mensagem: "${conversaData[0].ultima_mensagem_texto}"`);
    
    // 6. Testar funcionalidades
    console.log('\n📋 6. Testando funcionalidades...');
    
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
    
    console.log(`✅ Operadora tem ${operadoraConversas.length} conversa(s)`);
    
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
    
    console.log(`✅ Clínica tem ${clinicaConversas.length} conversa(s)`);
    
    // 7. Testar views
    console.log('\n📋 7. Testando views...');
    
    const [conversasCompletas] = await connection.execute(`
      SELECT * FROM conversas_completas WHERE id = ?
    `, [conversa.id]);
    
    const [mensagensCompletas] = await connection.execute(`
      SELECT * FROM mensagens_completas WHERE conversa_id = ? ORDER BY created_at ASC
    `, [conversa.id]);
    
    console.log(`✅ View conversas_completas: ${conversasCompletas.length} registro(s)`);
    console.log(`✅ View mensagens_completas: ${mensagensCompletas.length} registro(s)`);
    
    // 8. Limpar dados de teste (opcional)
    console.log('\n📋 8. Limpando dados de teste...');
    
    const shouldCleanup = process.argv.includes('--cleanup');
    
    if (shouldCleanup) {
      await connection.execute('DELETE FROM mensagens WHERE conversa_id = ?', [conversa.id]);
      await connection.execute('DELETE FROM conversas WHERE id = ?', [conversa.id]);
      console.log('✅ Dados de teste removidos');
    } else {
      console.log('💡 Para remover dados de teste, execute: node test-chat-onkhos.js --cleanup');
    }
    
    console.log('\n🎉 Teste do sistema de chat simplificado concluído com sucesso!');
    console.log('📝 Próximos passos:');
    console.log('   1. Atualize o backend para usar o ChatOnkhosController');
    console.log('   2. Teste a interface do frontend');
    console.log('   3. Verifique se as mensagens aparecem em tempo real');
    console.log('   4. Teste o envio de mensagens entre operadora e clínica');
    
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
  testChatOnkhos();
}

module.exports = { testChatOnkhos };
