import pool from '../config/database';

/**
 * Script para verificar todos os lotes e seus dados de cabeçalho
 */

async function verificarLotes() {
  try {
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
      process.exit(0);
    }

    lotes.forEach((lote: any) => {});

    // Verificar quantos lotes têm todos os dados preenchidos
    const lotesCompletos = lotes.filter((l: any) =>
      l.tipo_transacao &&
      l.sequencial_transacao &&
      l.cnpj_prestador &&
      l.hash_lote
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao verificar lotes:', error);
    process.exit(1);
  }
}

verificarLotes();
