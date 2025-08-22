import { Request, Response } from 'express';

export class AuthController {
  // POST /api/auth/forgot-password
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ success: false, message: 'E-mail inválido' });
        return;
      }

      // Nesta fase mínima, não fazemos lookup real para evitar enumeração de e-mails.
      // No futuro, podemos gerar token, salvar validade e enviar e-mail de reset.
      console.log(`🔐 Solicitação de reset de senha recebida para: ${email}`);

      res.json({ success: true, message: 'Se o e-mail existir, enviaremos instruções.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao solicitar redefinição de senha' });
    }
  }
} 