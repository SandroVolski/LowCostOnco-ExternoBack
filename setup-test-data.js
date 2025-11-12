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
    // 1. Verificar se há operadora
    const [operadoras] = await conn.query('SELECT id, nome, codigo FROM operadoras LIMIT 1');
    if (operadoras.length === 0) {
      return;
    }
    const operadora = operadoras[0];
    const registroANS = operadora.codigo; // codigo é o registro ANS

    // 2. Verificar se há clínica
    const [clinicas] = await conn.query('SELECT id, nome FROM clinicas LIMIT 1');
    if (clinicas.length === 0) {
      return;
    }
    const clinica = clinicas[0];

    // 3. Criar um lote de teste se não existir
    const [lotesExistentes] = await conn.query(
      'SELECT id FROM financeiro_lotes WHERE clinica_id = ? AND operadora_registro_ans = ? LIMIT 1',
      [clinica.id, registroANS]
    );

    let loteId;
    if (lotesExistentes.length > 0) {
      loteId = lotesExistentes[0].id;
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
    }

    guiasCriadas.forEach((guia, index) => {});
  } catch (error) {
    console.error('\n❌ Erro ao configurar dados de teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await conn.end();
  }
}

setupTestData();
