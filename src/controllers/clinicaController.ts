// src/controllers/clinicaController.ts - VERSÃO CORRIGIDA COM LOGGING

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
    operadoraId?: number;
  };
}

export class ClinicaController {
  
  // GET /api/clinicas/profile - Buscar perfil da clínica logada
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Se tiver autenticação, usar o ID da clínica do token
      // Senão, usar ID padrão para desenvolvimento
      const clinicaId = req.user?.clinicaId || req.user?.id || 1;
      
      console.log('🔧 Buscando perfil da clínica ID:', clinicaId);
      
      const profile = await ClinicaModel.findById(clinicaId);
      
      if (!profile) {
        console.log('⚠️  Perfil da clínica não encontrado para ID:', clinicaId);
        const response: ApiResponse = {
          success: false,
          message: 'Perfil da clínica não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      console.log('✅ Perfil da clínica encontrado:', profile.clinica.nome);
      
      const response: ApiResponse = {
        success: true,
        message: 'Perfil da clínica encontrado com sucesso',
        data: profile
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar perfil da clínica:', error);
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
      
      console.log('🔧 Atualizando perfil da clínica ID:', clinicaId);
      console.log('📋 Dados recebidos:', JSON.stringify(updateData, null, 2));
      
      // Validações básicas
      if (!updateData.clinica) {
        console.log('❌ Dados da clínica não fornecidos');
        const response: ApiResponse = {
          success: false,
          message: 'Dados da clínica são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }
      
      // ✅ VALIDAÇÃO ADICIONAL: Verificar se não estão sendo enviados campos proibidos
      const forbiddenFields = ['id', 'created_at', 'updated_at'];
      const receivedForbiddenFields = forbiddenFields.filter(field => 
        updateData.clinica.hasOwnProperty(field)
      );
      
      if (receivedForbiddenFields.length > 0) {
        console.log('⚠️  Campos proibidos detectados:', receivedForbiddenFields);
        console.log('🧹 Removendo campos proibidos automaticamente...');
        
        // Remover campos proibidos
        forbiddenFields.forEach(field => {
          delete (updateData.clinica as any)[field];
        });
      }
      
      // Verificar se clínica existe
      const currentProfile = await ClinicaModel.findById(clinicaId);
      if (!currentProfile) {
        console.log('❌ Clínica não encontrada para ID:', clinicaId);
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      console.log('✅ Clínica existente encontrada:', currentProfile.clinica.nome);
      
      // Verificar se código já existe (se estiver sendo atualizado)
      if (updateData.clinica.codigo) {
        const codeExists = await ClinicaModel.checkCodeExists(updateData.clinica.codigo, clinicaId);
        if (codeExists) {
          console.log('❌ Código já existe:', updateData.clinica.codigo);
          const response: ApiResponse = {
            success: false,
            message: 'Já existe uma clínica com este código'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Atualizar dados da clínica
      console.log('🔄 Iniciando atualização da clínica...');
      const updatedClinica = await ClinicaModel.update(clinicaId, updateData.clinica);
      if (!updatedClinica) {
        console.log('❌ Falha na atualização da clínica');
        throw new Error('Erro ao atualizar clínica');
      }
      
      console.log('✅ Clínica atualizada com sucesso');
      
      // Processar responsáveis técnicos se fornecidos
      if (updateData.responsaveis_tecnicos) {
        console.log('🔄 Processando responsáveis técnicos...');
        const { create, update, delete: deleteIds } = updateData.responsaveis_tecnicos;
        
        // Criar novos responsáveis
        if (create && create.length > 0) {
          console.log('➕ Criando', create.length, 'novos responsáveis');
          for (const responsavelData of create) {
            // Verificar se CRM já existe na clínica
            const crmExists = await ResponsavelTecnicoModel.checkCrmExists(
              clinicaId, 
              responsavelData.crm
            );
            if (crmExists) {
              console.log('❌ CRM já existe:', responsavelData.crm);
              const response: ApiResponse = {
                success: false,
                message: `CRM ${responsavelData.crm} já está cadastrado nesta clínica`
              };
              res.status(400).json(response);
              return;
            }
            
            responsavelData.clinica_id = clinicaId;
            await ResponsavelTecnicoModel.create(responsavelData);
            console.log('✅ Responsável criado:', responsavelData.nome);
          }
        }
        
        // Atualizar responsáveis existentes
        if (update && update.length > 0) {
          console.log('🔄 Atualizando', update.length, 'responsáveis');
          for (const updateItem of update) {
            // Verificar se CRM já existe na clínica (excluindo o próprio)
            if (updateItem.data.crm) {
              const crmExists = await ResponsavelTecnicoModel.checkCrmExists(
                clinicaId, 
                updateItem.data.crm, 
                updateItem.id
              );
              if (crmExists) {
                console.log('❌ CRM já existe (update):', updateItem.data.crm);
                const response: ApiResponse = {
                  success: false,
                  message: `CRM ${updateItem.data.crm} já está cadastrado nesta clínica`
                };
                res.status(400).json(response);
                return;
              }
            }
            
            await ResponsavelTecnicoModel.update(updateItem.id, updateItem.data);
            console.log('✅ Responsável atualizado ID:', updateItem.id);
          }
        }
        
        // Deletar responsáveis
        if (deleteIds && deleteIds.length > 0) {
          console.log('🗑️  Deletando', deleteIds.length, 'responsáveis');
          for (const id of deleteIds) {
            await ResponsavelTecnicoModel.delete(id);
            console.log('✅ Responsável deletado ID:', id);
          }
        }
      }
      
      // Buscar perfil atualizado
      console.log('🔍 Buscando perfil atualizado...');
      const updatedProfile = await ClinicaModel.findById(clinicaId);
      
      if (!updatedProfile) {
        console.log('❌ Erro ao buscar perfil atualizado');
        throw new Error('Erro ao buscar perfil atualizado');
      }
      
      console.log('✅ Perfil atualizado com sucesso!');
      
      const response: ApiResponse = {
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updatedProfile
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil da clínica:', error);
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
      // Proteção: somente desenvolvedores com segredo podem registrar
      const adminSecretHeader = (req.headers['x-admin-secret'] || (req.headers as any)['X-Admin-Secret']) as string | undefined;
      const expected = process.env.ADMIN_REGISTRATION_SECRET
        || process.env.ADMIN_INIT_SECRET
        || (process.env.NODE_ENV === 'development' ? 'admin-setup-secret' : '');
      if (!expected || !adminSecretHeader || adminSecretHeader !== expected) {
        const response: ApiResponse = {
          success: false,
          message: 'Acesso negado ao registro. Contate o suporte.'
        };
        res.status(403).json(response);
        return;
      }

      const clinicaData: ClinicaCreateInput = req.body;
      
      console.log('🔧 Registrando nova clínica:', clinicaData.nome);
      
      // Validações básicas
      if (!clinicaData.nome || !clinicaData.codigo) {
        console.log('❌ Dados obrigatórios faltando');
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
        console.log('❌ Código já existe:', clinicaData.codigo);
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
          console.log('❌ Usuário já existe:', clinicaData.usuario);
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
      
      console.log('✅ Clínica registrada com sucesso:', novaClinica.nome);
      
      // Remover senha da resposta
      const { senha, ...clinicaResponse } = novaClinica;
      
      const response: ApiResponse = {
        success: true,
        message: 'Clínica registrada com sucesso',
        data: clinicaResponse
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Erro ao registrar clínica:', error);
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
      
      console.log('🔧 Tentativa de login para usuário:', usuario);
      
      // Validações básicas
      if (!usuario || !senha) {
        console.log('❌ Credenciais faltando');
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
        console.log('❌ Usuário não encontrado:', usuario);
        const response: ApiResponse = {
          success: false,
          message: 'Usuário ou senha inválidos'
        };
        res.status(401).json(response);
        return;
      }
      
      // Verificar senha
      if (!clinica.senha || !await bcrypt.compare(senha, clinica.senha)) {
        console.log('❌ Senha inválida para usuário:', usuario);
        const response: ApiResponse = {
          success: false,
          message: 'Usuário ou senha inválidos'
        };
        res.status(401).json(response);
        return;
      }
      
      // Verificar se clínica está ativa
      if (clinica.status !== 'ativo') {
        console.log('❌ Clínica inativa:', clinica.nome);
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
          tipo: 'clinica',
          role: 'clinica'
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '7d' }
      );
      
      console.log('✅ Login realizado com sucesso para:', clinica.nome);
      
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
      console.error('❌ Erro no login da clínica:', error);
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
      
      console.log('🔧 Adicionando responsável técnico para clínica ID:', clinicaId);
      console.log('👨‍⚕️ Dados do responsável:', responsavelData);
      
      // Validações básicas
      if (!responsavelData.nome || !responsavelData.crm || !responsavelData.especialidade) {
        console.log('❌ Dados obrigatórios faltando');
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
        console.log('❌ CRM já existe:', responsavelData.crm);
        const response: ApiResponse = {
          success: false,
          message: 'CRM já está cadastrado nesta clínica'
        };
        res.status(400).json(response);
        return;
      }
      
      responsavelData.clinica_id = clinicaId;
      const novoResponsavel = await ResponsavelTecnicoModel.create(responsavelData);
      
      console.log('✅ Responsável técnico adicionado:', novoResponsavel.nome);
      
      const response: ApiResponse = {
        success: true,
        message: 'Responsável técnico adicionado com sucesso',
        data: novoResponsavel
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Erro ao adicionar responsável técnico:', error);
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
      
      console.log('🔧 Atualizando responsável técnico ID:', id);
      console.log('📋 Dados recebidos:', responsavelData);
      
      if (isNaN(id)) {
        console.log('❌ ID inválido:', req.params.id);
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
        console.log('❌ Responsável não encontrado ou não pertence à clínica');
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
          console.log('❌ CRM já existe (update):', responsavelData.crm);
          const response: ApiResponse = {
            success: false,
            message: 'CRM já está cadastrado nesta clínica'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      const responsavelAtualizado = await ResponsavelTecnicoModel.update(id, responsavelData);
      
      if (!responsavelAtualizado) {
        console.log('❌ Falha na atualização do responsável');
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao atualizar responsável técnico'
        };
        res.status(500).json(response);
        return;
      }
      
      console.log('✅ Responsável técnico atualizado:', responsavelAtualizado.nome);
      
      const response: ApiResponse = {
        success: true,
        message: 'Responsável técnico atualizado com sucesso',
        data: responsavelAtualizado
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao atualizar responsável técnico:', error);
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
      
      console.log('🔧 Removendo responsável técnico ID:', id);
      
      if (isNaN(id)) {
        console.log('❌ ID inválido:', req.params.id);
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
        console.log('❌ Responsável não encontrado ou não pertence à clínica');
        const response: ApiResponse = {
          success: false,
          message: 'Responsável técnico não encontrado'
        };
        res.status(404).json(response);
        return;
      }
      
      const deleted = await ResponsavelTecnicoModel.delete(id);
      
      if (deleted) {
        console.log('✅ Responsável técnico removido:', currentResponsavel.nome);
        const response: ApiResponse = {
          success: true,
          message: 'Responsável técnico removido com sucesso'
        };
        res.json(response);
      } else {
        console.log('❌ Falha na remoção do responsável');
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao remover responsável técnico'
        };
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('❌ Erro ao remover responsável técnico:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao remover responsável técnico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // 🆕 MÉTODOS ADMINISTRATIVOS PARA CRUD COMPLETO

  // GET /api/clinicas/admin - Listar todas as clínicas (para administradores)
  static async getAllClinicas(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 Buscando todas as clínicas...');
      
      const clinicas = await ClinicaModel.findAll();
      
      console.log(`✅ ${clinicas.length} clínicas encontradas`);
      
      const response: ApiResponse = {
        success: true,
        message: 'Clínicas listadas com sucesso',
        data: clinicas
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao listar clínicas:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao listar clínicas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/clinicas/admin/:id - Buscar clínica por ID (para administradores)
  static async getClinicaById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        console.log('❌ ID inválido:', req.params.id);
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      console.log('🔧 Buscando clínica ID:', id);
      
      const clinica = await ClinicaModel.findById(id);
      
      if (!clinica) {
        console.log('❌ Clínica não encontrada para ID:', id);
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      console.log('✅ Clínica encontrada:', clinica.clinica.nome);
      
      const response: ApiResponse = {
        success: true,
        message: 'Clínica encontrada com sucesso',
        data: clinica
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // POST /api/clinicas/admin - Criar nova clínica (para administradores)
  static async createClinica(req: Request, res: Response): Promise<void> {
    try {
      const clinicaData: ClinicaCreateInput = req.body;
      
      console.log('🔧 Criando nova clínica...');
      console.log('📋 Dados recebidos:', JSON.stringify(clinicaData, null, 2));
      
      // Validações básicas
      if (!clinicaData.nome || !clinicaData.codigo) {
        console.log('❌ Nome e código são obrigatórios');
        const response: ApiResponse = {
          success: false,
          message: 'Nome e código são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se código já existe
      const codigoExists = await ClinicaModel.checkCodeExists(clinicaData.codigo);
      if (codigoExists) {
        console.log('❌ Código já existe:', clinicaData.codigo);
        const response: ApiResponse = {
          success: false,
          message: 'Código já está em uso'
        };
        res.status(400).json(response);
        return;
      }
      
      // Verificar se usuário já existe (se fornecido)
      if (clinicaData.usuario) {
        const usuarioExists = await ClinicaModel.checkUserExists(clinicaData.usuario);
        if (usuarioExists) {
          console.log('❌ Usuário já existe:', clinicaData.usuario);
          const response: ApiResponse = {
            success: false,
            message: 'Usuário já está em uso'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Criptografar senha se fornecida
      if (clinicaData.senha) {
        const saltRounds = 10;
        clinicaData.senha = await bcrypt.hash(clinicaData.senha, saltRounds);
      }
      
      const novaClinica = await ClinicaModel.create(clinicaData);
      
      console.log('✅ Clínica criada com sucesso:', novaClinica.nome);
      
      const response: ApiResponse = {
        success: true,
        message: 'Clínica criada com sucesso',
        data: novaClinica
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Erro ao criar clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao criar clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // PUT /api/clinicas/admin/:id - Atualizar clínica (para administradores)
  static async updateClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const updateData: ClinicaUpdateInput = req.body;
      
      if (isNaN(id)) {
        console.log('❌ ID inválido:', req.params.id);
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      console.log('🔧 Atualizando clínica ID:', id);
      console.log('📋 Dados recebidos:', JSON.stringify(updateData, null, 2));
      
      // Verificar se clínica existe
      const clinicaExistente = await ClinicaModel.findById(id);
      if (!clinicaExistente) {
        console.log('❌ Clínica não encontrada para ID:', id);
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      // Verificar se código já existe (se estiver sendo alterado)
      if (updateData.codigo && updateData.codigo !== clinicaExistente.clinica.codigo) {
        const codigoExists = await ClinicaModel.checkCodeExists(updateData.codigo, id);
        if (codigoExists) {
          console.log('❌ Código já existe:', updateData.codigo);
          const response: ApiResponse = {
            success: false,
            message: 'Código já está em uso'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Verificar se usuário já existe (se estiver sendo alterado)
      if (updateData.usuario && updateData.usuario !== clinicaExistente.clinica.usuario) {
        const usuarioExists = await ClinicaModel.checkUserExists(updateData.usuario, id);
        if (usuarioExists) {
          console.log('❌ Usuário já existe:', updateData.usuario);
          const response: ApiResponse = {
            success: false,
            message: 'Usuário já está em uso'
          };
          res.status(400).json(response);
          return;
        }
      }
      
      // Criptografar senha se fornecida
      if (updateData.senha) {
        const saltRounds = 10;
        updateData.senha = await bcrypt.hash(updateData.senha, saltRounds);
      }
      
      const clinicaAtualizada = await ClinicaModel.update(id, updateData);
      
      if (!clinicaAtualizada) {
        console.log('❌ Falha na atualização da clínica');
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao atualizar clínica'
        };
        res.status(500).json(response);
        return;
      }
      
      console.log('✅ Clínica atualizada com sucesso:', clinicaAtualizada.nome);
      
      const response: ApiResponse = {
        success: true,
        message: 'Clínica atualizada com sucesso',
        data: clinicaAtualizada
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao atualizar clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao atualizar clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // DELETE /api/clinicas/admin/:id - Deletar clínica (para administradores)
  static async deleteClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        console.log('❌ ID inválido:', req.params.id);
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      console.log('🔧 Deletando clínica ID:', id);
      
      // Verificar se clínica existe
      const clinicaExistente = await ClinicaModel.findById(id);
      if (!clinicaExistente) {
        console.log('❌ Clínica não encontrada para ID:', id);
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      const deleted = await ClinicaModel.delete(id);
      
      if (deleted) {
        console.log('✅ Clínica deletada com sucesso:', clinicaExistente.clinica.nome);
        const response: ApiResponse = {
          success: true,
          message: 'Clínica deletada com sucesso'
        };
        res.json(response);
      } else {
        console.log('❌ Falha na deleção da clínica');
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao deletar clínica'
        };
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao deletar clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/clinicas/por-operadora - Buscar clínicas credenciadas por operadora
  static async getClinicasPorOperadora(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('🔧 Buscando clínicas por operadora...');
      
      const operadoraId = req.user?.operadoraId;
      
      if (!operadoraId) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da operadora não encontrado'
        };
        res.status(400).json(response);
        return;
      }

      // Buscar clínicas específicas da operadora
      const clinicas = await ClinicaModel.findByOperadoraId(operadoraId);
      
      console.log(`✅ Encontradas ${clinicas.length} clínicas para operadora ${operadoraId}`);
      
      const response: ApiResponse = {
        success: true,
        message: 'Clínicas obtidas com sucesso',
        data: clinicas
      };
      
      res.json(response);
      
    } catch (error) {
      console.error('❌ Erro ao buscar clínicas por operadora:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar clínicas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}