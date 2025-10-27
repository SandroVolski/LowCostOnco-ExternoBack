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
    console.log(`🔧 Reprocessando cabeçalho do lote ID: ${loteId}`);

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
    console.log(`📋 Lote encontrado: ${lote.numero_lote}`);
    console.log(`📁 Arquivo XML: ${lote.arquivo_xml}`);

    // 2. Verificar se o arquivo XML existe
    const xmlPath = path.join(__dirname, '../../uploads/financeiro', lote.arquivo_xml);
    console.log(`📂 Caminho do XML: ${xmlPath}`);

    if (!fs.existsSync(xmlPath)) {
      console.error(`❌ Arquivo XML não encontrado: ${xmlPath}`);
      process.exit(1);
    }

    // 3. Ler e parsear o XML
    console.log('📖 Lendo arquivo XML...');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

    console.log('🔍 Parseando XML...');
    const xmlData = await TISSParser.parseXML(xmlContent);

    console.log('📋 Dados do cabeçalho extraídos do XML:', xmlData.cabecalho);

    // 4. Atualizar dados do cabeçalho no banco
    console.log('💾 Atualizando banco de dados...');

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
      console.log('✅ Cabeçalho atualizado com sucesso!');
      console.log('\n📊 Dados atualizados:');
      console.log('  - Tipo de Transação:', xmlData.cabecalho?.tipoTransacao || 'N/A');
      console.log('  - Sequencial:', xmlData.cabecalho?.sequencialTransacao || 'N/A');
      console.log('  - Data/Hora:', xmlData.cabecalho?.dataRegistroTransacao, xmlData.cabecalho?.horaRegistroTransacao);
      console.log('  - CNPJ Prestador:', xmlData.cabecalho?.cnpjPrestador || 'N/A');
      console.log('  - Nome Prestador:', xmlData.cabecalho?.nomePrestador || 'N/A');
      console.log('  - Registro ANS:', xmlData.cabecalho?.registroANS || 'N/A');
      console.log('  - Padrão TISS:', xmlData.cabecalho?.padrao || 'N/A');
      console.log('  - CNES:', xmlData.cabecalho?.cnes || 'N/A');

      // 5. Verificar se há mais informações que podem ser extraídas
      if (xmlData.lote) {
        console.log('\n📦 Informações do lote no XML:');
        console.log('  - Número do Lote:', xmlData.lote.numeroLote || 'N/A');
        console.log('  - Competência:', xmlData.lote.competencia || 'N/A');
        console.log('  - Data de Envio:', xmlData.lote.data_envio || 'N/A');
        console.log('  - Valor Total:', xmlData.lote.valor_total || 'N/A');
      }

      if (xmlData.operadora) {
        console.log('\n🏥 Informações da operadora no XML:');
        console.log('  - Registro ANS:', xmlData.operadora.registro_ans || 'N/A');
        console.log('  - Nome:', xmlData.operadora.nome || 'N/A');
      }

    } else {
      console.error('❌ Nenhuma linha foi atualizada!');
      process.exit(1);
    }

    console.log('\n🎉 Processo concluído!');
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
