// src/controllers/operadoraAuthController.ts

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OperadoraUserModel } from '../models/OperadoraUser';
import { OperadoraModel } from '../models/Operadora';

export class OperadoraAuthController {
  // POST /api/operadora-auth/login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body || {};
      if ((!email && !username) || !password) {
        res.status(400).json({ success: false, message: 'Credenciais inválidas' });
        return;
      }

      const user = email
        ? await OperadoraUserModel.findByEmail(email)
        : await OperadoraUserModel.findByUsername(username);

      if (!user || user.status !== 'ativo') {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
        return;
      }

      const ok = await OperadoraUserModel.verifyPassword(user, password);
      if (!ok) {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
        return;
      }

      // Buscar dados da operadora
      const operadora = await OperadoraModel.findById(user.operadora_id);
      if (!operadora || operadora.status !== 'ativo') {
        res.status(401).json({ success: false, message: 'Operadora inativa ou não encontrada' });
        return;
      }

      await OperadoraUserModel.updateLastLogin(user.id);
      
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
            id: operadora.id,
            nome: operadora.nome,
            codigo: operadora.codigo
          }
        } 
      });
    } catch (error) {
      console.error('Erro no login da operadora:', error);
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

      // Buscar usuário
      const user = await OperadoraUserModel.findById(decoded.id);
      if (!user || user.status !== 'ativo') {
        res.status(401).json({ success: false, message: 'Usuário não encontrado ou inativo' });
        return;
      }

      // Verificar se operadora ainda está ativa
      const operadora = await OperadoraModel.findById(user.operadora_id);
      if (!operadora || operadora.status !== 'ativo') {
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

      const user = await OperadoraUserModel.findById(payload.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        return;
      }

      // Buscar dados da operadora
      const operadora = await OperadoraModel.findById(user.operadora_id);
      if (!operadora) {
        res.status(404).json({ success: false, message: 'Operadora não encontrada' });
        return;
      }

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
            id: operadora.id,
            nome: operadora.nome,
            codigo: operadora.codigo
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
      const operadora = await OperadoraModel.findById(operadora_id);
      if (!operadora || operadora.status !== 'ativo') {
        res.status(400).json({ 
          success: false, 
          message: 'Operadora não encontrada ou inativa' 
        });
        return;
      }

      // Verificar se email já existe
      const existsEmail = await OperadoraUserModel.checkEmailExists(email);
      if (existsEmail) {
        res.status(409).json({ success: false, message: 'E-mail já em uso' });
        return;
      }

      // Verificar se username já existe (se fornecido)
      if (username) {
        const existsUser = await OperadoraUserModel.checkUsernameExists(username);
        if (existsUser) {
          res.status(409).json({ success: false, message: 'Username já em uso' });
          return;
        }
      }

      const created = await OperadoraUserModel.create({ 
        nome, 
        email, 
        username, 
        password, 
        operadora_id,
        role: role || 'operadora_user'
      });

      res.status(201).json({ 
        success: true, 
        user: { 
          id: created.id, 
          nome: created.nome, 
          email: created.email, 
          username: created.username,
          role: created.role, 
          operadora_id: created.operadora_id 
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
      const operadora = await OperadoraModel.findById(operadoraIdNum);
      if (!operadora) {
        res.status(404).json({ success: false, message: 'Operadora não encontrada' });
        return;
      }

      const users = await OperadoraUserModel.findByOperadora(operadoraIdNum);
      
      res.json({ 
        success: true, 
        users: users.map(user => ({
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
