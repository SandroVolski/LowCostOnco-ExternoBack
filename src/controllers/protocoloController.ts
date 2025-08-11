// src/controllers/protocoloController.ts

import { Request, Response } from 'express';
import { ProtocoloModel } from '../models/Protocolo';
import { ProtocoloCreateInput, ProtocoloUpdateInput } from '../types/protocolo';
import { ApiResponse } from '../types';

export class ProtocoloController {
  
  // POST /api/protocolos - Criar novo protocolo
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const dadosProtocolo: ProtocoloCreateInput = req.body;
      
      // Validações básicas
      if (!dadosProtocolo.nome || !dadosProtocolo.clinica_id) {
        const response: ApiResponse = {
          success: false,
          message: 'Campos obrigatórios: nome, clinica_id'
        };
        res.status(400).json(response);
        return;
      }
      
      // Garantir que clinica_id seja fornecido
      if (!dadosProtocolo.clinica_id) {
        dadosProtocolo.clinica_id = 1; // Valor padrão para testes
      }
      
      const novoProtocolo = await ProtocoloModel.create(dadosProtocolo);
      
      const response: ApiResponse = {
        success: true,
        message: 'Protocolo criado com sucesso',
        data: novoProtocolo
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao criar protocolo:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao criar protocolo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/protocolos/:id - Buscar protocolo por ID
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
      
      const protocolo = await ProtocoloModel.findById(id);
      
      if (!protocolo) {
        const response: ApiResponse = {
          success: false,
          message: 'Protocolo não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Protocolo encontrado com sucesso',
        data: protocolo
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar protocolo:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar protocolo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/protocolos/clinica/:clinicaId - Buscar protocolos por clínica
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
      
      const result = await ProtocoloModel.findByClinicaId(clinicaId, { page, limit });
      
      const response: ApiResponse = {
        success: true,
        message: 'Protocolos da clínica encontrados com sucesso',
        data: result
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar protocolos da clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar protocolos da clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // PUT /api/protocolos/:id - Atualizar protocolo
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const dadosAtualizacao: ProtocoloUpdateInput = req.body;
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const protocoloAtualizado = await ProtocoloModel.update(id, dadosAtualizacao);
      
      if (!protocoloAtualizado) {
        const response: ApiResponse = {
          success: false,
          message: 'Protocolo não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Protocolo atualizado com sucesso',
        data: protocoloAtualizado
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao atualizar protocolo:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar protocolo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // DELETE /api/protocolos/:id - Deletar protocolo
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
      
      const deleted = await ProtocoloModel.delete(id);
      
      if (deleted) {
        const response: ApiResponse = {
          success: true,
          message: 'Protocolo deletado com sucesso'
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          message: 'Protocolo não encontrado'
        };
        res.status(404).json(response);
      }
    } catch (error) {
      console.error('Erro ao deletar protocolo:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao deletar protocolo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/protocolos/status/:status - Buscar protocolos por status
  static async getByStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = req.params.status;
      
      if (!['ativo', 'inativo'].includes(status)) {
        const response: ApiResponse = {
          success: false,
          message: 'Status inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      const protocolos = await ProtocoloModel.findByStatus(status);
      
      const response: ApiResponse = {
        success: true,
        message: `Protocolos com status ${status} encontrados com sucesso`,
        data: protocolos
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar protocolos por status:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar protocolos por status',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // GET /api/protocolos/cid/:cid - Buscar protocolos por CID
  static async getByCID(req: Request, res: Response): Promise<void> {
    try {
      const cid = req.params.cid;
      
      if (!cid || cid.trim() === '') {
        const response: ApiResponse = {
          success: false,
          message: 'CID é obrigatório'
        };
        res.status(400).json(response);
        return;
      }
      
      const protocolos = await ProtocoloModel.findByCID(cid);
      
      const response: ApiResponse = {
        success: true,
        message: `Protocolos para CID ${cid} encontrados com sucesso`,
        data: protocolos
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar protocolos por CID:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar protocolos por CID',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/protocolos - Listar todos os protocolos
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const clinicaId = req.query.clinica_id ? parseInt(req.query.clinica_id as string) : null;
      
      let result;
      
      if (clinicaId) {
        result = await ProtocoloModel.findByClinicaId(clinicaId, { page, limit });
      } else {
        result = await ProtocoloModel.findAll({ page, limit });
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Protocolos encontrados com sucesso',
        data: result
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao listar protocolos:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao listar protocolos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
} 