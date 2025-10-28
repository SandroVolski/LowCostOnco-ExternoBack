require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupTestData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔧 Configurando dados de teste para Recursos de Glosas...\n');

    // 1. Verificar se há operadora
    const [operadoras] = await conn.query('SELECT id, nome, codigo FROM operadoras LIMIT 1');
    if (operadoras.length === 0) {
      console.log('❌ Nenhuma operadora encontrada. Cadastre uma operadora primeiro!');
      console.log('   Use o painel administrativo para cadastrar uma operadora.');
      return;
    }
    const operadora = operadoras[0];
    const registroANS = operadora.codigo; // codigo é o registro ANS
    console.log(`✅ Operadora encontrada: ${operadora.nome} (ANS: ${registroANS})`);

    // 2. Verificar se há clínica
    const [clinicas] = await conn.query('SELECT id, nome FROM clinicas LIMIT 1');
    if (clinicas.length === 0) {
      console.log('❌ Nenhuma clínica encontrada. Cadastre uma clínica primeiro!');
      console.log('   Use o painel administrativo para cadastrar uma clínica.');
      return;
    }
    const clinica = clinicas[0];
    console.log(`✅ Clínica encontrada: ${clinica.nome}`);

    // 3. Criar um lote de teste se não existir
    const [lotesExistentes] = await conn.query(
      'SELECT id FROM financeiro_lotes WHERE clinica_id = ? AND operadora_registro_ans = ? LIMIT 1',
      [clinica.id, registroANS]
    );

    let loteId;
    if (lotesExistentes.length > 0) {
      loteId = lotesExistentes[0].id;
      console.log(`✅ Lote existente encontrado: ID ${loteId}`);
    } else {
      // Criar lote de teste
      const [resultLote] = await conn.execute(
        `INSERT INTO financeiro_lotes
         (clinica_id, operadora_registro_ans, operadora_nome, numero_lote, competencia,
          data_envio, quantidade_guias, valor_total, status, created_at)
         VALUES (?, ?, ?, ?, ?, CURDATE(), 1, 5000.00, 'glosado', NOW())`,
        [
          clinica.id,
          registroANS,
          operadora.nome,
          `LOTE-TESTE-${Date.now()}`,
          '2025-01'
        ]
      );
      loteId = resultLote.insertId;
      console.log(`✅ Lote de teste criado: ID ${loteId}`);
    }

    // 4. Criar guias glosadas de teste
    const numGuias = 3;
    const guiasCriadas = [];

    for (let i = 1; i <= numGuias; i++) {
      const numeroGuia = `GUIA-TESTE-${Date.now()}-${i}`;

      const [resultGuia] = await conn.execute(
        `INSERT INTO financeiro_items
         (lote_id, clinica_id, tipo_item, numero_guia_prestador, numero_guia_operadora,
          numero_carteira, data_autorizacao, data_execucao, descricao_item,
          quantidade_executada, valor_unitario, valor_total, status_pagamento, created_at)
         VALUES (?, ?, 'guia', ?, ?, ?, CURDATE(), CURDATE(), ?, 1, ?, ?, 'glosado', NOW())`,
        [
          loteId,
          clinica.id,
          numeroGuia,
          `GUIA-OP-${i}`,
          `12345678${i}`,
          `Procedimento de teste ${i} - Glosa por [motivo exemplo]`,
          1000 + (i * 500),
          1000 + (i * 500)
        ]
      );

      guiasCriadas.push({
        id: resultGuia.insertId,
        numero: numeroGuia,
        valor: 1000 + (i * 500)
      });

      console.log(`✅ Guia ${i} criada: ${numeroGuia} - R$ ${(1000 + (i * 500)).toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS DADOS DE TESTE');
    console.log('='.repeat(60));
    console.log(`Clínica ID: ${clinica.id}`);
    console.log(`  Nome: ${clinica.nome}`);
    console.log('');
    console.log(`Operadora: ${operadora.nome}`);
    console.log(`  ANS: ${registroANS}`);
    console.log('');
    console.log(`Lote ID: ${loteId}`);
    console.log(`  Competência: 2025-01`);
    console.log(`  Status: glosado`);
    console.log('');
    console.log(`Guias Glosadas Criadas: ${numGuias}`);
    guiasCriadas.forEach((guia, index) => {
      console.log(`  ${index + 1}. ID ${guia.id} - ${guia.numero} - R$ ${guia.valor.toFixed(2)}`);
    });
    console.log('='.repeat(60));

    console.log('\n✅ Dados de teste configurados com sucesso!\n');

    console.log('📝 PRÓXIMOS PASSOS:');
    console.log('━'.repeat(60));
    console.log('1️⃣  Inicie o backend:');
    console.log('    cd sistema-clinicas-backend && npm start');
    console.log('');
    console.log('2️⃣  Inicie o frontend:');
    console.log('    cd onco-connect-hub-main && npm run dev');
    console.log('');
    console.log('3️⃣  Faça login como CLÍNICA:');
    console.log('    → Vá para "Recursos de Glosas"');
    console.log('    → Clique em "Novo Recurso"');
    console.log('    → Selecione uma das guias de teste criadas');
    console.log('    → Preencha justificativa e envie');
    console.log('');
    console.log('4️⃣  Faça login como OPERADORA:');
    console.log('    → Acesse /operadora/recursos-glosas');
    console.log('    → Visualize o recurso recebido');
    console.log('    → Teste as opções: Aprovar, Negar ou Solicitar Parecer');
    console.log('');
    console.log('5️⃣  Faça login como AUDITOR:');
    console.log('    → URL: /auditor/login');
    console.log('    → Username: auditor');
    console.log('    → Senha: auditor123');
    console.log('    → Analise recursos e emita pareceres');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro ao configurar dados de teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await conn.end();
  }
}

setupTestData();
