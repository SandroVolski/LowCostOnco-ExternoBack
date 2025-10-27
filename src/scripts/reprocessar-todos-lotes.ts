import * as fs from 'fs';
import * as path from 'path';
import { TISSParser } from '../utils/tissParser';
import pool from '../config/database';
import { ResultSetHeader } from 'mysql2';

/**
 * Script para reprocessar TODOS os lotes sem dados de cabeçalho
 *
 * Uso: ts-node src/scripts/reprocessar-todos-lotes.ts
 */

async function reprocessarTodosLotes() {
  try {
    console.log('🔧 Iniciando reprocessamento de lotes...\n');

    // 1. Buscar lotes que não têm dados de cabeçalho preenchidos
    const [lotes] = await pool.execute<any[]>(
      `SELECT id, numero_lote, arquivo_xml
       FROM financeiro_lotes
       WHERE (tipo_transacao IS NULL OR tipo_transacao = '')
          OR (hash_lote IS NULL OR hash_lote = '')
       ORDER BY id`,
      []
    );

    if (lotes.length === 0) {
      console.log('✅ Todos os lotes já estão com dados de cabeçalho!');
      process.exit(0);
    }

    console.log(`📋 Encontrados ${lotes.length} lotes para reprocessar:\n`);

    let sucessos = 0;
    let erros = 0;

    for (const lote of lotes) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔧 Processando Lote ID: ${lote.id} | Número: ${lote.numero_lote}`);
        console.log(`📁 Arquivo: ${lote.arquivo_xml}`);

        // Verificar se o arquivo XML existe
        const xmlPath = path.join(__dirname, '../../uploads/financeiro', lote.arquivo_xml);

        if (!fs.existsSync(xmlPath)) {
          console.error(`❌ Arquivo XML não encontrado: ${lote.arquivo_xml}`);
          erros++;
          continue;
        }

        // Ler e parsear o XML
        const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
        const xmlData = await TISSParser.parseXML(xmlContent);

        console.log('📊 Dados extraídos do XML:');
        console.log('  - Tipo de Transação:', xmlData.cabecalho?.tipoTransacao || 'N/A');
        console.log('  - Sequencial:', xmlData.cabecalho?.sequencialTransacao || 'N/A');
        console.log('  - CNPJ:', xmlData.cabecalho?.cnpjPrestador || 'N/A');
        console.log('  - Registro ANS:', xmlData.cabecalho?.registroANS || 'N/A');
        console.log('  - Padrão TISS:', xmlData.cabecalho?.padrao || 'N/A');
        console.log('  - CNES:', xmlData.cabecalho?.cnes || 'N/A');
        console.log('  - Hash:', xmlData.cabecalho?.hash || 'N/A');

        // Atualizar dados do cabeçalho no banco
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
            lote.id
          ]
        );

        if (result.affectedRows > 0) {
          console.log('✅ Lote atualizado com sucesso!');
          sucessos++;
        } else {
          console.error('❌ Nenhuma linha foi atualizada!');
          erros++;
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar lote ${lote.id}:`, error.message);
        erros++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('\n📊 RESUMO DO REPROCESSAMENTO:');
    console.log(`   ✅ Sucessos: ${sucessos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📋 Total: ${lotes.length}\n`);

    if (sucessos === lotes.length) {
      console.log('🎉 Todos os lotes foram reprocessados com sucesso!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Alguns lotes falharam. Verifique os logs acima.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar script
console.log('🚀 Script de Reprocessamento de Lotes');
console.log('=====================================\n');

reprocessarTodosLotes();
