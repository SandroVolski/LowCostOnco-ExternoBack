import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Configurações SMTP da Hostinger (ou outro provedor)
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || ''
      },
      tls: {
        // Não rejeitar conexões não autorizadas (útil para desenvolvimento)
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
      }
    };

    // Verificar se as credenciais estão configuradas
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.warn('⚠️ [EmailService] Credenciais SMTP não configuradas. Emails não serão enviados.');
      console.warn('⚠️ Configure SMTP_USER e SMTP_PASSWORD no arquivo .env');
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(smtpConfig);
      console.log('✅ [EmailService] Transportador SMTP configurado:', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.auth.user
      });
    } catch (error) {
      console.error('❌ [EmailService] Erro ao configurar transportador SMTP:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('⚠️ [EmailService] Transportador não configurado. Email não enviado.');
      return false;
    }

    try {
      // IMPORTANTE: Usar o mesmo email do SMTP_USER para evitar erro de autenticação
      // O servidor SMTP não permite enviar de um email diferente do autenticado
      // SEMPRE usar SMTP_USER primeiro (não SMTP_FROM_EMAIL se for diferente)
      let fromEmail = process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL || 'noreply@onkho.com.br';
      const fromName = process.env.SMTP_FROM_NAME || 'Sistema OnkoLink';
      
      // Garantir que o fromEmail seja exatamente o mesmo do SMTP_USER (obrigatório)
      // O servidor SMTP da Hostinger não permite enviar de um email diferente do autenticado
      if (process.env.SMTP_USER && fromEmail !== process.env.SMTP_USER) {
        console.warn(`⚠️ [EmailService] Ajustando fromEmail para corresponder ao SMTP_USER`);
        console.log(`   FromEmail original: ${fromEmail}`);
        console.log(`   FromEmail corrigido: ${process.env.SMTP_USER}`);
        fromEmail = process.env.SMTP_USER;
      }
      
      console.log(`📧 [EmailService] Enviando de: ${fromEmail} para: ${options.to}`);

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Versão texto simples
        html: options.html
      };

      console.log(`📧 [EmailService] Enviando email para: ${options.to}`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [EmailService] Email enviado com sucesso:`, {
        messageId: info.messageId,
        to: options.to
      });
      return true;
    } catch (error) {
      console.error('❌ [EmailService] Erro ao enviar email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Recuperação de Senha - OnkoLink</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #1f4edd 0%, #65a3ee 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .logo-container {
            position: relative;
            z-index: 1;
          }
          .logo {
            max-width: 200px;
            height: auto;
            margin: 0 auto 20px;
            display: block;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
          }
          .header-title {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-top: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            position: relative;
            z-index: 1;
          }
          .content {
            padding: 40px 30px;
            background-color: #ffffff;
          }
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .message {
            font-size: 16px;
            color: #5a6c7d;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
            padding: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #1f4edd 0%, #65a3ee 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(31, 78, 221, 0.4);
            transition: all 0.3s ease;
            text-transform: uppercase;
            position: relative;
            overflow: hidden;
          }
          .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .button:hover::before {
            left: 100%;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(31, 78, 221, 0.5);
          }
          .button:active {
            transform: translateY(0);
          }
          .link-fallback {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #1f4edd;
          }
          .link-fallback-title {
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .link-fallback-url {
            font-size: 12px;
            color: #1f4edd;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            line-height: 1.6;
          }
          .warning {
            background: linear-gradient(135deg, #fff4e6 0%, #ffe8cc 100%);
            border-left: 5px solid #e4a94f;
            padding: 20px;
            margin: 30px 0;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(228, 169, 79, 0.1);
          }
          .warning-title {
            font-size: 16px;
            font-weight: 700;
            color: #d97706;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .warning-list {
            list-style: none;
            padding: 0;
          }
          .warning-list li {
            font-size: 14px;
            color: #92400e;
            margin-bottom: 8px;
            padding-left: 24px;
            position: relative;
            line-height: 1.6;
          }
          .warning-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #e4a94f;
            font-weight: bold;
            font-size: 16px;
          }
          .footer {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            text-align: center;
            border-top: 1px solid #dee2e6;
          }
          .footer-text {
            font-size: 13px;
            color: #6c757d;
            line-height: 1.8;
            margin-bottom: 10px;
          }
          .footer-copyright {
            font-size: 12px;
            color: #adb5bd;
            margin-top: 15px;
          }
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #dee2e6, transparent);
            margin: 30px 0;
          }
          @media only screen and (max-width: 600px) {
            .email-wrapper {
              border-radius: 0;
              margin: 0;
            }
            .header {
              padding: 30px 20px;
            }
            .content {
              padding: 30px 20px;
            }
            .button {
              padding: 14px 30px;
              font-size: 14px;
            }
            .header-title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <div class="logo-container">
              <div class="header-title">Recuperação de Senha</div>
            </div>
          </div>
          
          <div class="content">
            <div class="greeting">Olá! 👋</div>
            
            <div class="message">
              Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Sistema OnkoLink</strong>.
            </div>
            
            <div class="message">
              Para criar uma nova senha, clique no botão abaixo:
            </div>
            
            <div class="button-container">
              <a href="${resetLink}" class="button">Redefinir Minha Senha</a>
            </div>
            
            <div class="divider"></div>
            
            <div class="link-fallback">
              <div class="link-fallback-title">🔗 Ou copie e cole este link no seu navegador:</div>
              <div class="link-fallback-url">${resetLink}</div>
            </div>
            
            <div class="warning">
              <div class="warning-title">
                <span>⚠️</span>
                <span>Informações Importantes</span>
              </div>
              <ul class="warning-list">
                <li>Este link expira em <strong>1 hora</strong> após o envio</li>
                <li>Se você não solicitou esta recuperação, ignore este email</li>
                <li>Não compartilhe este link com ninguém por segurança</li>
                <li>Após redefinir, use sua nova senha para fazer login</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              Este é um email automático do sistema OnkoLink.<br>
              Por favor, não responda este email.
            </div>
            <div class="footer-copyright">
              &copy; ${new Date().getFullYear()} OnkoLink. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Recuperação de Senha - Sistema OnkoLink',
      html: html
    });
  }

  // Enviar email com código OTP para autenticação médica
  async sendMedicoAuthOTPEmail(
    email: string,
    medicoNome: string,
    medicoCRM: string,
    codigoOTP: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Autenticação Médica</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
              Autenticação Médica
            </div>
            <div style="color: #ffffff; font-size: 14px; opacity: 0.9;">
              Sistema OnkoLink
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="color: #333333; font-size: 18px; margin-bottom: 20px;">
              Olá, Dr(a). ${medicoNome}! 👋
            </div>
            
            <div style="color: #666666; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
              Você solicitou um código de autenticação para validar uma solicitação de autorização no sistema.
            </div>

            <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <div style="color: #333333; font-size: 14px; font-weight: 600; margin-bottom: 10px;">
                Seu código de autenticação:
              </div>
              <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px; text-align: center; padding: 15px 0;">
                ${codigoOTP}
              </div>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 30px 0;">
              <div style="color: #856404; font-size: 13px; line-height: 1.5;">
                <strong>⚠️ Importante:</strong><br>
                • Este código é válido por <strong>10 minutos</strong><br>
                • Não compartilhe este código com ninguém<br>
                • Se você não solicitou este código, ignore este email
              </div>
            </div>

            <div style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              <strong>Informações da autenticação:</strong><br>
              • Médico: ${medicoNome}<br>
              • CRM: ${medicoCRM}<br>
              • Data/Hora: ${new Date().toLocaleString('pt-BR')}
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <div style="color: #6c757d; font-size: 12px; line-height: 1.5;">
              Este é um email automático do Sistema OnkoLink.<br>
              Por favor, não responda a este email.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Código de Autenticação Médica - Sistema OnkoLink',
      html: html
    });
  }

  // Enviar email de boas-vindas para profissional recém-cadastrado
  async sendProfissionalWelcomeEmail(
    email: string,
    profissionalNome: string,
    clinicaNome: string,
    registroConselho: string,
    tipoProfissional: string
  ): Promise<boolean> {
    // Mapear tipo de profissional para nome amigável
    const tipoProfissionalMap: { [key: string]: string } = {
      'medico': 'Médico',
      'nutricionista': 'Nutricionista',
      'enfermeiro': 'Enfermeiro',
      'farmaceutico': 'Farmacêutico',
      'terapeuta_ocupacional': 'Terapeuta Ocupacional'
    };
    const tipoProfissionalNome = tipoProfissionalMap[tipoProfissional] || tipoProfissional;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Sistema OnkoLink</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #1f4edd 0%, #65a3ee 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .header-title {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-top: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            position: relative;
            z-index: 1;
          }
          .content {
            padding: 40px 30px;
            background-color: #ffffff;
          }
          .greeting {
            font-size: 20px;
            color: #2c3e50;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .message {
            font-size: 16px;
            color: #5a6c7d;
            margin-bottom: 25px;
            line-height: 1.8;
          }
          .info-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-left: 4px solid #1f4edd;
            padding: 20px;
            margin: 30px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .info-box-title {
            font-size: 16px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .info-item {
            font-size: 14px;
            color: #5a6c7d;
            margin-bottom: 10px;
            padding-left: 24px;
            position: relative;
          }
          .info-item::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #1f4edd;
            font-weight: bold;
            font-size: 16px;
          }
          .features-box {
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            border-left: 4px solid #65a3ee;
            padding: 25px;
            margin: 30px 0;
            border-radius: 8px;
          }
          .features-title {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .feature-item {
            font-size: 15px;
            color: #2c3e50;
            margin-bottom: 12px;
            padding-left: 28px;
            position: relative;
            line-height: 1.6;
          }
          .feature-item::before {
            content: '📱';
            position: absolute;
            left: 0;
            font-size: 18px;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
            padding: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #1f4edd 0%, #65a3ee 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(31, 78, 221, 0.4);
            transition: all 0.3s ease;
            text-transform: uppercase;
            position: relative;
            overflow: hidden;
          }
          .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .button:hover::before {
            left: 100%;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(31, 78, 221, 0.5);
          }
          .footer {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            text-align: center;
            border-top: 1px solid #dee2e6;
          }
          .footer-text {
            font-size: 13px;
            color: #6c757d;
            line-height: 1.8;
            margin-bottom: 10px;
          }
          .footer-copyright {
            font-size: 12px;
            color: #adb5bd;
            margin-top: 15px;
          }
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #dee2e6, transparent);
            margin: 30px 0;
          }
          @media only screen and (max-width: 600px) {
            .email-wrapper {
              border-radius: 0;
              margin: 0;
            }
            .header {
              padding: 30px 20px;
            }
            .content {
              padding: 30px 20px;
            }
            .button {
              padding: 14px 30px;
              font-size: 14px;
            }
            .header-title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <div class="header-title">Bem-vindo ao Sistema OnkoLink! 🎉</div>
          </div>
          
          <div class="content">
            <div class="greeting">Olá, ${profissionalNome}! 👋</div>
            
            <div class="message">
              É com grande satisfação que informamos que seu cadastro foi realizado com sucesso no <strong>Sistema OnkoLink</strong>!
            </div>

            <div class="info-box">
              <div class="info-box-title">📋 Seus Dados de Cadastro:</div>
              <div class="info-item"><strong>Nome:</strong> ${profissionalNome}</div>
              <div class="info-item"><strong>Tipo de Profissional:</strong> ${tipoProfissionalNome}</div>
              <div class="info-item"><strong>Registro:</strong> ${registroConselho}</div>
              <div class="info-item"><strong>Clínica Vinculada:</strong> ${clinicaNome}</div>
            </div>

            <div class="message">
              Você foi vinculado(a) à <strong>${clinicaNome}</strong> como profissional que trabalha neste local. Agora você tem acesso completo ao sistema!
            </div>

            <div class="features-box">
              <div class="features-title">🚀 Funcionalidades Disponíveis no Aplicativo Mobile:</div>
              <div class="feature-item">
                <strong>Gerenciar sua Agenda:</strong> Organize seus compromissos e consultas de forma prática e eficiente.
              </div>
              <div class="feature-item">
                <strong>Aceitar Solicitações de Autorização:</strong> Aprove ou revise solicitações de autorização de tratamentos oncológicos dos seus pacientes.
              </div>
              <div class="feature-item">
                <strong>Gerenciar Pacientes:</strong> Acesse informações completas dos seus pacientes oncológicos e acompanhe seus tratamentos.
              </div>
            </div>

            <div class="message">
              Para acessar o aplicativo mobile, utilize seu <strong>email</strong> e seu <strong>registro profissional (${registroConselho})</strong> como credenciais de login.
            </div>

            <div class="button-container">
              <a href="https://mobile.onkhos.com" class="button">Acessar Aplicativo Mobile</a>
            </div>

            <div class="divider"></div>

            <div class="message" style="font-size: 14px; color: #6c757d;">
              <strong>📱 URL do Aplicativo:</strong><br>
              <a href="https://mobile.onkhos.com" style="color: #1f4edd; text-decoration: none; word-break: break-all;">https://mobile.onkhos.com</a>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 30px 0;">
              <div style="color: #856404; font-size: 13px; line-height: 1.6;">
                <strong>💡 Dica:</strong> Salve este email para referência futura. Se tiver dúvidas sobre o acesso ou funcionalidades, entre em contato com a clínica ou com o suporte do sistema.
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              <strong>Atenciosamente,</strong><br>
              Equipe OnkoLink
            </div>
            <div class="footer-text">
              <a href="https://www.onkho.com.br" target="_blank" style="color: #1f4edd; text-decoration: none;">www.onkho.com.br</a>
            </div>
            <div class="footer-copyright">
              Este é um email automático. Por favor, não responda a este email.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: `Bem-vindo ao Sistema OnkoLink - ${clinicaNome}`,
      html: html
    });
  }
}

// Exportar instância singleton
export const emailService = new EmailService();

