import * as fs from 'fs';
import * as path from 'path';
import { TISSParser } from '../utils/tissParser';
import pool from '../config/database';
import { ResultSetHeader } from 'mysql2';

/**
 * Script para reprocessar o XML de um lote e atualizar os dados do cabeçalho
 *
 * Uso: ts-node src/scripts/reprocessar-cabecalho-lote.ts <lote_id>
 */

async function reprocessarCabecalho(loteId: number) {
  try {
    // 1. Buscar dados do lote
    const [lotes] = await pool.execute<any[]>(
      'SELECT * FROM financeiro_lotes WHERE id = ?',
      [loteId]
    );

    if (lotes.length === 0) {
      console.error(`❌ Lote ${loteId} não encontrado!`);
      process.exit(1);
    }

    const lote = lotes[0];

    // 2. Verificar se o arquivo XML existe
    const xmlPath = path.join(__dirname, '../../uploads/financeiro', lote.arquivo_xml);

    if (!fs.existsSync(xmlPath)) {
      console.error(`❌ Arquivo XML não encontrado: ${xmlPath}`);
      process.exit(1);
    }

    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

    const xmlData = await TISSParser.parseXML(xmlContent);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE financeiro_lotes SET
        tipo_transacao = ?,
        sequencial_transacao = ?,
        data_registro_transacao = ?,
        hora_registro_transacao = ?,
        cnpj_prestador = ?,
        nome_prestador = ?,
        registro_ans = ?,
        padrao_tiss = ?,
        hash_lote = ?,
        cnes = ?
      WHERE id = ?`,
      [
        xmlData.cabecalho?.tipoTransacao || null,
        xmlData.cabecalho?.sequencialTransacao || null,
        xmlData.cabecalho?.dataRegistroTransacao || null,
        xmlData.cabecalho?.horaRegistroTransacao || null,
        xmlData.cabecalho?.cnpjPrestador || null,
        xmlData.cabecalho?.nomePrestador || null,
        xmlData.cabecalho?.registroANS || null,
        xmlData.cabecalho?.padrao || null,
        xmlData.cabecalho?.hash || null,
        xmlData.cabecalho?.cnes || null,
        loteId
      ]
    );

    if (result.affectedRows > 0) {
      // 5. Verificar se há mais informações que podem ser extraídas
      if (xmlData.lote) {}

      if (xmlData.operadora) {}
    } else {
      console.error('❌ Nenhuma linha foi atualizada!');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao reprocessar cabeçalho:', error);
    process.exit(1);
  }
}

// Executar script
const loteId = parseInt(process.argv[2]);

if (!loteId || isNaN(loteId)) {
  console.error('❌ Uso: ts-node src/scripts/reprocessar-cabecalho-lote.ts <lote_id>');
  console.error('   Exemplo: ts-node src/scripts/reprocessar-cabecalho-lote.ts 1');
  process.exit(1);
}

reprocessarCabecalho(loteId);
