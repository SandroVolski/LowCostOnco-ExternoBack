// src/controllers/procedimentoController.ts

import { Request, Response } from 'express';
import { ProcedimentoModel } from '../models/Procedimento';
import type { 
  ProcedimentoCreateInput, 
  ProcedimentoUpdateInput,
  NegociacaoCreateInput,
  NegociacaoUpdateInput
} from '../models/Procedimento';

export class ProcedimentoController {
  
  // ==================== PROCEDIMENTOS ====================
  
  /**
   * Listar procedimentos por clínica
   * GET /api/procedimentos?clinica_id=123
   */
  static async getProcedimentosByClinica(req: Request, res: Response) {
    try {
      const clinicaId = parseInt(req.query.clinica_id as string);
      
      if (!clinicaId || isNaN(clinicaId)) {
        return res.status(400).json({
          success: false,
          message: 'ID da clínica é obrigatório'
        });
      }
      
      // Verificar se o usuário tem permissão para acessar esta clínica
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== clinicaId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar procedimentos desta clínica'
        });
      }
      
      const procedimentos = await ProcedimentoModel.findByClinicaId(clinicaId);
      
      return res.json({
        success: true,
        data: procedimentos
      });
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao buscar procedimentos'
      });
    }
  }
  
  /**
   * Buscar procedimento por ID com suas negociações
   * GET /api/procedimentos/:id
   */
  static async getProcedimentoById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID do procedimento inválido'
        });
      }
      
      const procedimento = await ProcedimentoModel.findByIdWithNegociacoes(id);
      
      if (!procedimento) {
        return res.status(404).json({
          success: false,
          message: 'Procedimento não encontrado'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== procedimento.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este procedimento'
        });
      }
      
      return res.json({
        success: true,
        data: procedimento
      });
    } catch (error) {
      console.error('Erro ao buscar procedimento:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao buscar procedimento'
      });
    }
  }
  
  /**
   * Criar novo procedimento
   * POST /api/procedimentos
   */
  static async createProcedimento(req: Request, res: Response) {
    try {
      const data: ProcedimentoCreateInput = req.body;
      
      // Validações básicas
      if (!data.clinica_id || !data.codigo || !data.descricao || !data.categoria || !data.unidade_pagamento) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: clinica_id, codigo, descricao, categoria, unidade_pagamento'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== data.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para criar procedimentos para esta clínica'
        });
      }
      
      const procedimento = await ProcedimentoModel.create(data);
      
      return res.status(201).json({
        success: true,
        message: 'Procedimento criado com sucesso',
        data: procedimento
      });
    } catch (error) {
      console.error('Erro ao criar procedimento:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao criar procedimento'
      });
    }
  }
  
  /**
   * Atualizar procedimento
   * PUT /api/procedimentos/:id
   */
  static async updateProcedimento(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const data: ProcedimentoUpdateInput = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID do procedimento inválido'
        });
      }
      
      // Verificar se o procedimento existe
      const existing = await ProcedimentoModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Procedimento não encontrado'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== existing.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para atualizar este procedimento'
        });
      }
      
      const procedimento = await ProcedimentoModel.update(id, data);
      
      return res.json({
        success: true,
        message: 'Procedimento atualizado com sucesso',
        data: procedimento
      });
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar procedimento'
      });
    }
  }
  
  /**
   * Deletar procedimento
   * DELETE /api/procedimentos/:id
   */
  static async deleteProcedimento(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID do procedimento inválido'
        });
      }
      
      // Verificar se o procedimento existe
      const existing = await ProcedimentoModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Procedimento não encontrado'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== existing.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para deletar este procedimento'
        });
      }
      
      await ProcedimentoModel.delete(id);
      
      return res.json({
        success: true,
        message: 'Procedimento deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar procedimento:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao deletar procedimento'
      });
    }
  }
  
  // ==================== NEGOCIAÇÕES ====================
  
  /**
   * Listar negociações de uma clínica
   * GET /api/procedimentos/negociacoes?clinica_id=123
   */
  static async getNegociacoesByClinica(req: Request, res: Response) {
    try {
      const clinicaId = parseInt(req.query.clinica_id as string);
      
      if (!clinicaId || isNaN(clinicaId)) {
        return res.status(400).json({
          success: false,
          message: 'ID da clínica é obrigatório'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== clinicaId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar negociações desta clínica'
        });
      }
      
      const negociacoes = await ProcedimentoModel.getNegociacoesByClinica(clinicaId);
      
      return res.json({
        success: true,
        data: negociacoes
      });
    } catch (error) {
      console.error('Erro ao buscar negociações:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao buscar negociações'
      });
    }
  }
  
  /**
   * Listar negociações de um procedimento
   * GET /api/procedimentos/:id/negociacoes
   */
  static async getNegociacoesByProcedimento(req: Request, res: Response) {
    try {
      const procedimentoId = parseInt(req.params.id);
      
      if (!procedimentoId || isNaN(procedimentoId)) {
        return res.status(400).json({
          success: false,
          message: 'ID do procedimento inválido'
        });
      }
      
      // Verificar se o procedimento existe
      const procedimento = await ProcedimentoModel.findById(procedimentoId);
      if (!procedimento) {
        return res.status(404).json({
          success: false,
          message: 'Procedimento não encontrado'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== procedimento.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar negociações deste procedimento'
        });
      }
      
      const negociacoes = await ProcedimentoModel.getNegociacoesByProcedimento(procedimentoId);
      
      return res.json({
        success: true,
        data: negociacoes
      });
    } catch (error) {
      console.error('Erro ao buscar negociações do procedimento:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao buscar negociações do procedimento'
      });
    }
  }
  
  /**
   * Buscar negociações vigentes entre clínica e operadora
   * GET /api/procedimentos/negociacoes/vigentes?clinica_id=123&operadora_id=456
   */
  static async getNegociacoesVigentes(req: Request, res: Response) {
    try {
      const clinicaId = parseInt(req.query.clinica_id as string);
      const operadoraId = parseInt(req.query.operadora_id as string);
      
      if (!clinicaId || isNaN(clinicaId) || !operadoraId || isNaN(operadoraId)) {
        return res.status(400).json({
          success: false,
          message: 'IDs da clínica e operadora são obrigatórios'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== clinicaId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar negociações desta clínica'
        });
      }
      
      const negociacoes = await ProcedimentoModel.getNegociacoesVigentes(clinicaId, operadoraId);
      
      return res.json({
        success: true,
        data: negociacoes
      });
    } catch (error) {
      console.error('Erro ao buscar negociações vigentes:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao buscar negociações vigentes'
      });
    }
  }
  
  /**
   * Criar nova negociação
   * POST /api/procedimentos/:id/negociacoes
   */
  static async createNegociacao(req: Request, res: Response) {
    try {
      const procedimentoId = parseInt(req.params.id);
      const data: Omit<NegociacaoCreateInput, 'procedimento_id'> = req.body;
      
      if (!procedimentoId || isNaN(procedimentoId)) {
        return res.status(400).json({
          success: false,
          message: 'ID do procedimento inválido'
        });
      }
      
      // Verificar se o procedimento existe
      const procedimento = await ProcedimentoModel.findById(procedimentoId);
      if (!procedimento) {
        return res.status(404).json({
          success: false,
          message: 'Procedimento não encontrado'
        });
      }
      
      // Validações
      if (!data.operadora_id || !data.clinica_id || data.valor === undefined || data.credenciado === undefined || !data.data_inicio) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: operadora_id, clinica_id, valor, credenciado, data_inicio'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== data.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para criar negociações para esta clínica'
        });
      }
      
      const negociacao = await ProcedimentoModel.createNegociacao({
        ...data,
        procedimento_id: procedimentoId
      } as NegociacaoCreateInput);
      
      return res.status(201).json({
        success: true,
        message: 'Negociação criada com sucesso',
        data: negociacao
      });
    } catch (error) {
      console.error('Erro ao criar negociação:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao criar negociação'
      });
    }
  }
  
  /**
   * Atualizar negociação
   * PUT /api/procedimentos/negociacoes/:id
   */
  static async updateNegociacao(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const data: NegociacaoUpdateInput = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID da negociação inválido'
        });
      }
      
      // Verificar se a negociação existe
      const existing = await ProcedimentoModel.findNegociacaoById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Negociação não encontrada'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== existing.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para atualizar esta negociação'
        });
      }
      
      const negociacao = await ProcedimentoModel.updateNegociacao(id, data);
      
      return res.json({
        success: true,
        message: 'Negociação atualizada com sucesso',
        data: negociacao
      });
    } catch (error) {
      console.error('Erro ao atualizar negociação:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar negociação'
      });
    }
  }
  
  /**
   * Deletar negociação
   * DELETE /api/procedimentos/negociacoes/:id
   */
  static async deleteNegociacao(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID da negociação inválido'
        });
      }
      
      // Verificar se a negociação existe
      const existing = await ProcedimentoModel.findNegociacaoById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Negociação não encontrada'
        });
      }
      
      // Verificar permissão
      const user = (req as any).user;
      if (user.role === 'clinica' && user.clinicaId !== existing.clinica_id) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para deletar esta negociação'
        });
      }
      
      await ProcedimentoModel.deleteNegociacao(id);
      
      return res.json({
        success: true,
        message: 'Negociação deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar negociação:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao deletar negociação'
      });
    }
  }
}

