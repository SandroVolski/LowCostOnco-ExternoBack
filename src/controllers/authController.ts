import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { query } from '../config/database';
import { emailService } from '../services/emailService';

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
      const roleValue = user.role as string;
      const isOperadoraUser = ['operadora', 'operadora_admin', 'operadora_user', 'operator'].includes(roleValue);
      const isClinicaUser = roleValue === 'clinica' || roleValue === 'clinic';
      const userTipo = isOperadoraUser ? 'operadora' : isClinicaUser ? 'clinica' : user.role === 'admin' ? 'admin' : 'usuario';

      const accessPayload: any = { 
        id: user.id, 
        role: user.role, 
        clinicaId: user.clinica_id,
        operadoraId: isOperadoraUser ? (user.operadora_id ?? null) : undefined,
        tipo: userTipo
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
          clinica_id: user.clinica_id,
          operadora_id: user.operadora_id ?? null
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
      const roleValue = user.role as string;
      const isOperadoraUser = ['operadora', 'operadora_admin', 'operadora_user', 'operator'].includes(roleValue);
      const isClinicaUser = roleValue === 'clinica' || roleValue === 'clinic';
      const userTipo = isOperadoraUser ? 'operadora' : isClinicaUser ? 'clinica' : user.role === 'admin' ? 'admin' : 'usuario';

      const accessPayload: any = { 
        id: user.id, 
        role: user.role, 
        clinicaId: user.clinica_id,
        operadoraId: isOperadoraUser ? (user.operadora_id ?? null) : undefined,
        tipo: userTipo
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
          clinica_id: user.clinica_id,
          operadora_id: user.operadora_id ?? null
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

      // Verificar se o email termina com @onkhos.com, @onkho.com.br ou email de teste
      const emailLower = email.toLowerCase();
      const isValidDomain = 
        emailLower.endsWith('@onkhos.com') || 
        emailLower.endsWith('@onkho.com.br') ||
        emailLower.endsWith('@gmail.com'); // Permitir Gmail para testes
      if (!isValidDomain) {
        res.status(400).json({ success: false, message: 'E-mail deve ser do domínio @onkhos.com, @onkho.com.br ou @gmail.com (apenas testes)' });
        return;
      }

      // Buscar usuário pelo email ou username (alguns usuários podem ter email como username)
      console.log(`🔍 [forgotPassword] Buscando usuário com email: ${email.toLowerCase()}`);
      let user = await UserModel.findByEmail(email.toLowerCase());
      
      // Se não encontrou por email, tentar buscar por username (caso o email seja usado como username)
      if (!user) {
        console.log(`🔍 [forgotPassword] Não encontrado por email, tentando buscar por username...`);
        user = await UserModel.findByUsername(email.toLowerCase());
      }
      
      // Sempre retornar sucesso (por segurança, não revelar se o email existe)
      if (!user || user.status !== 'ativo') {
        console.log(`⚠️ [forgotPassword] Usuário não encontrado ou inativo:`, {
          userExists: !!user,
          status: user?.status || 'não encontrado',
          email: user?.email || 'não encontrado',
          username: user?.username || 'não encontrado'
        });
        // Mesmo em desenvolvimento, retornar mensagem genérica por segurança
        res.json({ success: true, message: 'Se o e-mail existir, enviaremos instruções de recuperação.' });
        return;
      }
      
      console.log(`✅ [forgotPassword] Usuário encontrado:`, {
        id: user.id,
        email: user.email,
        username: user.username,
        status: user.status
      });

      // Gerar token único
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      console.log(`🔐 [forgotPassword] Token gerado:`, {
        tokenLength: resetToken.length,
        hashedTokenLength: hashedToken.length,
        hashedTokenPreview: hashedToken.substring(0, 20) + '...'
      });

      // Invalidar tokens anteriores do usuário
      await query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE',
        [user.id]
      );

      // Salvar token no banco (usar o email do usuário encontrado)
      // IMPORTANTE: Usar DATE_ADD do MySQL para evitar problemas de fuso horário
      const emailParaToken = user.email || email.toLowerCase();
      console.log(`💾 [forgotPassword] Salvando token no banco:`, {
        user_id: user.id,
        email: emailParaToken
      });
      
      await query(
        `INSERT INTO password_reset_tokens (user_id, email, token, expires_at, used, created_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), FALSE, NOW())`,
        [user.id, emailParaToken, hashedToken]
      );
      
      console.log(`✅ [forgotPassword] Token salvo no banco com sucesso`);

      // Gerar link de reset (usando o token não hasheado para a URL)
      // Usar o email do usuário encontrado, ou o email fornecido como fallback
      const emailParaLink = user.email || email.toLowerCase();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(emailParaLink)}`;

      // Tentar enviar email
      const emailSent = await emailService.sendPasswordResetEmail(emailParaLink, resetLink);
      
      // Sempre retornar mensagem genérica (por segurança, não revelar se o email existe)
      // O link só será enviado por email, nunca na resposta
      if (emailSent) {
        console.log(`✅ Email de recuperação enviado com sucesso`);
        res.json({ success: true, message: 'Se o e-mail existir, enviamos instruções de recuperação para seu email.' });
      } else {
        console.error(`❌ Falha ao enviar email de recuperação`);
        // Mesmo se o email falhar, retornar sucesso por segurança (não revelar se o email existe)
        res.json({ success: true, message: 'Se o e-mail existir, enviaremos instruções de recuperação.' });
      }
    } catch (error) {
      console.error('❌ Erro ao solicitar redefinição de senha:', error);
      res.status(500).json({ success: false, message: 'Erro ao solicitar redefinição de senha' });
    }
  }

  // POST /api/auth/reset-password
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, email, newPassword } = req.body || {};
      
      if (!token || !email || !newPassword) {
        res.status(400).json({ success: false, message: 'Token, email e nova senha são obrigatórios' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres' });
        return;
      }

      // Hash do token recebido
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const emailLower = email.toLowerCase();
      
      console.log(`🔍 [resetPassword] Buscando token:`, {
        tokenLength: token.length,
        hashedTokenPreview: hashedToken.substring(0, 20) + '...',
        email: emailLower
      });

      // Buscar token válido (sem JOIN primeiro, para ver se o token existe)
      // Usar CONVERT_TZ para garantir comparação correta de fuso horário
      let tokenRows = await query(
        `SELECT prt.*,
         CONVERT_TZ(prt.expires_at, '+00:00', '-03:00') as expires_at_br,
         CONVERT_TZ(NOW(), '+00:00', '-03:00') as now_br
         FROM password_reset_tokens prt
         WHERE prt.token = ? 
           AND prt.email = ? 
           AND prt.used = FALSE 
           AND prt.expires_at > NOW()
         LIMIT 1`,
        [hashedToken, emailLower]
      );
      
      console.log(`📊 [resetPassword] Tokens encontrados (sem JOIN): ${tokenRows.length}`);
      
      if (tokenRows.length === 0) {
        console.log(`❌ [resetPassword] Token não encontrado. Verificando possíveis problemas...`);
        
        // Verificar se existe algum token para este email (mesmo que usado/expirado)
        const allTokens = await query(
          `SELECT prt.*, 
           CASE WHEN prt.used = TRUE THEN 'usado' 
                WHEN prt.expires_at <= NOW() THEN 'expirado'
                ELSE 'ativo' END as status_token
           FROM password_reset_tokens prt
           WHERE prt.email = ?
           ORDER BY prt.created_at DESC
           LIMIT 5`,
          [emailLower]
        );
        
        console.log(`📋 [resetPassword] Últimos tokens para este email:`, allTokens.map((t: any) => ({
          user_id: t.user_id,
          email: t.email,
          status: t.status_token,
          expires_at: t.expires_at,
          created_at: t.created_at
        })));
        
        res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
        return;
      }

      const tokenData = tokenRows[0] as any;
      const userId = tokenData.user_id;
      console.log(`✅ [resetPassword] Token válido encontrado:`, {
        user_id: userId,
        email: tokenData.email,
        expires_at: tokenData.expires_at,
        created_at: tokenData.created_at
      });
      
      // Agora buscar o usuário (pode estar em usuarios ou clinicas)

      // Verificar se o usuário existe e está ativo
      let user = await UserModel.findById(userId);
      
      // Se não encontrou na tabela usuarios, buscar na tabela clinicas
      if (!user) {
        console.log(`🔍 [resetPassword] Usuário não encontrado em usuarios, tentando clinicas...`);
        const clinicaRows = await query(
          `SELECT id, usuario as email, usuario as username, nome, senha as password_hash, 
           'clinica' as role, status, NULL as clinica_id, NULL as operadora_id,
           NULL as last_login, created_at, updated_at
           FROM clinicas WHERE id = ? AND status = 'ativo' LIMIT 1`,
          [userId]
        );
        
        if (clinicaRows.length > 0) {
          console.log(`✅ [resetPassword] Clínica encontrada`);
          user = {
            id: clinicaRows[0].id,
            email: clinicaRows[0].email,
            username: clinicaRows[0].username,
            nome: clinicaRows[0].nome,
            password_hash: clinicaRows[0].password_hash,
            role: 'clinica',
            status: clinicaRows[0].status,
            clinica_id: clinicaRows[0].id,
            operadora_id: null,
            last_login: null,
            created_at: clinicaRows[0].created_at,
            updated_at: clinicaRows[0].updated_at
          } as any;
        }
      }
      
      if (!user || user.status !== 'ativo') {
        console.log(`❌ [resetPassword] Usuário não encontrado ou inativo`);
        res.status(400).json({ success: false, message: 'Usuário não encontrado ou inativo' });
        return;
      }
      
      console.log(`✅ [resetPassword] Usuário encontrado: ${user.email}`);

      // Criptografar nova senha
      const passwordHash = await bcrypt.hash(newPassword, 10);
      console.log(`🔐 [resetPassword] Nova senha criptografada, atualizando...`);

      // Atualizar senha do usuário
      // Se for clínica, atualizar na tabela clinicas, senão na tabela usuarios
      if (user.role === 'clinica' && !await UserModel.findById(userId)) {
        console.log(`🔄 [resetPassword] Atualizando senha na tabela clinicas`);
        await query(
          'UPDATE clinicas SET senha = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [passwordHash, userId]
        );
      } else {
        console.log(`🔄 [resetPassword] Atualizando senha na tabela usuarios`);
        let updateResult = await query(
          'UPDATE usuarios SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [passwordHash, userId]
        );
        
        // Se não atualizou em usuarios, tentar Usuarios (maiúsculo)
        if (updateResult.affectedRows === 0) {
          console.log(`🔄 [resetPassword] Tentando atualizar na tabela Usuarios`);
          await query(
            'UPDATE Usuarios SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, userId]
          );
        }
      }
      
      console.log(`✅ [resetPassword] Senha atualizada com sucesso`);

      // Marcar token como usado
      await query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
        [hashedToken]
      );

      res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
      console.error('❌ Erro ao redefinir senha:', error);
      res.status(500).json({ success: false, message: 'Erro ao redefinir senha' });
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
       const existingAdmin = await query('SELECT * FROM usuarios WHERE role = "admin" LIMIT 1');
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