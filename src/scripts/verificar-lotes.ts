import pool from '../config/database';

/**
 * Script para verificar todos os lotes e seus dados de cabeçalho
 */

async function verificarLotes() {
  try {
    console.log('📊 Verificando todos os lotes no sistema...\n');

    const [lotes] = await pool.execute<any[]>(
      `SELECT
        id,
        numero_lote,
        tipo_transacao,
        sequencial_transacao,
        cnpj_prestador,
        registro_ans,
        padrao_tiss,
        hash_lote,
        cnes,
        data_registro_transacao,
        hora_registro_transacao
      FROM financeiro_lotes
      ORDER BY id`
    );

    if (lotes.length === 0) {
      console.log('❌ Nenhum lote encontrado no sistema!');
      process.exit(0);
    }

    console.log(`✅ Encontrados ${lotes.length} lote(s)\n`);

    lotes.forEach((lote: any) => {
      console.log(`${'='.repeat(60)}`);
      console.log(`Lote ID: ${lote.id} | Número: ${lote.numero_lote}`);
      console.log(`  Tipo: ${lote.tipo_transacao || 'NULL'}`);
      console.log(`  Sequencial: ${lote.sequencial_transacao || 'NULL'}`);
      console.log(`  CNPJ: ${lote.cnpj_prestador || 'NULL'}`);
      console.log(`  Registro ANS: ${lote.registro_ans || 'NULL'}`);
      console.log(`  Padrão TISS: ${lote.padrao_tiss || 'NULL'}`);
      console.log(`  Hash: ${lote.hash_lote ? lote.hash_lote.substring(0, 32) + '...' : 'NULL'}`);
      console.log(`  CNES: ${lote.cnes || 'NULL'}`);
      console.log(`  Data/Hora: ${lote.data_registro_transacao || 'NULL'} ${lote.hora_registro_transacao || 'NULL'}`);
    });

    console.log(`\n${'='.repeat(60)}`);

    // Verificar quantos lotes têm todos os dados preenchidos
    const lotesCompletos = lotes.filter((l: any) =>
      l.tipo_transacao &&
      l.sequencial_transacao &&
      l.cnpj_prestador &&
      l.hash_lote
    );

    console.log(`\n📊 Resumo:`);
    console.log(`   Total de lotes: ${lotes.length}`);
    console.log(`   Lotes com cabeçalho completo: ${lotesCompletos.length}`);
    console.log(`   Lotes com dados incompletos: ${lotes.length - lotesCompletos.length}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao verificar lotes:', error);
    process.exit(1);
  }
}

verificarLotes();
