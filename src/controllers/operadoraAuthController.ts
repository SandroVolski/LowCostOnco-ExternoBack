// src/controllers/operadoraAuthController.ts

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { OperadoraModel } from '../models/Operadora';

export class OperadoraAuthController {
  // GET /api/operadora-auth/operadoras - Listar operadoras ativas
  static async listarOperadoras(req: Request, res: Response): Promise<void> {
    try {
      const operadoras = await query(
        'SELECT id, nome, codigo FROM operadoras WHERE status = ? ORDER BY nome',
        ['ativo']
      );

      res.json({
        success: true,
        data: operadoras
      });
    } catch (error: any) {
      console.error('❌ Erro ao listar operadoras:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // POST /api/operadora-auth/login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body || {};

      if ((!email && !username) || !password) {
        res.status(400).json({ success: false, message: 'Credenciais inválidas' });
        return;
      }

      // Buscar usuário na tabela usuarios consolidada
      let userQuery = `
        SELECT u.*, o.nome as operadora_nome, o.codigo as operadora_codigo, o.status as operadora_status 
        FROM usuarios u 
        JOIN operadoras o ON u.operadora_id = o.id 
        WHERE u.status = 'ativo' 
        AND u.role IN ('operadora_admin', 'operadora_user')
      `;

      let params: any[] = [];

      if (email) {
        userQuery += ' AND u.email = ?';
        params.push(email);
      } else {
        userQuery += ' AND u.username = ?';
        params.push(username);
      }

      const users = await query(userQuery, params);

      if (users.length === 0) {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
        return;
      }

      const user = users[0];

      // Verificar senha
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
        return;
      }

      // Verificar se operadora está ativa
      if (user.operadora_status !== 'ativo') {
        res.status(401).json({ success: false, message: 'Operadora inativa ou não encontrada' });
        return;
      }

      // Atualizar último login
      await query(
        'UPDATE usuarios SET last_login = NOW() WHERE id = ?',
        [user.id]
      );

      // Gerar access token (15 minutos) e refresh token (30 dias)
      const accessPayload = { 
        id: user.id, 
        role: user.role, 
        operadoraId: user.operadora_id,
        tipo: 'operadora'
      };
      const refreshPayload = { 
        id: user.id, 
        type: 'refresh',
        tipo: 'operadora'
      };

      const accessToken = jwt.sign(accessPayload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '15m' });
      const refreshToken = jwt.sign(refreshPayload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });

      res.json({ 
        success: true, 
        accessToken, 
        refreshToken,
        user: { 
          id: user.id, 
          nome: user.nome, 
          email: user.email, 
          username: user.username,
          role: user.role, 
          operadora_id: user.operadora_id,
          operadora: {
            id: user.operadora_id,
            nome: user.operadora_nome,
            codigo: user.operadora_codigo
          }
        } 
      });
    } catch (error) {
      console.error('❌ Erro no login da operadora:', error);
      res.status(500).json({ success: false, message: 'Erro ao autenticar' });
    }
  }

  // POST /api/operadora-auth/refresh
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token requerido' });
        return;
      }

      // Verificar refresh token
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const decoded = jwt.verify(refreshToken, secret) as any;
      
      if (decoded.type !== 'refresh' || decoded.tipo !== 'operadora') {
        res.status(403).json({ success: false, message: 'Token inválido' });
        return;
      }

      // Buscar usuário na tabela usuarios consolidada
      const users = await query(`
        SELECT u.*, o.nome as operadora_nome, o.codigo as operadora_codigo, o.status as operadora_status 
        FROM usuarios u 
        JOIN operadoras o ON u.operadora_id = o.id 
        WHERE u.id = ? AND u.status = 'ativo' 
        AND u.role IN ('operadora_admin', 'operadora_user')
      `, [decoded.id]);
      
      if (users.length === 0) {
        res.status(401).json({ success: false, message: 'Usuário não encontrado ou inativo' });
        return;
      }

      const user = users[0];

      // Verificar se operadora ainda está ativa
      if (user.operadora_status !== 'ativo') {
        res.status(401).json({ success: false, message: 'Operadora inativa' });
        return;
      }

      // Gerar novo access token
      const accessPayload = { 
        id: user.id, 
        role: user.role, 
        operadoraId: user.operadora_id,
        tipo: 'operadora'
      };
      
      const newAccessToken = jwt.sign(accessPayload, secret, { expiresIn: '15m' });
      
      res.json({ 
        success: true, 
        accessToken: newAccessToken
      });
    } catch (error) {
      console.error('Erro no refresh da operadora:', error);
      res.status(401).json({ success: false, message: 'Refresh token inválido' });
    }
  }

  // POST /api/operadora-auth/logout
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token requerido' });
        return;
      }

      // Aqui você pode implementar a revogação do refresh token
      res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Erro no logout da operadora:', error);
      res.status(500).json({ success: false, message: 'Erro ao fazer logout' });
    }
  }

  // GET /api/operadora-auth/me
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        res.status(401).json({ success: false, message: 'Token requerido' });
        return;
      }

      const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      
      if (payload.tipo !== 'operadora') {
        res.status(403).json({ success: false, message: 'Token inválido para operadora' });
        return;
      }

      // Buscar usuário na tabela usuarios consolidada
      const users = await query(`
        SELECT u.*, o.nome as operadora_nome, o.codigo as operadora_codigo, o.status as operadora_status 
        FROM usuarios u 
        JOIN operadoras o ON u.operadora_id = o.id 
        WHERE u.id = ? AND u.status = 'ativo' 
        AND u.role IN ('operadora_admin', 'operadora_user')
      `, [payload.id]);
      
      if (users.length === 0) {
        res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        return;
      }

      const user = users[0];

      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          nome: user.nome, 
          email: user.email, 
          username: user.username,
          role: user.role, 
          operadora_id: user.operadora_id,
          operadora: {
            id: user.operadora_id,
            nome: user.operadora_nome,
            codigo: user.operadora_codigo
          }
        } 
      });
    } catch (error) {
      console.error('Erro ao buscar dados do usuário da operadora:', error);
      res.status(401).json({ success: false, message: 'Token inválido' });
    }
  }

  // POST /api/operadora-auth/register (apenas para admin do sistema)
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { nome, email, username, password, operadora_id, role } = req.body || {};
      
      if (!nome || !email || !password || !operadora_id) {
        res.status(400).json({ 
          success: false, 
          message: 'Campos obrigatórios: nome, email, password, operadora_id' 
        });
        return;
      }

      // Verificar se operadora existe e está ativa
      const operadoras = await query('SELECT * FROM operadoras WHERE id = ? AND status = ?', [operadora_id, 'ativo']);
      if (operadoras.length === 0) {
        res.status(400).json({ 
          success: false, 
          message: 'Operadora não encontrada ou inativa' 
        });
        return;
      }

      // Verificar se email já existe
      const existingEmails = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
      if (existingEmails.length > 0) {
        res.status(409).json({ success: false, message: 'E-mail já em uso' });
        return;
      }

      // Verificar se username já existe (se fornecido)
      if (username) {
        const existingUsers = await query('SELECT id FROM usuarios WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
          res.status(409).json({ success: false, message: 'Username já em uso' });
          return;
        }
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Inserir usuário na tabela usuarios consolidada
      const result = await query(`
        INSERT INTO usuarios (nome, email, username, password_hash, operadora_id, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ativo', NOW(), NOW())
      `, [nome, email, username || null, hashedPassword, operadora_id, role || 'operadora_user']);

      const userId = result.insertId;

      res.status(201).json({ 
        success: true, 
        user: { 
          id: userId, 
          nome, 
          email, 
          username,
          role: role || 'operadora_user', 
          operadora_id 
        } 
      });
    } catch (error) {
      console.error('Erro ao registrar usuário da operadora:', error);
      res.status(500).json({ success: false, message: 'Erro ao registrar usuário' });
    }
  }

  // GET /api/operadora-auth/users/:operadoraId (listar usuários da operadora)
  static async getUsersByOperadora(req: Request, res: Response): Promise<void> {
    try {
      const { operadoraId } = req.params;
      const operadoraIdNum = parseInt(operadoraId);
      
      if (isNaN(operadoraIdNum)) {
        res.status(400).json({ success: false, message: 'ID da operadora inválido' });
        return;
      }

      // Verificar se operadora existe
      const operadoras = await query('SELECT * FROM operadoras WHERE id = ?', [operadoraIdNum]);
      if (operadoras.length === 0) {
        res.status(404).json({ success: false, message: 'Operadora não encontrada' });
        return;
      }

      // Buscar usuários da operadora na tabela usuarios consolidada
      const users = await query(`
        SELECT id, nome, email, username, role, status, created_at, last_login
        FROM usuarios 
        WHERE operadora_id = ? AND role IN ('operadora_admin', 'operadora_user')
        ORDER BY nome ASC
      `, [operadoraIdNum]);
      
      res.json({ 
        success: true, 
        users: users.map((user: any) => ({
          id: user.id,
          nome: user.nome,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
          last_login: user.last_login
        }))
      });
    } catch (error) {
      console.error('Erro ao buscar usuários da operadora:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar usuários' });
    }
  }
}
