import { Request, Response } from 'express';
import { FinanceiroCompactModel } from '../models/FinanceiroCompact';
import { TISSParser } from '../utils/tissParser';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class FinanceiroController {
  /**
   * Upload e processamento de XML TISS - ESTRUTURA COMPACTA
   */
  static async uploadXML(req: Request, res: Response): Promise<void> {
    try {
      console.log('📁 Upload XML - Dados recebidos:');
      console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'Nenhum arquivo');
      console.log('Body:', req.body);
      console.log('Headers:', req.headers);

      if (!req.file) {
        console.log('❌ Erro: Nenhum arquivo XML enviado');
        res.status(400).json({ success: false, message: 'Nenhum arquivo XML enviado' });
        return;
      }

      const { clinica_id } = req.body;
      console.log('🏥 Clinica ID recebido:', clinica_id, 'Tipo:', typeof clinica_id);

      if (!clinica_id) {
        console.log('❌ Erro: ID da clínica não fornecido');
        res.status(400).json({ success: false, message: 'ID da clínica não fornecido' });
        return;
      }

      // Ler o conteúdo do XML
      const xmlContent = await fs.readFile(req.file.path, 'utf-8');

      // Parse do XML TISS
      const parsedData = await TISSParser.parseXML(xmlContent);

      // Calcular hash do XML
      const hash = crypto.createHash('md5').update(xmlContent).digest('hex');

      // Extrair competência
      const competencia = TISSParser.extractCompetencia(parsedData.cabecalho.dataRegistroTransacao);

      // Calcular valor total do lote
      const valorTotal = parsedData.guias.reduce(
        (sum, guia) => sum + guia.valorTotal.valorTotalGeral,
        0
      );

      // ==================== USAR MÉTODO COMPACTO ====================
      // Preparar dados para o processamento - USANDO DADOS REAIS DO PARSER
      const xmlDataForProcessing = {
        operadora: {
          registro_ans: parsedData.operadora.registro_ans || parsedData.cabecalho.registroANS,
          nome: parsedData.operadora.nome || ''
        },
        lote: {
          numero: parsedData.lote.numeroLote,
          competencia: competencia,
          data_envio: new Date(parsedData.cabecalho.dataRegistroTransacao),
          valor_total: valorTotal
        },
        guias: parsedData.guias.map(guia => ({
          // Dados básicos da guia
          numero_guia_prestador: guia.numero_guia_prestador,
          numero_guia_operadora: guia.numero_guia_operadora,
          numero_carteira: guia.numero_carteira,
          data_autorizacao: guia.data_autorizacao,
          data_execucao: guia.data_execucao,
          data_solicitacao: guia.data_solicitacao,
          senha: guia.senha,
          data_validade_senha: guia.data_validade_senha,
          indicacao_clinica: guia.indicacao_clinica,
          tipo_atendimento: guia.tipo_atendimento,
          carater_atendimento: guia.carater_atendimento,
          regime_atendimento: guia.regime_atendimento,
          cnpj_prestador: guia.cnpj_prestador,
          cnes: guia.cnes,
          valor_total: guia.valor_total,
          // Dados do profissional
          profissional_solicitante: guia.profissional_solicitante,
          // Dados dos procedimentos, medicamentos, materiais e taxas
          procedimentos: guia.procedimentos || [],
          medicamentos: guia.medicamentos || [],
          materiais: guia.materiais || [],
          taxas: guia.taxas || [],
          // Valores por categoria
          valor_procedimentos: guia.valor_procedimentos || 0,
          valor_medicamentos: guia.valor_medicamentos || 0,
          valor_materiais: guia.valor_materiais || 0,
          valor_taxas: guia.valor_taxas || 0
        })),
        nome_arquivo: req.file.filename,
        hash_xml: hash,
        versao_tiss: parsedData.versao_tiss
      };

      console.log('🔧 Chamando processarXMLTISS...');
      const loteId = await FinanceiroCompactModel.processarXMLTISS(xmlDataForProcessing, parseInt(clinica_id));
      console.log('✅ Lote processado com ID:', loteId);

      res.json({
        success: true,
        lote_id: loteId,
        numero_lote: parsedData.lote.numeroLote,
        quantidade_guias: parsedData.guias.length,
        valor_total: valorTotal,
        message: 'XML processado com sucesso usando estrutura compacta',
      });
    } catch (error: any) {
      console.error('Erro ao processar XML:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao processar XML TISS',
      });
    }
  }

  /**
   * Listar lotes de uma clínica - ESTRUTURA COMPACTA
   */
  static async getLotes(req: Request, res: Response): Promise<void> {
    try {
      const { clinica_id } = req.query;

      if (!clinica_id) {
        res.status(400).json({ success: false, message: 'ID da clínica não fornecido' });
        return;
      }

      const lotes = await FinanceiroCompactModel.getLotesByClinica(parseInt(clinica_id as string));
      res.json(lotes);
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar lotes' });
    }
  }

  /**
   * Buscar lote por ID - ESTRUTURA COMPACTA
   */
  static async getLoteById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lote = await FinanceiroCompactModel.getLoteCompleto(parseInt(id));

      if (!lote) {
        res.status(404).json({ success: false, message: 'Lote não encontrado' });
        return;
      }

      res.json(lote);
    } catch (error: any) {
      console.error('Erro ao buscar lote:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar lote' });
    }
  }

  /**
   * Listar guias de um lote - ESTRUTURA COMPACTA
   */
  static async getGuiasPorLote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      console.log('🔧 Controller - Buscando guias para lote ID:', id);
      
      const guias = await FinanceiroCompactModel.getGuiasByLote(parseInt(id));
      console.log('✅ Controller - Guias retornadas:', guias.length);
      
      res.json(guias);
    } catch (error: any) {
      console.error('❌ Controller - Erro ao buscar guias:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar guias' });
    }
  }

  /**
   * Buscar procedimentos de uma guia - ESTRUTURA COMPACTA
   */
  static async getProcedimentosPorGuia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const procedimentos = await FinanceiroCompactModel.getProcedimentosByGuia(parseInt(id));
      res.json(procedimentos);
    } catch (error: any) {
      console.error('Erro ao buscar procedimentos:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar procedimentos' });
    }
  }

  /**
   * TESTE - Buscar todos os itens de um lote
   */
  static async getAllItemsPorLote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      console.log('🔧 TESTE - Buscando todos os itens para lote ID:', id);
      
      const itens = await FinanceiroCompactModel.getAllItemsByLote(parseInt(id));
      console.log('✅ TESTE - Itens retornados:', itens.length);
      
      res.json(itens);
    } catch (error: any) {
      console.error('❌ TESTE - Erro ao buscar itens:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar itens' });
    }
  }

  /**
   * Buscar despesas de uma guia - ESTRUTURA COMPACTA
   */
  static async getDespesasPorGuia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const despesas = await FinanceiroCompactModel.getDespesasByGuia(parseInt(id));
      res.json(despesas);
    } catch (error: any) {
      console.error('Erro ao buscar despesas:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar despesas' });
    }
  }

  /**
   * Atualizar status de um lote - ESTRUTURA COMPACTA
   */
  static async updateLoteStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'Status não fornecido' });
        return;
      }

      await FinanceiroCompactModel.updateLoteStatus(parseInt(id), status);
      
      // Registrar no histórico
      await FinanceiroCompactModel.criarHistorico({
        lote_id: parseInt(id),
        acao: 'status_change',
        valor_novo: status,
        descricao: `Status do lote alterado para ${status}`,
        usuario_id: (req as any).user?.id
      });

      res.json({ success: true, message: 'Status do lote atualizado' });
    } catch (error: any) {
      console.error('Erro ao atualizar status do lote:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar status' });
    }
  }

  /**
   * Atualizar status de uma guia - ESTRUTURA COMPACTA
   */
  static async updateGuiaStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'Status não fornecido' });
        return;
      }

      await FinanceiroCompactModel.updateItemStatus(parseInt(id), status);
      
      // Registrar no histórico
      await FinanceiroCompactModel.criarHistorico({
        item_id: parseInt(id),
        acao: 'status_change',
        valor_novo: status,
        descricao: `Status da guia alterado para ${status}`,
        usuario_id: (req as any).user?.id
      });

      res.json({ success: true, message: 'Status da guia atualizado' });
    } catch (error: any) {
      console.error('Erro ao atualizar status da guia:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar status' });
    }
  }

  /**
   * Anexar documentos a uma guia - ESTRUTURA COMPACTA
   */
  static async anexarDocumentos(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ success: false, message: 'Nenhum documento enviado' });
        return;
      }

      const { guia_id } = req.body;

      if (!guia_id) {
        res.status(400).json({ success: false, message: 'ID da guia não fornecido' });
        return;
      }

      // Anexar cada documento
      for (const file of req.files as Express.Multer.File[]) {
        await FinanceiroCompactModel.anexarDocumento(parseInt(guia_id), {
          nome_arquivo: file.filename,
          caminho_arquivo: file.path,
          tamanho_arquivo: file.size,
          mime_type: file.mimetype,
          tipo_documento: 'comprovante_pagamento', // Pode ser dinâmico
          descricao: `Documento anexado: ${file.originalname}`,
          usuario_id: (req as any).user?.id
        });
      }

      res.json({ success: true, message: 'Documentos anexados com sucesso' });
    } catch (error: any) {
      console.error('Erro ao anexar documentos:', error);
      res.status(500).json({ success: false, message: 'Erro ao anexar documentos' });
    }
  }

  /**
   * Buscar documentos de uma guia - ESTRUTURA COMPACTA
   */
  static async getDocumentosPorGuia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documentos = await FinanceiroCompactModel.getDocumentosByItem(parseInt(id));
      res.json(documentos);
    } catch (error: any) {
      console.error('Erro ao buscar documentos:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar documentos' });
    }
  }

  /**
   * Buscar histórico de uma guia - ESTRUTURA COMPACTA
   */
  static async getHistoricoPorGuia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const historico = await FinanceiroCompactModel.getHistoricoByItem(parseInt(id));
      res.json(historico);
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar histórico' });
    }
  }

  /**
   * Buscar estatísticas financeiras - ESTRUTURA COMPACTA
   */
  static async getEstatisticas(req: Request, res: Response): Promise<void> {
    try {
      const { clinica_id } = req.query;

      if (!clinica_id) {
        res.status(400).json({ success: false, message: 'ID da clínica não fornecido' });
        return;
      }

      const stats = await FinanceiroCompactModel.getEstatisticas(parseInt(clinica_id as string));
      res.json(stats);
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
    }
  }

  /**
   * Criar nova guia manualmente - ESTRUTURA COMPACTA
   */
  static async createGuia(req: Request, res: Response): Promise<void> {
    try {
      const guiaData = req.body;

      if (!guiaData.lote_id || !guiaData.clinica_id) {
        res.status(400).json({ success: false, message: 'Dados obrigatórios não fornecidos' });
        return;
      }

      const guiaId = await FinanceiroCompactModel.createGuia({
        ...guiaData,
        tipo_item: 'guia',
        status_pagamento: 'pendente'
      });

      res.json({ success: true, guia_id: guiaId, message: 'Guia criada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao criar guia:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar guia' });
    }
  }

  /**
   * Criar novo procedimento - ESTRUTURA COMPACTA
   */
  static async createProcedimento(req: Request, res: Response): Promise<void> {
    try {
      const procedimentoData = req.body;

      if (!procedimentoData.guia_id || !procedimentoData.lote_id || !procedimentoData.clinica_id) {
        res.status(400).json({ success: false, message: 'Dados obrigatórios não fornecidos' });
        return;
      }

      const procedimentoId = await FinanceiroCompactModel.createProcedimento({
        ...procedimentoData,
        tipo_item: 'procedimento'
      });

      res.json({ success: true, procedimento_id: procedimentoId, message: 'Procedimento criado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao criar procedimento:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar procedimento' });
    }
  }

  /**
   * Criar nova despesa - ESTRUTURA COMPACTA
   */
  static async createDespesa(req: Request, res: Response): Promise<void> {
    try {
      const despesaData = req.body;

      if (!despesaData.guia_id || !despesaData.lote_id || !despesaData.clinica_id) {
        res.status(400).json({ success: false, message: 'Dados obrigatórios não fornecidos' });
        return;
      }

      const despesaId = await FinanceiroCompactModel.createDespesa({
        ...despesaData,
        tipo_item: 'despesa'
      });

      res.json({ success: true, despesa_id: despesaId, message: 'Despesa criada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao criar despesa:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar despesa' });
    }
  }

  // ==================== MÉTODOS ADICIONAIS (COMPATIBILIDADE) ====================
  
  /**
   * Buscar guia específica por ID - COMPATIBILIDADE
   */
  static async getGuiaById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Buscar como item do tipo guia
      const pool = require('../config/database').pool;
      const [rows] = await pool.execute(
        'SELECT * FROM financeiro_items WHERE id = ? AND tipo_item = "guia"',
        [parseInt(id)]
      );
      
      if (!rows || rows.length === 0) {
        res.status(404).json({ success: false, message: 'Guia não encontrada' });
        return;
      }

      res.json(rows[0]);
    } catch (error: any) {
      console.error('Erro ao buscar guia:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar guia' });
    }
  }

  /**
   * Buscar lotes por competência - COMPATIBILIDADE
   */
  static async getLotesPorCompetencia(req: Request, res: Response): Promise<void> {
    try {
      const { competencia } = req.params;
      const { clinica_id } = req.query;

      if (!clinica_id) {
        res.status(400).json({ success: false, message: 'ID da clínica não fornecido' });
        return;
      }

      const lotes = await FinanceiroCompactModel.getLotesByClinica(parseInt(clinica_id as string));
      const lotesFiltrados = lotes.filter(lote => lote.competencia === competencia);
      
      res.json(lotesFiltrados);
    } catch (error: any) {
      console.error('Erro ao buscar lotes por competência:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar lotes' });
    }
  }

  /**
   * Buscar lotes por operadora - COMPATIBILIDADE
   */
  static async getLotesPorOperadora(req: Request, res: Response): Promise<void> {
    try {
      const { registro_ans } = req.params;
      const { clinica_id } = req.query;

      if (!clinica_id) {
        res.status(400).json({ success: false, message: 'ID da clínica não fornecido' });
        return;
      }

      const lotes = await FinanceiroCompactModel.getLotesByClinica(parseInt(clinica_id as string));
      const lotesFiltrados = lotes.filter(lote => lote.operadora_registro_ans === registro_ans);

      res.json(lotesFiltrados);
    } catch (error: any) {
      console.error('Erro ao buscar lotes por operadora:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar lotes' });
    }
  }

  /**
   * Visualizar/Baixar XML de um lote
   */
  static async downloadXML(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Buscar lote
      const lote = await FinanceiroCompactModel.getLoteById(parseInt(id));

      if (!lote) {
        res.status(404).json({ success: false, message: 'Lote não encontrado' });
        return;
      }

      if (!lote.arquivo_xml) {
        res.status(404).json({ success: false, message: 'Arquivo XML não encontrado para este lote' });
        return;
      }

      // Caminho do arquivo
      const filePath = path.join(process.cwd(), 'uploads', 'financeiro', lote.arquivo_xml);

      // Verificar se o arquivo existe
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({ success: false, message: 'Arquivo XML não encontrado no servidor' });
        return;
      }

      // Ler o arquivo
      const xmlContent = await fs.readFile(filePath, 'utf-8');

      // Retornar dados do XML
      res.json({
        success: true,
        fileName: lote.arquivo_xml,
        fileSize: Buffer.byteLength(xmlContent, 'utf-8'),
        uploadDate: lote.created_at,
        rawContent: xmlContent
      });
    } catch (error: any) {
      console.error('Erro ao buscar XML:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar arquivo XML' });
    }
  }
}