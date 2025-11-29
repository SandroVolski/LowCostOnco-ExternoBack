// src/controllers/clinicaController.ts - VERSÃO CORRIGIDA COM LOGGING

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ClinicaModel, ResponsavelTecnicoModel } from '../models/Clinica';
import { query } from '../config/database';
import { 
  ClinicaCreateInput, 
  ClinicaUpdateInput,
  ResponsavelTecnicoCreateInput,
  ResponsavelTecnicoUpdateInput,
  UpdateClinicProfileRequest,
  ClinicLoginRequest
} from '../types/clinic';
import { ApiResponse } from '../types';
import { ClinicaOperadoraModel } from '../models/ClinicaOperadora';

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

      // Validações básicas
      if (!updateData.clinica) {
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
        // Remover campos proibidos
        forbiddenFields.forEach(field => {
          delete (updateData.clinica as any)[field];
        });
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
            // Verificar se registro já existe na clínica
            const registroExists = await ResponsavelTecnicoModel.checkRegistroExists(
              clinicaId, 
              responsavelData.registro_conselho
            );
            if (registroExists) {
              const response: ApiResponse = {
                success: false,
                message: `Registro ${responsavelData.registro_conselho} já está cadastrado nesta clínica`
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
            if (updateItem.data.registro_conselho) {
              const registroExists = await ResponsavelTecnicoModel.checkRegistroExists(
                clinicaId,
                updateItem.data.registro_conselho,
                updateItem.id
              );
              if (registroExists) {
                const response: ApiResponse = {
                  success: false,
                  message: `Registro ${updateItem.data.registro_conselho} já está cadastrado nesta clínica`
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

      const updatedProfile = await ClinicaModel.findById(clinicaId);

      if (!updatedProfile) {
        throw new Error('Erro ao buscar perfil atualizado');
      }

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

      // Criar usuário na tabela usuarios para login
      if (clinicaData.usuario && clinicaData.senha) {
        try {
          const insertUserQuery = `
            INSERT INTO usuarios (username, password_hash, role, clinica_id, status, created_at, updated_at)
            VALUES (?, ?, 'clinica', ?, 'ativo', NOW(), NOW())
          `;

          await query(insertUserQuery, [clinicaData.usuario, clinicaData.senha, novaClinica.id]);
        } catch (userError) {
          console.error('⚠️ Erro ao criar usuário na tabela usuarios:', userError);
          // Não falhar o registro da clínica por causa do usuário
        }
      }

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

      // Validações básicas
      if (!usuario || !senha) {
        const response: ApiResponse = {
          success: false,
          message: 'Usuário e senha são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }

      // Buscar usuário na tabela usuarios (consolidada)
      const usuarios = await query(
        'SELECT u.*, c.nome as clinica_nome, c.codigo as clinica_codigo, c.status as clinica_status FROM usuarios u JOIN clinicas c ON u.clinica_id = c.id WHERE u.username = ? AND u.status = ? AND u.role IN ("admin", "clinica")',
        [usuario, 'ativo']
      );

      if (usuarios.length === 0) {
        const clinicas = await query(
          'SELECT * FROM clinicas WHERE usuario = ? AND status = ?',
          [usuario, 'ativo']
        );

        if (clinicas.length === 0) {
          const response: ApiResponse = {
            success: false,
            message: 'Usuário ou senha inválidos'
          };
          res.status(401).json(response);
          return;
        }

        // Usar dados da clínica diretamente
        const clinica = clinicas[0];
        const clinicaResponse = {
          id: clinica.id,
          nome: clinica.nome,
          codigo: clinica.codigo,
          status: clinica.status
        };

        // Verificar senha da clínica
        if (!clinica.senha || !(await bcrypt.compare(senha, clinica.senha))) {
          const response: ApiResponse = {
            success: false,
            message: 'Usuário ou senha inválidos'
          };
          res.status(401).json(response);
          return;
        }

        // Gerar token para clínica
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

        const response: ApiResponse = {
          success: true,
          message: 'Login realizado com sucesso',
          data: {
            clinic: clinicaResponse,
            token
          }
        };

        res.json(response);
        return;
      }

      const usuarioClinica = usuarios[0];

      // Verificar senha
      if (!usuarioClinica.password_hash || !(await bcrypt.compare(senha, usuarioClinica.password_hash))) {
        const response: ApiResponse = {
          success: false,
          message: 'Usuário ou senha inválidos'
        };
        res.status(401).json(response);
        return;
      }

      // Verificar se clínica está ativa
      if (usuarioClinica.clinica_status !== 'ativo') {
        const response: ApiResponse = {
          success: false,
          message: 'Clínica inativa. Entre em contato com o suporte.'
        };
        res.status(403).json(response);
        return;
      }

      // Atualizar último login
      await query(
        'UPDATE usuarios SET last_login = NOW() WHERE id = ?',
        [usuarioClinica.id]
      );

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: usuarioClinica.id, 
          clinicaId: usuarioClinica.clinica_id,
          tipo: 'clinica',
          role: 'clinica'
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '7d' }
      );

      // Preparar resposta
      const clinicaResponse = {
        id: usuarioClinica.clinica_id,
        nome: usuarioClinica.clinica_nome,
        codigo: usuarioClinica.clinica_codigo,
        status: usuarioClinica.clinica_status
      };

      const response: ApiResponse = {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          clinic: clinicaResponse,
          token,
          user: {
            id: usuarioClinica.id,
            nome: usuarioClinica.nome,
            email: usuarioClinica.email,
            username: usuarioClinica.username,
            role: usuarioClinica.role
          }
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

      // Validações básicas
      if (!responsavelData.nome || !responsavelData.registro_conselho || !responsavelData.especialidade_principal) {
        const response: ApiResponse = {
          success: false,
          message: 'Nome, Registro do Conselho e especialidade principal são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }

      // Verificar se Registro do Conselho já existe na clínica
      const registroExists = await ResponsavelTecnicoModel.checkRegistroExists(clinicaId, responsavelData.registro_conselho);
      if (registroExists) {
        const response: ApiResponse = {
          success: false,
          message: 'Registro do Conselho já está cadastrado nesta clínica'
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

      // Verificar se registro já existe na clínica (se estiver sendo atualizado)
      if (responsavelData.registro_conselho) {
        const registroExists = await ResponsavelTecnicoModel.checkRegistroExists(
          clinicaId, 
          responsavelData.registro_conselho, 
          id
        );
        if (registroExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Registro já está cadastrado nesta clínica'
          };
          res.status(400).json(response);
          return;
        }
      }

      const responsavelAtualizado = await ResponsavelTecnicoModel.update(id, responsavelData);

      if (!responsavelAtualizado) {
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao atualizar responsável técnico'
        };
        res.status(500).json(response);
        return;
      }

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
      console.error('❌ Erro ao remover responsável técnico:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao remover responsável técnico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // =====================================================
  // MÉTODOS ADMINISTRATIVOS (CRUD COMPLETO)
  // =====================================================

  // GET /api/clinicas/por-operadora - Listar clínicas por operadora
  static async getClinicasPorOperadora(req: AuthRequest, res: Response): Promise<void> {
    try {
      const operadoraId = req.user?.operadoraId || req.query.operadora_id;

      if (!operadoraId) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da operadora é obrigatório'
        };
        res.status(400).json(response);
        return;
      }

      // Buscar clínicas reais do banco filtradas por operadora_id
      const clinicas = await ClinicaModel.findByOperadoraId(Number(operadoraId));

      const response: ApiResponse = {
        success: true,
        message: 'Clínicas encontradas',
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

  // GET /api/clinicas/admin - Listar todas as clínicas (admin) com paginação e busca
  static async getAllClinicas(req: Request, res: Response): Promise<void> {
    try {
      // Parâmetros de paginação e busca
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50; // Limite padrão de 50
      const search = req.query.search as string || '';
      const offset = (page - 1) * limit;

      // Construir query com busca
      let whereClause = '';
      let countWhereClause = '';
      if (search) {
        const searchTerm = `%${search}%`;
        whereClause = `WHERE nome LIKE '${searchTerm}' OR razao_social LIKE '${searchTerm}' OR codigo LIKE '${searchTerm}' OR cnpj LIKE '${searchTerm}'`;
        countWhereClause = `WHERE nome LIKE '${searchTerm}' OR razao_social LIKE '${searchTerm}' OR codigo LIKE '${searchTerm}' OR cnpj LIKE '${searchTerm}'`;
      }

      const clinicas = await query(
        `SELECT * FROM clinicas ${whereClause} ORDER BY nome ASC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
      );

      // Processar dados para garantir estrutura esperada pelo frontend
      const clinicasProcessadas = clinicas.map((clinica: any) => {
        // Processar endereco_completo (JSON)
        let enderecoData = {};
        if (clinica.endereco_completo) {
          try {
            const enderecoObj = typeof clinica.endereco_completo === 'string'
              ? JSON.parse(clinica.endereco_completo)
              : clinica.endereco_completo;
            
            enderecoData = {
              endereco_rua: enderecoObj.rua || '',
              endereco_numero: enderecoObj.numero || '',
              endereco_bairro: enderecoObj.bairro || '',
              endereco_complemento: enderecoObj.complemento || '',
              cidade: enderecoObj.cidade || '',
              estado: enderecoObj.estado || '',
              cep: enderecoObj.cep || ''
            };
          } catch (error) {
            console.warn('Erro ao processar endereco_completo JSON:', error);
          }
        }

        // Processar contatos (JSON)
        let contatosData = {};
        if (clinica.contatos) {
          try {
            const contatosObj = typeof clinica.contatos === 'string'
              ? JSON.parse(clinica.contatos)
              : clinica.contatos;
            
            // Garantir que telefones e emails não sejam arrays vazios
            const telefones = contatosObj.pacientes?.telefones || [];
            const emails = contatosObj.pacientes?.emails || [];
            
            contatosData = {
              telefones: telefones.length > 0 ? telefones : [''],
              emails: emails.length > 0 ? emails : [''],
              contatos_pacientes: contatosObj.pacientes || { telefones: [''], emails: [''] },
              contatos_administrativos: contatosObj.administrativos || { telefones: [''], emails: [''] },
              contatos_legais: contatosObj.legais || { telefones: [''], emails: [''] },
              contatos_faturamento: contatosObj.faturamento || { telefones: [''], emails: [''] },
              contatos_financeiro: contatosObj.financeiro || { telefones: [''], emails: [''] }
            };
          } catch (error) {
            console.warn('Erro ao processar contatos JSON:', error);
            contatosData = {
              telefones: [''],
              emails: [''],
              contatos_pacientes: { telefones: [''], emails: [''] },
              contatos_administrativos: { telefones: [''], emails: [''] },
              contatos_legais: { telefones: [''], emails: [''] },
              contatos_faturamento: { telefones: [''], emails: [''] },
              contatos_financeiro: { telefones: [''], emails: [''] }
            };
          }
        } else {
          // Fallback para estrutura antiga
          contatosData = {
            telefones: Array.isArray(clinica.telefones) ? clinica.telefones : (clinica.telefone ? [clinica.telefone] : ['']),
            emails: Array.isArray(clinica.emails) ? clinica.emails : (clinica.email ? [clinica.email] : ['']),
            contatos_pacientes: { telefones: [''], emails: [''] },
            contatos_administrativos: { telefones: [''], emails: [''] },
            contatos_legais: { telefones: [''], emails: [''] },
            contatos_faturamento: { telefones: [''], emails: [''] },
            contatos_financeiro: { telefones: [''], emails: [''] }
          };
        }

        return {
          id: clinica.id,
          nome: clinica.nome,
          razao_social: clinica.razao_social || '',
          codigo: clinica.codigo,
          cnpj: clinica.cnpj || '',
          endereco: clinica.endereco || '',
          ...enderecoData,
          ...contatosData,
          website: clinica.website || '',
          logo_url: clinica.logo_url || '',
          observacoes: clinica.observacoes || '',
          usuario: clinica.usuario || '',
          senha: clinica.senha || '',
          operadora_id: clinica.operadora_id || null,
          status: clinica.status || 'ativo',
          created_at: clinica.created_at,
          updated_at: clinica.updated_at
        };
      });

      const clinicaIds = clinicasProcessadas
        .map((clinica: any) => Number(clinica.id))
        .filter((id: number) => Number.isInteger(id) && id > 0);

      let operadorasMap: Record<number, any[]> = {};
      if (clinicaIds.length > 0) {
        operadorasMap = await ClinicaOperadoraModel.getOperadorasByClinicaIds(clinicaIds);
      }

      const clinicasComOperadoras = clinicasProcessadas.map((clinica: any) => {
        const clinicaId = Number(clinica.id);
        const operadoras = operadorasMap[clinicaId] || [];
        const operadoraIds = operadoras
          .map((op) => op.id)
          .filter((id): id is number => typeof id === 'number');

        return {
          ...clinica,
          operadoras,
          operadora_ids: operadoraIds,
          operadora_id: operadoraIds.length > 0 ? operadoraIds[0] : clinica.operadora_id
        };
      });

      // Buscar total de clínicas para paginação (considerando busca)
      const totalResult = await query(`SELECT COUNT(*) as total FROM clinicas ${countWhereClause}`);
      const total = totalResult[0]?.total || 0;

      const response = {
        success: true,
        message: 'Clínicas encontradas',
        data: clinicasComOperadoras,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar todas as clínicas:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar clínicas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/clinicas/admin/:id - Buscar clínica por ID (admin)
  static async getClinicaById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da clínica é obrigatório'
        };
        res.status(400).json(response);
        return;
      }

      console.log(`🔍 getClinicaById: Buscando clínica ID=${id}`);
      
      // Usar ClinicaModel que já faz o enriquecimento com operadoras
      const clinicaProfile = await ClinicaModel.findById(parseInt(id));
      
      if (!clinicaProfile || !clinicaProfile.clinica) {
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não encontrada'
        };
        res.status(404).json(response);
        return;
      }

      const clinica = clinicaProfile.clinica as any;
      console.log(`✅ getClinicaById: Clínica encontrada, operadora_ids=[${clinica.operadora_ids?.join(', ') || 'vazio'}]`);

      // Processar dados da mesma forma que getAllClinicas
      let enderecoData = {};
      if (clinica.endereco_completo) {
        try {
          const enderecoObj = typeof clinica.endereco_completo === 'string'
            ? JSON.parse(clinica.endereco_completo)
            : clinica.endereco_completo;
          
          enderecoData = {
            endereco_rua: enderecoObj.rua || '',
            endereco_numero: enderecoObj.numero || '',
            endereco_bairro: enderecoObj.bairro || '',
            endereco_complemento: enderecoObj.complemento || '',
            cidade: enderecoObj.cidade || '',
            estado: enderecoObj.estado || '',
            cep: enderecoObj.cep || ''
          };
        } catch (error) {
          console.warn('Erro ao processar endereco_completo JSON:', error);
        }
      }

      let contatosData = {};
      if (clinica.contatos) {
        try {
          const contatosObj = typeof clinica.contatos === 'string'
            ? JSON.parse(clinica.contatos)
            : clinica.contatos;

          // Garantir que telefones e emails não sejam arrays vazios
          const telefones = contatosObj.pacientes?.telefones || [];
          const emails = contatosObj.pacientes?.emails || [];

          contatosData = {
            telefones: telefones.length > 0 ? telefones : [''],
            emails: emails.length > 0 ? emails : [''],
            contatos_pacientes: contatosObj.pacientes || { telefones: [''], emails: [''] },
            contatos_administrativos: contatosObj.administrativos || { telefones: [''], emails: [''] },
            contatos_legais: contatosObj.legais || { telefones: [''], emails: [''] },
            contatos_faturamento: contatosObj.faturamento || { telefones: [''], emails: [''] },
            contatos_financeiro: contatosObj.financeiro || { telefones: [''], emails: [''] }
          };
        } catch (error) {
          console.warn('Erro ao processar contatos JSON:', error);
          contatosData = {
            telefones: [''],
            emails: [''],
            contatos_pacientes: { telefones: [''], emails: [''] },
            contatos_administrativos: { telefones: [''], emails: [''] },
            contatos_legais: { telefones: [''], emails: [''] },
            contatos_faturamento: { telefones: [''], emails: [''] },
            contatos_financeiro: { telefones: [''], emails: [''] }
          };
        }
      } else {
        contatosData = {
          telefones: Array.isArray(clinica.telefones) ? clinica.telefones : (clinica.telefone ? [clinica.telefone] : ['']),
          emails: Array.isArray(clinica.emails) ? clinica.emails : (clinica.email ? [clinica.email] : ['']),
          contatos_pacientes: { telefones: [''], emails: [''] },
          contatos_administrativos: { telefones: [''], emails: [''] },
          contatos_legais: { telefones: [''], emails: [''] },
          contatos_faturamento: { telefones: [''], emails: [''] },
          contatos_financeiro: { telefones: [''], emails: [''] }
        };
      }

      const clinicaProcessada = {
        id: clinica.id,
        nome: clinica.nome,
        razao_social: clinica.razao_social || '',
        codigo: clinica.codigo,
        cnpj: clinica.cnpj || '',
        endereco: clinica.endereco || '',
        ...enderecoData,
        ...contatosData,
        website: clinica.website || '',
        logo_url: clinica.logo_url || '',
        observacoes: clinica.observacoes || '',
        usuario: clinica.usuario || '',
        senha: clinica.senha || '',
        operadora_id: clinica.operadora_id,
        operadora_ids: Array.isArray(clinica.operadora_ids) ? clinica.operadora_ids : [],
        operadoras: Array.isArray(clinica.operadoras) ? clinica.operadoras : [],
        status: clinica.status || 'ativo',
        created_at: clinica.created_at,
        updated_at: clinica.updated_at
      };
      
      console.log(`📤 getClinicaById: Retornando clínica com operadora_ids=[${clinicaProcessada.operadora_ids.join(', ')}]`);

      const response: ApiResponse = {
        success: true,
        message: 'Clínica encontrada',
        data: clinicaProcessada
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar clínica por ID:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // POST /api/clinicas/admin - Criar nova clínica (admin)
  static async createClinica(req: Request, res: Response): Promise<void> {
    try {
      const clinicaData: ClinicaCreateInput = req.body;

      if (clinicaData.operadora_ids !== undefined && !Array.isArray(clinicaData.operadora_ids)) {
        clinicaData.operadora_ids = [Number(clinicaData.operadora_ids)].filter(id => Number.isInteger(id));
      }

      if (Array.isArray(clinicaData.operadora_ids)) {
        clinicaData.operadora_ids = clinicaData.operadora_ids
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0);
      }

      if ((!clinicaData.operadora_ids || clinicaData.operadora_ids.length === 0) && clinicaData.operadora_id) {
        clinicaData.operadora_ids = [clinicaData.operadora_id];
      }

      const primaryOperadoraId = clinicaData.operadora_ids && clinicaData.operadora_ids.length > 0
        ? clinicaData.operadora_ids[0]
        : clinicaData.operadora_id;
      clinicaData.operadora_id = primaryOperadoraId;

      // Validações básicas
      if (!clinicaData.nome || !clinicaData.codigo) {
        const response: ApiResponse = {
          success: false,
          message: 'Nome e código são obrigatórios'
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

      // Criar clínica usando o modelo
      const novaClinica = await ClinicaModel.create(clinicaData);

      // Criar usuário na tabela usuarios para login
      if (clinicaData.usuario && clinicaData.senha) {
        try {
          const insertUserQuery = `
            INSERT INTO usuarios (username, password_hash, role, clinica_id, operadora_id, status, nome, created_at, updated_at)
            VALUES (?, ?, 'clinica', ?, ?, 'ativo', ?, NOW(), NOW())
          `;

          await query(insertUserQuery, [
            clinicaData.usuario, 
            clinicaData.senha, 
            novaClinica.id,
            novaClinica.operadora_id || null,
            clinicaData.nome // Adicionar o nome da clínica como nome do usuário
          ]);
        } catch (userError) {
          console.error('⚠️ Erro ao criar usuário na tabela usuarios:', userError);
          // Não falhar o registro da clínica por causa do usuário
        }
      }

      // Remover senha da resposta
      const { senha, ...clinicaResponse } = novaClinica;

      const response: ApiResponse = {
        success: true,
        message: 'Clínica criada com sucesso',
        data: clinicaResponse
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

  // PUT /api/clinicas/admin/:id - Atualizar clínica (admin)
  static async updateClinica(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: ClinicaUpdateInput = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da clínica é obrigatório'
        };
        res.status(400).json(response);
        return;
      }

      // Só criptografar senha se ela não for um hash bcrypt (não começa com $2a$ ou $2b$)
      if (updateData.senha && !updateData.senha.startsWith('$2a$') && !updateData.senha.startsWith('$2b$')) {
        updateData.senha = await bcrypt.hash(updateData.senha, 10);
      } else if (updateData.senha && (updateData.senha.startsWith('$2a$') || updateData.senha.startsWith('$2b$'))) {
        // Se já é hash, remove do updateData para não sobrescrever
        delete updateData.senha;
      }

      if (updateData.operadora_ids !== undefined && !Array.isArray(updateData.operadora_ids)) {
        updateData.operadora_ids = [Number(updateData.operadora_ids)].filter(idValue => Number.isInteger(idValue));
      }

      if (Array.isArray(updateData.operadora_ids)) {
        updateData.operadora_ids = updateData.operadora_ids
          .map((idValue) => Number(idValue))
          .filter((idValue) => Number.isInteger(idValue) && idValue > 0);
      }

      if ((!updateData.operadora_ids || updateData.operadora_ids.length === 0) && updateData.operadora_id !== undefined && updateData.operadora_id !== null) {
        updateData.operadora_ids = [updateData.operadora_id];
      }

      const updatedClinica = await ClinicaModel.update(Number(id), updateData);

      if (!updatedClinica) {
        const response: ApiResponse = {
          success: false,
          message: 'Clínica não encontrada'
        };
        res.status(404).json(response);
        return;
      }

      const primaryOperadoraId = updatedClinica.operadora_id ?? null;
      await query('UPDATE usuarios SET operadora_id = ? WHERE clinica_id = ?', [primaryOperadoraId, Number(id)]);

      const { senha, ...clinicaResponse } = updatedClinica as any;

      const response: ApiResponse = {
        success: true,
        message: 'Clínica atualizada com sucesso',
        data: clinicaResponse
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

  // DELETE /api/clinicas/admin/:id - Deletar clínica (admin)
  static async deleteClinica(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'ID da clínica é obrigatório'
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Clínica deletada com sucesso',
        data: { id: parseInt(id) }
      };

      res.json(response);
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
}