// src/controllers/clinicaController.ts

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ClinicaModel, ResponsavelTecnicoModel } from '../models/Clinica';
import { 
  ClinicaCreateInput, 
  ClinicaUpdateInput,
  ResponsavelTecnicoCreateInput,
  ResponsavelTecnicoUpdateInput,
  UpdateClinicProfileRequest,
  ClinicLoginRequest
} from '../types/clinic';
import { ApiResponse } from '../types';

interface AuthRequest extends Request {
  user?: {
    id: number;
    tipo: 'clinica' | 'operadora';
    clinicaId?: number;
  };
}

export class ClinicaController {
  
  // GET /api/clinicas/profile - Buscar perfil da clínica logada
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Se tiver autenticação, usar o ID da clínica do token
      // Senão, usar ID padrão para desenvolvimento
      const clinicaId = req.user?.clinicaId || req.user?.id || 1;
      
      const profile = await ClinicaModel.findById(clinicaId);
      
      if (!profile) {
        const response: ApiResponse = {
          success: false,
          message: 'Perfil da clínica não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Perfil da clínica encontrado com sucesso',
        data: profile
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar perfil da clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar perfil da clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // PUT /api/clinicas/profile - Atualizar perfil da clínica
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicaId = req.user?.clinicaId || req.user?.id || 1;
      const updateData: UpdateClinicProfileRequest = req.body;
      
      // Validações básicas
      if (!updateData.clinica) {
        const response: ApiResponse = {
          success: false,
          message: 'Dados da clínica são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se clínica existe
      const currentProfile = await ClinicaModel.findById(clinicaId);
      if (!currentProfile) {
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      // Verificar se código já existe (se estiver sendo atualizado)
      if (updateData.clinica.codigo) {
        const codeExists = await ClinicaModel.checkCodeExists(updateData.clinica.codigo, clinicaId);
        if (codeExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Já existe uma clínica com este código'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Atualizar dados da clínica
      const updatedClinica = await ClinicaModel.update(clinicaId, updateData.clinica);
      if (!updatedClinica) {
        throw new Error('Erro ao atualizar clínica');
      }
      
      // Processar responsáveis técnicos se fornecidos
      if (updateData.responsaveis_tecnicos) {
        const { create, update, delete: deleteIds } = updateData.responsaveis_tecnicos;
        
        // Criar novos responsáveis
        if (create && create.length > 0) {
          for (const responsavelData of create) {
            // Verificar se CRM já existe na clínica
            const crmExists = await ResponsavelTecnicoModel.checkCrmExists(
              clinicaId, 
              responsavelData.crm
            );
            if (crmExists) {
              const response: ApiResponse = {
                success: false,
                message: `CRM ${responsavelData.crm} já está cadastrado nesta clínica`
              };
              res.status(400).json(response);
              return;
            }
            
            responsavelData.clinica_id = clinicaId;
            await ResponsavelTecnicoModel.create(responsavelData);
          }
        }
        
        // Atualizar responsáveis existentes
        if (update && update.length > 0) {
          for (const updateItem of update) {
            // Verificar se CRM já existe na clínica (excluindo o próprio)
            if (updateItem.data.crm) {
              const crmExists = await ResponsavelTecnicoModel.checkCrmExists(
                clinicaId, 
                updateItem.data.crm, 
                updateItem.id
              );
              if (crmExists) {
                const response: ApiResponse = {
                  success: false,
                  message: `CRM ${updateItem.data.crm} já está cadastrado nesta clínica`
                };
                res.status(400).json(response);
                return;
              }
            }
            
            await ResponsavelTecnicoModel.update(updateItem.id, updateItem.data);
          }
        }
        
        // Deletar responsáveis
        if (deleteIds && deleteIds.length > 0) {
          for (const id of deleteIds) {
            await ResponsavelTecnicoModel.delete(id);
          }
        }
      }
      
      // Buscar perfil atualizado
      const updatedProfile = await ClinicaModel.findById(clinicaId);
      
      const response: ApiResponse = {
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updatedProfile
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao atualizar perfil da clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar perfil da clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // POST /api/clinicas/register - Registrar nova clínica
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const clinicaData: ClinicaCreateInput = req.body;
      
      // Validações básicas
      if (!clinicaData.nome || !clinicaData.codigo) {
        const response: ApiResponse = {
          success: false,
          message: 'Nome e código da clínica são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se código já existe
      const codeExists = await ClinicaModel.checkCodeExists(clinicaData.codigo);
      if (codeExists) {
        const response: ApiResponse = {
          success: false,
          message: 'Já existe uma clínica com este código'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se usuário já existe (se fornecido)
      if (clinicaData.usuario) {
        const userExists = await ClinicaModel.checkUserExists(clinicaData.usuario);
        if (userExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Já existe uma clínica com este usuário'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Hash da senha se fornecida
      if (clinicaData.senha) {
        clinicaData.senha = await bcrypt.hash(clinicaData.senha, 10);
      }
      
      const novaClinica = await ClinicaModel.create(clinicaData);
      
      // Remover senha da resposta
      const { senha, ...clinicaResponse } = novaClinica;
      
      const response: ApiResponse = {
        success: true,
        message: 'Clínica registrada com sucesso',
        data: clinicaResponse
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao registrar clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao registrar clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // POST /api/clinicas/login - Login da clínica
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { usuario, senha }: ClinicLoginRequest = req.body;
      
      // Validações básicas
      if (!usuario || !senha) {
        const response: ApiResponse = {
          success: false,
          message: 'Usuário e senha são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }
      
      // Buscar clínica por usuário
      const clinica = await ClinicaModel.findByUser(usuario);
      if (!clinica) {
        const response: ApiResponse = {
          success: false,
          message: 'Usuário ou senha inválidos'
        };
        res.status(401).json(response);
        return;
      }
      
      // Verificar senha
      if (!clinica.senha || !await bcrypt.compare(senha, clinica.senha)) {
        const response: ApiResponse = {
          success: false,
          message: 'Usuário ou senha inválidos'
        };
        res.status(401).json(response);
        return;
      }
      
      // Verificar se clínica está ativa
      if (clinica.status !== 'ativo') {
        const response: ApiResponse = {
          success: false,
          message: 'Clínica inativa. Entre em contato com o suporte.'
        };
        res.status(403).json(response);
        return;
      }
      
      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: clinica.id, 
          clinicaId: clinica.id,
          tipo: 'clinica' 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      // Remover senha da resposta
      const { senha: _, ...clinicaResponse } = clinica;
      
      const response: ApiResponse = {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          clinic: clinicaResponse,
          token
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro no login da clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro no login',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // POST /api/clinicas/responsaveis - Adicionar responsável técnico
  static async addResponsavel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clinicaId = req.user?.clinicaId || req.user?.id || 1;
      const responsavelData: ResponsavelTecnicoCreateInput = req.body;
      
      // Validações básicas
      if (!responsavelData.nome || !responsavelData.crm || !responsavelData.especialidade) {
        const response: ApiResponse = {
          success: false,
          message: 'Nome, CRM e especialidade são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se CRM já existe na clínica
      const crmExists = await ResponsavelTecnicoModel.checkCrmExists(clinicaId, responsavelData.crm);
      if (crmExists) {
        const response: ApiResponse = {
          success: false,
          message: 'CRM já está cadastrado nesta clínica'
        };
        res.status(400).json(response);
        return;
      }
      
      responsavelData.clinica_id = clinicaId;
      const novoResponsavel = await ResponsavelTecnicoModel.create(responsavelData);
      
      const response: ApiResponse = {
        success: true,
        message: 'Responsável técnico adicionado com sucesso',
        data: novoResponsavel
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao adicionar responsável técnico:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao adicionar responsável técnico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // PUT /api/clinicas/responsaveis/:id - Atualizar responsável técnico
  static async updateResponsavel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const clinicaId = req.user?.clinicaId || req.user?.id || 1;
      const responsavelData: ResponsavelTecnicoUpdateInput = req.body;
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se responsável existe e pertence à clínica
      const currentResponsavel = await ResponsavelTecnicoModel.findById(id);
      if (!currentResponsavel || currentResponsavel.clinica_id !== clinicaId) {
        const response: ApiResponse = {
          success: false,
          message: 'Responsável técnico não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      // Verificar se CRM já existe na clínica (se estiver sendo atualizado)
      if (responsavelData.crm) {
        const crmExists = await ResponsavelTecnicoModel.checkCrmExists(
          clinicaId, 
          responsavelData.crm, 
          id
        );
        if (crmExists) {
          const response: ApiResponse = {
            success: false,
            message: 'CRM já está cadastrado nesta clínica'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      const responsavelAtualizado = await ResponsavelTecnicoModel.update(id, responsavelData);
      
      const response: ApiResponse = {
        success: true,
        message: 'Responsável técnico atualizado com sucesso',
        data: responsavelAtualizado
      };
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao atualizar responsável técnico:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar responsável técnico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
  
  // DELETE /api/clinicas/responsaveis/:id - Remover responsável técnico
  static async removeResponsavel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const clinicaId = req.user?.clinicaId || req.user?.id || 1;
      
      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se responsável existe e pertence à clínica
      const currentResponsavel = await ResponsavelTecnicoModel.findById(id);
      if (!currentResponsavel || currentResponsavel.clinica_id !== clinicaId) {
        const response: ApiResponse = {
          success: false,
          message: 'Responsável técnico não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      const deleted = await ResponsavelTecnicoModel.delete(id);
      
      if (deleted) {
        const response: ApiResponse = {
          success: true,
          message: 'Responsável técnico removido com sucesso'
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao remover responsável técnico'
        };
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('Erro ao remover responsável técnico:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao remover responsável técnico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}