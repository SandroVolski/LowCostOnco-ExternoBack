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
      console.log('🔧 Buscando todas as operadoras...');
      
      const operadoras = await OperadoraModel.findAll();
      
      console.log(`✅ ${operadoras.length} operadoras encontradas`);
      
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
        console.log('❌ ID inválido:', req.params.id);
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      console.log('🔧 Buscando operadora ID:', id);
      
      const operadora = await OperadoraModel.findById(id);
      
      if (!operadora) {
        console.log('❌ Operadora não encontrada para ID:', id);
        const response: ApiResponse = {
          success: false,
          message: 'Operadora não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      console.log('✅ Operadora encontrada:', operadora.nome);
      
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
      
      console.log('🔧 Criando nova operadora...');
      console.log('📋 Dados recebidos:', JSON.stringify(operadoraData, null, 2));
      
      // Validações básicas
      if (!operadoraData.nome || !operadoraData.codigo) {
        console.log('❌ Nome e código são obrigatórios');
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
        console.log('❌ Código já existe:', operadoraData.codigo);
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
        console.log('🔧 Email gerado automaticamente:', email);
      }
      
      if (!username) {
        // Gerar username baseado no código
        username = operadoraData.codigo.toLowerCase().replace(/[^a-z0-9]/g, '');
        console.log('🔧 Username gerado automaticamente:', username);
      }
      
      if (!senhaOriginal) {
        // Gerar senha padrão: codigo@2025
        senhaOriginal = `${operadoraData.codigo}@2025`;
        console.log('🔧 Senha gerada automaticamente (formato: codigo@2025)');
      }
      
      // Hash da senha
      senhaHash = await bcrypt.hash(senhaOriginal, 10);
      
      const novaOperadora = await OperadoraModel.create(operadoraData);
      
      console.log('✅ Operadora criada com sucesso:', novaOperadora.nome);
      
      // SEMPRE criar usuário na tabela usuarios para login
      try {
        console.log('🔧 Criando usuário na tabela usuarios...');
        console.log('   - Email:', email);
        console.log('   - Username:', username);
        console.log('   - Operadora ID:', novaOperadora.id);
        
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
        
        console.log('✅ Usuário criado na tabela usuarios com ID:', result.insertId);
        console.log('📋 Credenciais de acesso:');
        console.log('   - Email:', email);
        console.log('   - Username:', username);
        console.log('   - Senha:', senhaOriginal);
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
      
      console.log('🔧 Iniciando atualização de operadora...');
      console.log('📋 ID recebido:', req.params.id);
      console.log('📋 Dados recebidos:', JSON.stringify(updateData, null, 2));
      
      if (isNaN(id)) {
        console.log('❌ ID inválido:', req.params.id);
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      // Validar dados básicos
      if (!updateData || Object.keys(updateData).length === 0) {
        console.log('❌ Nenhum dado para atualizar');
        const response: ApiResponse = {
          success: false,
          message: 'Nenhum dado fornecido para atualização'
        };
        res.status(400).json(response);
        return;
      }
      
      console.log('🔧 Atualizando operadora ID:', id);
      
      // Verificar se operadora existe
      console.log('🔍 Verificando se operadora existe...');
      const operadoraExistente = await OperadoraModel.findById(id);
      if (!operadoraExistente) {
        console.log('❌ Operadora não encontrada para ID:', id);
        const response: ApiResponse = {
          success: false,
          message: 'Operadora não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      console.log('✅ Operadora encontrada:', operadoraExistente.nome);
      
      // Verificar se código já existe (se estiver sendo alterado)
      if (updateData.codigo && updateData.codigo !== operadoraExistente.codigo) {
        console.log('🔍 Verificando se código já existe...');
        const codigoExists = await OperadoraModel.checkCodeExists(updateData.codigo, id);
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
      
      console.log('🔄 Executando atualização...');
      const operadoraAtualizada = await OperadoraModel.update(id, updateData);
      
      if (!operadoraAtualizada) {
        console.log('❌ Falha na atualização da operadora - retorno null');
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao atualizar operadora no banco de dados'
        };
        res.status(500).json(response);
        return;
      }
      
      console.log('✅ Operadora atualizada com sucesso:', operadoraAtualizada.nome);
      
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
        console.log('❌ ID inválido:', req.params.id);
        const response: ApiResponse = {
          success: false,
          message: 'ID inválido'
        };
        res.status(400).json(response);
        return;
      }
      
      console.log('🔧 Deletando operadora ID:', id);
      
      // Verificar se operadora existe
      const operadoraExistente = await OperadoraModel.findById(id);
      if (!operadoraExistente) {
        console.log('❌ Operadora não encontrada para ID:', id);
        const response: ApiResponse = {
          success: false,
          message: 'Operadora não encontrada'
        };
        res.status(404).json(response);
        return;
      }
      
      const deleted = await OperadoraModel.delete(id);
      
      if (deleted) {
        console.log('✅ Operadora deletada com sucesso:', operadoraExistente.nome);
        const response: ApiResponse = {
          success: true,
          message: 'Operadora deletada com sucesso'
        };
        res.json(response);
      } else {
        console.log('❌ Falha na deleção da operadora');
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
}
