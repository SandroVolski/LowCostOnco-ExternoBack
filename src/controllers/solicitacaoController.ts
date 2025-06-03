// src/controllers/solicitacaoController.ts

import { Request, Response } from 'express';
import { SolicitacaoAutorizacaoModel } from '../models/SolicitacaoAutorizacao';
import { SolicitacaoCreateInput, SolicitacaoUpdateInput } from '../types/solicitacao';
import { ApiResponse } from '../types';
import { generateAuthorizationPDF } from '../utils/pdfGenerator';

export class SolicitacaoController {
  
  // POST /api/solicitacoes - Criar nova solicitação
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const dadosSolicitacao: SolicitacaoCreateInput = req.body;
      
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
      
      // Garantir que clinica_id seja fornecido (pode vir do token de autenticação)
      if (!dadosSolicitacao.clinica_id) {
        dadosSolicitacao.clinica_id = 1; // Valor padrão para testes
      }
      
      const novaSolicitacao = await SolicitacaoAutorizacaoModel.create(dadosSolicitacao);
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitação criada com sucesso',
        data: novaSolicitacao
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
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
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
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitação encontrada com sucesso',
        data: solicitacao
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
  static async getByClinica(req: Request, res: Response): Promise<void> {
    try {
      const clinicaId = parseInt(req.params.clinicaId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (isNaN(clinicaId)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da clínica inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const result = await SolicitacaoAutorizacaoModel.findByClinicaId(clinicaId, { page, limit });
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitações da clínica encontradas com sucesso',
        data: result
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
  
  // GET /api/solicitacoes/:id/pdf - Gerar PDF da solicitação
  static async generatePDF(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
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
      
      // Gerar o PDF
      const pdfBuffer = await generateAuthorizationPDF(solicitacao);
      
      // Configurar headers para download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="solicitacao_${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Enviar o PDF
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao gerar PDF',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // PUT /api/solicitacoes/:id/status - Atualizar status da solicitação
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const dadosAtualizacao: SolicitacaoUpdateInput = req.body;
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const solicitacaoAtualizada = await SolicitacaoAutorizacaoModel.updateStatus(id, dadosAtualizacao);
      
      if (!solicitacaoAtualizada) {
        const response: ApiResponse = {
          success: false,
          message: 'Solicitação não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Status da solicitação atualizado com sucesso',
        data: solicitacaoAtualizada
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao atualizar status da solicitação:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar status da solicitação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // DELETE /api/solicitacoes/:id - Deletar solicitação
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
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
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const clinicaId = req.query.clinica_id ? parseInt(req.query.clinica_id as string) : null;
      
      let result;
      
      if (clinicaId) {
        result = await SolicitacaoAutorizacaoModel.findByClinicaId(clinicaId, { page, limit });
      } else {
        // Implementar método para listar todas se necessário
        result = await SolicitacaoAutorizacaoModel.findByClinicaId(1, { page, limit }); // Temporário
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Solicitações encontradas com sucesso',
        data: result
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