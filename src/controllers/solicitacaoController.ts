// src/controllers/solicitacaoController.ts - ATUALIZADO COM LOGO

import { Request, Response } from 'express';
import { SolicitacaoAutorizacaoModel } from '../models/SolicitacaoAutorizacao';
import { ClinicaModel } from '../models/Clinica';
import { generateAuthorizationPDF } from '../utils/pdfGenerator';
import { SolicitacaoCreateInput, SolicitacaoUpdateInput, ApiResponse } from '../types';

// Declaração global para cache de PDFs
declare global {
  var pdfCache: Map<string, Buffer> | undefined;
}

interface AuthRequest extends Request {
  user?: { id: number; clinicaId?: number; role?: string };
}

export class SolicitacaoController {
  private static flattenSolicitacao(row: any): any {
    const parseJson = (v: any) => {
      if (!v) return null;
      try {
        return typeof v === 'string' ? JSON.parse(v) : v;
      } catch { return null; }
    };
    const cliente = parseJson(row.cliente_dados) || {};
    const estadiamento = parseJson(row.estadiamento) || {};
    const meds = parseJson(row.medicamentos) || {};
    const tratamentos = parseJson(row.tratamentos) || {};

    // Normalizar datas simples para string YYYY-MM-DD
    const normalizeDate = (d: any) => {
      if (!d) return null;
      const s = String(d);
      if (s.includes('T')) return s.split('T')[0];
      return s;
    };

    return {
      ...row,
      // Campos compatíveis com frontend antigo (com fallbacks)
      cliente_nome: cliente.nome || row.paciente_nome || null,
      cliente_codigo: cliente.codigo || row.paciente_codigo || null,
      sexo: cliente.sexo || row.sexo || null,
      data_nascimento: cliente.data_nascimento || row.data_nascimento || null,
      idade: cliente.idade ?? null,

      estagio_t: estadiamento.t || null,
      estagio_n: estadiamento.n || null,
      estagio_m: estadiamento.m || null,
      estagio_clinico: estadiamento.clinico || null,

      medicamentos_antineoplasticos: meds.antineoplasticos || null,
      dose_por_m2: meds.dose_por_m2 || null,
      dose_total: meds.dose_total || null,
      via_administracao: meds.via_administracao || null,
      dias_aplicacao_intervalo: meds.dias_aplicacao_intervalo || null,
      medicacoes_associadas: meds.medicacoes_associadas || null,

      // Tratamentos - compatibilidade
      tratamento_cirurgia_radio: tratamentos.cirurgia_radio || null,
      tratamento_quimio_adjuvante: tratamentos.quimio_adjuvante || null,
      tratamento_quimio_primeira_linha: tratamentos.quimio_primeira_linha || null,
      tratamento_quimio_segunda_linha: tratamentos.quimio_segunda_linha || null,

      // Aliases comuns
      cliente: cliente.nome || row.paciente_nome || null,
      hospital_nome: row.hospital_nome || row.clinica_nome || null,
      hospital_codigo: row.hospital_codigo || row.clinica_codigo || null,

      // Datas normalizadas
      data_solicitacao: normalizeDate(row.data_solicitacao),
      created_at: normalizeDate(row.created_at),
      updated_at: normalizeDate(row.updated_at),
    };
  }
  
  // POST /api/solicitacoes - Criar nova solicitação
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const dadosSolicitacao: SolicitacaoCreateInput = req.body;
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      
      // Log para debug do paciente_id
      console.log('🔧 Dados recebidos para criação:', {
        paciente_id: dadosSolicitacao.paciente_id,
        tipo_paciente_id: typeof dadosSolicitacao.paciente_id,
        clinica_id: dadosSolicitacao.clinica_id,
        cliente_nome: dadosSolicitacao.cliente_nome
      });
      
      // Validações básicas
      if (!dadosSolicitacao.hospital_nome || !dadosSolicitacao.cliente_nome || 
          !dadosSolicitacao.diagnostico_cid || !dadosSolicitacao.medicamentos_antineoplasticos) {
        const response: ApiResponse = {
          success: false,
          message: 'Campos obrigatórios: hospital_nome, cliente_nome, diagnostico_cid, medicamentos_antineoplasticos'
        };
        res.status(400).json(response);
        return;
      }
      
      // Garantir que a data de solicitação seja hoje se não fornecida
      if (!dadosSolicitacao.data_solicitacao) {
        dadosSolicitacao.data_solicitacao = new Date().toISOString().split('T')[0];
      }
      
      if (!clinicaId) {
        const response: ApiResponse = { success: false, message: 'Clínica não identificada no token' };
        res.status(401).json(response);
        return;
      }
      // Forçar clinica_id do token
      (dadosSolicitacao as any).clinica_id = clinicaId;
      
      // Tratar paciente_id - converter para número ou null
      if (dadosSolicitacao.paciente_id !== undefined && dadosSolicitacao.paciente_id !== null) {
        const pacienteId = parseInt(dadosSolicitacao.paciente_id.toString());
        dadosSolicitacao.paciente_id = isNaN(pacienteId) ? null : pacienteId;
      } else {
        dadosSolicitacao.paciente_id = null;
      }
      
      console.log('🔧 Dados tratados:', {
        paciente_id: dadosSolicitacao.paciente_id,
        tipo_paciente_id: typeof dadosSolicitacao.paciente_id
      });
      
      const novaSolicitacao = await SolicitacaoAutorizacaoModel.create(dadosSolicitacao);
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitação criada com sucesso',
        data: SolicitacaoController.flattenSolicitacao(novaSolicitacao as any)
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao criar solicitação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/solicitacoes/:id - Buscar solicitação por ID
  static async show(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const solicitacao = await SolicitacaoAutorizacaoModel.findById(id);
      
      if (!solicitacao) {
        const response: ApiResponse = {
          success: false,
          message: 'Solicitação não encontrada'
        };
        res.status(404).json(response);
        return;
      }

      if (clinicaId && (solicitacao as any).clinica_id !== clinicaId) {
        const response: ApiResponse = { success: false, message: 'Acesso negado à solicitação' };
        res.status(403).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitação encontrada com sucesso',
        data: SolicitacaoController.flattenSolicitacao(solicitacao as any)
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar solicitação:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar solicitação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/solicitacoes/clinica/:clinicaId - Buscar solicitações por clínica
  static async getByClinica(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicaId = parseInt(req.params.clinicaId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const tokenClinicaId = req.user?.clinicaId || req.user?.id || null;
      
      if (isNaN(clinicaId)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da clínica inválido'
        };
        res.status(400).json(response);
        return;
      }
      if (tokenClinicaId && tokenClinicaId !== clinicaId) {
        const response: ApiResponse = { success: false, message: 'Acesso negado a outra clínica' };
        res.status(403).json(response);
        return;
      }
      
      const result = await SolicitacaoAutorizacaoModel.findByClinicaId(clinicaId, { page, limit });
      const mapped = {
        ...result,
        data: result.data.map(r => SolicitacaoController.flattenSolicitacao(r as any))
      };
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitações da clínica encontradas com sucesso',
        data: mapped
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar solicitações da clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar solicitações da clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // ✅ GET /api/solicitacoes/:id/pdf - Gerar PDF com suporte para visualização
  static async generatePDF(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const isView = req.query.view === 'true';  // 🆕 Parâmetro para visualização
      const isInline = req.query.inline === 'true';  // 🆕 Parâmetro para inline
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      console.log('🔧 Iniciando geração de PDF para solicitação:', id);
      console.log('📋 Modo:', isView ? 'Visualização' : 'Download');
      console.log('📋 Inline:', isInline ? 'Sim' : 'Não');
      
      // 🆕 CACHE PARA PDFs - Verificar se já existe em cache
      const cacheKey = `pdf_${id}_${isView ? 'view' : 'download'}`;
      const cachedPdf = global.pdfCache?.get(cacheKey);
      
      if (cachedPdf && !isView) { // Cache apenas para download, não para visualização
        console.log('📦 PDF encontrado em cache, enviando diretamente...');
        
        const fileName = `autorizacao_tratamento_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', cachedPdf.length);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        res.setHeader('ETag', `"${id}_${cachedPdf.length}"`);
        
        res.send(cachedPdf);
        console.log('✅ PDF enviado do cache! Tamanho:', (cachedPdf.length / 1024).toFixed(2), 'KB');
        return;
      }
      
      // Buscar a solicitação
      const solicitacaoRaw = await SolicitacaoAutorizacaoModel.findById(id);
      
      if (!solicitacaoRaw) {
        const response: ApiResponse = {
          success: false,
          message: 'Solicitação não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      // Achatar campos JSON para compatibilidade com o template do PDF
      const solicitacao = SolicitacaoController.flattenSolicitacao(solicitacaoRaw as any) as any;
      
      console.log('✅ Solicitação encontrada:', {
        id: solicitacao.id,
        clinica_id: solicitacao.clinica_id,
        cliente: solicitacao.cliente_nome
      });
      
      // ✅ BUSCAR DADOS DA CLÍNICA E LOGO
      let clinicLogo = '';
      try {
        console.log('🔧 Buscando dados da clínica ID:', solicitacao.clinica_id);
        const clinicProfile = await ClinicaModel.findById(solicitacao.clinica_id);
        
        if (clinicProfile?.clinica?.logo_url) {
          clinicLogo = clinicProfile.clinica.logo_url;
          console.log('✅ Logo da clínica encontrada:', clinicLogo.substring(0, 50) + '...');
        } else {
          console.log('⚠️  Logo da clínica não encontrada');
        }
      } catch (logoError) {
        console.warn('⚠️  Erro ao buscar logo da clínica:', logoError);
        // Continua sem a logo
      }
      
      // ✅ GERAR O PDF COM LOGO
      console.log('🎨 Gerando PDF moderno...');
      const startTime = Date.now();
      const pdfBuffer = await generateAuthorizationPDF(solicitacao, clinicLogo);
      const generationTime = Date.now() - startTime;
      
      console.log(`⏱️  Tempo de geração: ${generationTime}ms`);
      
      // 🆕 ARMAZENAR NO CACHE (apenas para download)
      if (!isView && !global.pdfCache) {
        global.pdfCache = new Map();
      }
      if (!isView && global.pdfCache) {
        global.pdfCache.set(cacheKey, pdfBuffer);
        console.log('💾 PDF armazenado no cache');
      }
      
      // 🆕 CONFIGURAR HEADERS BASEADO NO MODO
      const fileName = `autorizacao_tratamento_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Headers básicos
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // 🆕 CONFIGURAR MODO DE EXIBIÇÃO COM OTIMIZAÇÕES
      if (isView || isInline) {
        // Para visualização inline no browser - OTIMIZADO
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache por 30 minutos
        res.setHeader('ETag', `"${id}_view_${pdfBuffer.length}"`);
        
        // ✅ CORREÇÃO: Remover headers CSP problemáticos para iframe
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('X-Content-Type-Options');
        
        // 🆕 Headers otimizados para visualização rápida
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        res.setHeader('Referrer-Policy', 'no-referrer');
        
        console.log('👁️  Configurado para visualização inline (otimizado)');
      } else {
        // Para download tradicional - OTIMIZADO
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        res.setHeader('ETag', `"${id}_download_${pdfBuffer.length}"`);
        
        console.log('💾 Configurado para download (otimizado)');
      }
      
      // Enviar o PDF
      res.send(pdfBuffer);
      
      console.log('✅ PDF enviado com sucesso! Tamanho:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
      console.log('📋 Modo final:', isView ? 'Visualização' : 'Download');
      console.log(`⏱️  Tempo total: ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao gerar PDF',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // PUT /api/solicitacoes/:id/status - Atualizar status da solicitação
  static async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const dadosAtualizacao: SolicitacaoUpdateInput = req.body;
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      const userRole = req.user?.role;
      
      console.log('🔧 Atualizando status da solicitação:', {
        id,
        dadosAtualizacao,
        clinicaId,
        userRole,
        userId: req.user?.id
      });
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const atual = await SolicitacaoAutorizacaoModel.findById(id);
      if (!atual) {
        const response: ApiResponse = { success: false, message: 'Solicitação não encontrada' };
        res.status(404).json(response);
        return;
      }
      
      // Validação de acesso: operadoras podem acessar qualquer solicitação
      // Clínicas só podem acessar suas próprias solicitações
      if (userRole && !userRole.includes('operadora') && clinicaId && (atual as any).clinica_id !== clinicaId) {
        console.log('❌ Acesso negado - clínica tentando acessar solicitação de outra clínica');
        const response: ApiResponse = { success: false, message: 'Acesso negado à solicitação' };
        res.status(403).json(response);
        return;
      }

      console.log('✅ Validação de acesso aprovada, atualizando solicitação...');
      const solicitacaoAtualizada = await SolicitacaoAutorizacaoModel.updateStatus(id, dadosAtualizacao);
      
      if (!solicitacaoAtualizada) {
        const response: ApiResponse = {
          success: false,
          message: 'Solicitação não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      console.log('✅ Solicitação atualizada com sucesso');
      const response: ApiResponse = {
        success: true,
        message: 'Status da solicitação atualizado com sucesso',
        data: SolicitacaoController.flattenSolicitacao(solicitacaoAtualizada as any)
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao atualizar status da solicitação:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar status da solicitação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // DELETE /api/solicitacoes/:id - Deletar solicitação
  static async destroy(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const clinicaId = req.user?.clinicaId || req.user?.id || null;
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const atual = await SolicitacaoAutorizacaoModel.findById(id);
      if (!atual) {
        const response: ApiResponse = { success: false, message: 'Solicitação não encontrada' };
        res.status(404).json(response);
        return;
      }
      if (clinicaId && (atual as any).clinica_id !== clinicaId) {
        const response: ApiResponse = { success: false, message: 'Acesso negado à solicitação' };
        res.status(403).json(response);
        return;
      }

      const deleted = await SolicitacaoAutorizacaoModel.delete(id);
      
      if (deleted) {
        const response: ApiResponse = {
          success: true,
          message: 'Solicitação deletada com sucesso'
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          message: 'Solicitação não encontrada'
        };
        res.status(404).json(response);
      }
    } catch (error) {
      console.error('Erro ao deletar solicitação:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao deletar solicitação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/solicitacoes/status/:status - Buscar solicitações por status
  static async getByStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = req.params.status;
      
      if (!['pendente', 'aprovada', 'rejeitada', 'em_analise'].includes(status)) {
        const response: ApiResponse = {
          success: false,
          message: 'Status inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const solicitacoes = await SolicitacaoAutorizacaoModel.findByStatus(status);
      
      const response: ApiResponse = {
        success: true,
        message: `Solicitações com status ${status} encontradas com sucesso`,
        data: solicitacoes
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar solicitações por status:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar solicitações por status',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/solicitacoes - Listar todas as solicitações
  static async index(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const user: any = req.user;

      // Operadora: listar todas as solicitações das clínicas vinculadas
      if (user?.tipo === 'operadora' && user?.operadoraId) {
        console.log('🔧 Filtrando solicitações para operadora ID:', user.operadoraId);
        
        // Buscar solicitações filtradas por operadora_id
        const result = await SolicitacaoAutorizacaoModel.findByOperadoraId(user.operadoraId, { page, limit });
        const mapped = {
          ...result,
          data: result.data.map(r => SolicitacaoController.flattenSolicitacao(r as any))
        };
        
        console.log(`✅ ${result.data.length} solicitações encontradas para operadora ${user.operadoraId}`);
        
        const response: ApiResponse = {
          success: true,
          message: 'Solicitações encontradas com sucesso',
          data: mapped
        };
        res.json(response);
        return;
      }

      const clinicaId = user?.clinicaId || user?.id || (req.query.clinica_id ? parseInt(req.query.clinica_id as string) : null);

      const result = clinicaId
        ? await SolicitacaoAutorizacaoModel.findByClinicaId(clinicaId, { page, limit })
        : await SolicitacaoAutorizacaoModel.findAll({ page, limit });

      const mapped = {
        ...result,
        data: result.data.map(r => SolicitacaoController.flattenSolicitacao(r as any))
      };
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitações encontradas com sucesso',
        data: mapped
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao listar solicitações:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao listar solicitações',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}