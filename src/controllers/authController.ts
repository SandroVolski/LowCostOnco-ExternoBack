import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { query } from '../config/database';

export class AuthController {
  // POST /api/auth/login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body || {};
      if ((!email && !username) || !password) {
        res.status(400).json({ success: false, message: 'Credenciais inválidas' });
        return;
      }
      const user = email
        ? await UserModel.findByEmail(email)
        : await UserModel.findByUsername(username);
      if (!user || user.status !== 'ativo') {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
        return;
      }
      const ok = await UserModel.verifyPassword(user, password);
      if (!ok) {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
        return;
      }
      await UserModel.updateLastLogin(user.id);
      
      // Gerar access token (15 minutos) e refresh token (30 dias)
      const accessPayload = { 
        id: user.id, 
        role: user.role, 
        clinicaId: user.clinica_id,
        tipo: 'usuario'
      };
      const refreshPayload = { 
        id: user.id, 
        type: 'refresh' 
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
          clinica_id: user.clinica_id 
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao autenticar' });
    }
  }

  // POST /api/auth/refresh
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
      
      if (decoded.type !== 'refresh') {
        res.status(403).json({ success: false, message: 'Token inválido' });
        return;
      }

      // Buscar usuário
      const user = await UserModel.findById(decoded.id);
      if (!user || user.status !== 'ativo') {
        res.status(401).json({ success: false, message: 'Usuário não encontrado ou inativo' });
        return;
      }

      // Gerar novo access token
      const accessPayload = { 
        id: user.id, 
        role: user.role, 
        clinicaId: user.clinica_id,
        tipo: 'usuario'
      };
      
      const newAccessToken = jwt.sign(accessPayload, secret, { expiresIn: '15m' });
      
      res.json({ 
        success: true, 
        accessToken: newAccessToken
      });
    } catch (error) {
      res.status(401).json({ success: false, message: 'Refresh token inválido' });
    }
  }

  // POST /api/auth/logout
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token requerido' });
        return;
      }

      // Aqui você pode implementar a revogação do refresh token
      // Por enquanto, apenas retornamos sucesso
      res.json({ success: true, message: 'Logout realizado com sucesso' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao fazer logout' });
    }
  }

  // GET /api/auth/me
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        res.status(401).json({ success: false, message: 'Token requerido' });
        return;
      }
      const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      const user = await UserModel.findById(payload.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Usuário não encontrado' });
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
          clinica_id: user.clinica_id 
        } 
      });
    } catch (error) {
      res.status(401).json({ success: false, message: 'Token inválido' });
    }
  }

  // POST /api/auth/register (restrito a admin via token ou X-Admin-Secret via rota dedicada)
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { nome, email, username, password, role, clinica_id } = req.body || {};
      if (!nome || !email || !password) {
        res.status(400).json({ success: false, message: 'Campos obrigatórios: nome, email, password' });
        return;
      }
      const existsEmail = await UserModel.findByEmail(email);
      if (existsEmail) {
        res.status(409).json({ success: false, message: 'E-mail já em uso' });
        return;
      }
      if (username) {
        const existsUser = await UserModel.findByUsername(username);
        if (existsUser) {
          res.status(409).json({ success: false, message: 'Username já em uso' });
          return;
        }
      }
      const created = await UserModel.create({ nome, email, username, password, role, clinica_id });
      res.status(201).json({ 
        success: true, 
        user: { 
          id: created.id, 
          nome: created.nome, 
          email: created.email, 
          role: created.role, 
          clinica_id: created.clinica_id 
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao registrar usuário' });
    }
  }

  // POST /api/auth/forgot-password
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ success: false, message: 'E-mail inválido' });
        return;
      }

      res.json({ success: true, message: 'Se o e-mail existir, enviaremos instruções.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao solicitar redefinição de senha' });
    }
  }

  // POST /api/auth/bootstrap-admin (endpoint de bootstrap para criar primeiro admin)
  static async bootstrapAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { nome, email, username, password } = req.body || {};
      if (!nome || !email || !password) {
        res.status(400).json({ success: false, message: 'Campos obrigatórios: nome, email, password' });
        return;
      }

             // Verificar se já existe algum admin
       const existingAdmin = await query('SELECT * FROM Usuarios WHERE role = "admin" LIMIT 1');
       if (existingAdmin.length > 0) {
         res.status(409).json({ success: false, message: 'Administrador já existe no sistema' });
         return;
       }

      const created = await UserModel.create({ 
        nome, 
        email, 
        username, 
        password, 
        role: 'admin', 
        clinica_id: null 
      });

      res.status(201).json({ 
        success: true, 
        message: 'Administrador criado com sucesso',
        user: { 
          id: created.id, 
          nome: created.nome, 
          email: created.email, 
          role: created.role 
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao criar administrador' });
    }
  }
} 