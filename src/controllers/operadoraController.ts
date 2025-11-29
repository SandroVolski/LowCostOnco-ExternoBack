// src/controllers/operadoraController.ts

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { OperadoraModel } from '../models/Operadora';
import { 
  OperadoraCreateInput, 
  OperadoraUpdateInput
} from '../types/operadora';
import { ApiResponse } from '../types';

export class OperadoraController {
  
  // 🆕 MÉTODOS ADMINISTRATIVOS PARA CRUD COMPLETO

  // GET /api/operadoras/admin - Listar todas as operadoras (para administradores)
  static async getAllOperadoras(req: Request, res: Response): Promise<void> {
    try {
      const operadoras = await OperadoraModel.findAll();

      const response: ApiResponse = {
        success: true,
        message: 'Operadoras listadas com sucesso',
        data: operadoras
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao listar operadoras:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao listar operadoras',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/operadoras/admin/:id - Buscar operadora por ID (para administradores)
  static async getOperadoraById(req: Request, res: Response): Promise<void> {
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

      const operadora = await OperadoraModel.findById(id);

      if (!operadora) {
        const response: ApiResponse = {
          success: false,
          message: 'Operadora não encontrada'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Operadora encontrada com sucesso',
        data: operadora
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao buscar operadora:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar operadora',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // POST /api/operadoras/admin - Criar nova operadora (para administradores)
  static async createOperadora(req: Request, res: Response): Promise<void> {
    try {
      const operadoraData: OperadoraCreateInput = req.body;

      // Validações básicas
      if (!operadoraData.nome || !operadoraData.codigo) {
        const response: ApiResponse = {
          success: false,
          message: 'Nome e código são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }

      // Verificar se código já existe
      const codigoExists = await OperadoraModel.checkCodeExists(operadoraData.codigo);
      if (codigoExists) {
        const response: ApiResponse = {
          success: false,
          message: 'Código já está em uso'
        };
        res.status(400).json(response);
        return;
      }

      // Gerar credenciais automaticamente se não fornecidas
      let email = operadoraData.email;
      let username = operadoraData.username;
      let senhaOriginal = operadoraData.senha;
      let senhaHash = operadoraData.senha;

      if (!email) {
        // Gerar email baseado no código (ex: "UNI001" -> "uni001@operadora.com")
        email = `${operadoraData.codigo.toLowerCase().replace(/[^a-z0-9]/g, '')}@operadora.com`;
      }

      if (!username) {
        // Gerar username baseado no código
        username = operadoraData.codigo.toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      if (!senhaOriginal) {
        // Gerar senha padrão: codigo@2025
        senhaOriginal = `${operadoraData.codigo}@2025`;
      }

      // Hash da senha
      senhaHash = await bcrypt.hash(senhaOriginal, 10);

      const novaOperadora = await OperadoraModel.create(operadoraData);

      // SEMPRE criar usuário na tabela usuarios para login
      try {
        const insertUserQuery = `
          INSERT INTO usuarios (
            nome,
            email,
            username, 
            password_hash, 
            role, 
            operadora_id,
            status, 
            created_at, 
            updated_at
          )
          VALUES (?, ?, ?, ?, 'operadora_admin', ?, 'ativo', NOW(), NOW())
        `;

        const result = await query(insertUserQuery, [
          novaOperadora.nome,
          email,
          username,
          senhaHash, 
          novaOperadora.id
        ]);
      } catch (userError) {
        console.error('❌ ERRO CRÍTICO ao criar usuário na tabela usuarios:', userError);
        console.error('❌ Detalhes do erro:', {
          name: (userError as Error).name,
          message: (userError as Error).message,
          stack: (userError as Error).stack
        });
        
        // Retornar erro porque sem usuário a operadora não pode fazer login
        const response: ApiResponse = {
          success: false,
          message: 'Operadora criada mas falhou ao criar usuário de login. Entre em contato com o suporte.',
          error: (userError as Error).message
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Operadora criada com sucesso',
        data: {
          ...novaOperadora,
          // Incluir credenciais na resposta para que o admin possa informar à operadora
          credenciais: {
            email,
            username,
            senha: senhaOriginal
          }
        }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Erro ao criar operadora:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao criar operadora',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // PUT /api/operadoras/admin/:id - Atualizar operadora (para administradores)
  static async updateOperadora(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const updateData: OperadoraUpdateInput = req.body;

      if (isNaN(id)) {
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }

      // Validar dados básicos
      if (!updateData || Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Nenhum dado fornecido para atualização'
        };
        res.status(400).json(response);
        return;
      }

      const operadoraExistente = await OperadoraModel.findById(id);
      if (!operadoraExistente) {
        const response: ApiResponse = {
          success: false,
          message: 'Operadora não encontrada'
        };
        res.status(404).json(response);
        return;
      }

      // Verificar se código já existe (se estiver sendo alterado)
      if (updateData.codigo && updateData.codigo !== operadoraExistente.codigo) {
        const codigoExists = await OperadoraModel.checkCodeExists(updateData.codigo, id);
        if (codigoExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Código já está em uso'
          };
          res.status(400).json(response);
          return;
        }
      }

      const operadoraAtualizada = await OperadoraModel.update(id, updateData);

      if (!operadoraAtualizada) {
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao atualizar operadora no banco de dados'
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Operadora atualizada com sucesso',
        data: operadoraAtualizada
      };

      res.json(response);
    } catch (error) {
      console.error('❌ ERRO DETALHADO ao atualizar operadora:');
      if (error instanceof Error) {
        console.error('   Tipo:', error.constructor.name);
        console.error('   Mensagem:', error.message);
        console.error('   Stack:', error.stack);
      } else {
        console.error('   Erro desconhecido:', error);
      }
      
      const response: ApiResponse = {
        success: false,
        message: 'Erro interno ao atualizar operadora',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // DELETE /api/operadoras/admin/:id - Deletar operadora (para administradores)
  static async deleteOperadora(req: Request, res: Response): Promise<void> {
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

      // Verificar se operadora existe
      const operadoraExistente = await OperadoraModel.findById(id);
      if (!operadoraExistente) {
        const response: ApiResponse = {
          success: false,
          message: 'Operadora não encontrada'
        };
        res.status(404).json(response);
        return;
      }

      const deleted = await OperadoraModel.delete(id);

      if (deleted) {
        const response: ApiResponse = {
          success: true,
          message: 'Operadora deletada com sucesso'
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao deletar operadora'
        };
        res.status(500).json(response);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar operadora:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao deletar operadora',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/operadoras - Listar operadoras para clínicas
  static async getOperadorasForClinica(req: Request, res: Response): Promise<void> {
    try {
      const operadoras = await OperadoraModel.findAll();

      const response: ApiResponse = {
        success: true,
        message: 'Operadoras listadas com sucesso',
        data: operadoras
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Erro ao listar operadoras para clínica:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao listar operadoras',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/operadoras/clinica/:clinicaId - Buscar operadoras de uma clínica (N:N)
  static async getOperadoraByClinica(req: Request, res: Response): Promise<void> {
    try {
      const clinicaId = parseInt(req.params.clinicaId);

      console.log(`🔍 [OperadoraController.getOperadoraByClinica] Buscando operadoras para clinica_id=${clinicaId}`);

      if (isNaN(clinicaId)) {
        res.status(400).json({
          success: false,
          message: 'ID da clínica inválido'
        });
        return;
      }

      // Buscar as operadoras da clínica usando a tabela de relacionamento N:N
      const sql = `
        SELECT o.* 
        FROM operadoras o
        INNER JOIN clinicas_operadoras co ON co.operadora_id = o.id
        WHERE co.clinica_id = ? AND co.status = 'ativo' AND o.status = 'ativo'
        ORDER BY o.nome ASC
      `;

      const operadoras = await query(sql, [clinicaId]);

      console.log(`✅ [OperadoraController.getOperadoraByClinica] Encontradas ${operadoras.length} operadoras para clinica_id=${clinicaId}`);

      // Retornar todas as operadoras (agora uma clínica pode ter múltiplas)
      // Para compatibilidade, retornamos a primeira se existir, ou todas
      const response: ApiResponse = {
        success: true,
        message: operadoras.length > 0 ? 'Operadoras encontradas' : 'Nenhuma operadora encontrada para esta clínica',
        data: operadoras.length > 0 ? (operadoras.length === 1 ? operadoras[0] : operadoras) : null
      };

      if (operadoras.length === 0) {
        res.status(404).json(response);
        return;
      }

      res.json(response);
    } catch (error) {
      console.error('❌ [OperadoraController.getOperadoraByClinica] Erro ao buscar operadoras da clínica:', error);
      if (error instanceof Error) {
        console.error('   Tipo:', error.constructor.name);
        console.error('   Mensagem:', error.message);
        console.error('   Stack:', error.stack);
      }
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar operadoras da clínica',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}
