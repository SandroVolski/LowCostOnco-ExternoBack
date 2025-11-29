import { Request, Response } from 'express';
import { query } from '../config/database';
import { EmailService } from '../services/emailService';
import { ApiResponse } from '../types/api';

interface AuthRequest extends Request {
  user?: any;
}

export class MedicoAuthController {
  private static emailService = new EmailService();

  // Gerar código OTP de 6 dígitos
  private static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // POST /api/medico-auth/send-otp - Enviar código OTP por email
  static async sendOTP(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { medico_crm, medico_email, solicitacao_id } = req.body;

      console.log('📧 [MedicoAuthController.sendOTP] Recebida solicitação:', {
        medico_crm,
        medico_email,
        solicitacao_id
      });

      // Validações
      if (!medico_crm || !medico_email) {
        const response: ApiResponse = {
          success: false,
          message: 'CRM e email do médico são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }

      // Verificar se o médico existe e se o email corresponde
      console.log('🔍 [MedicoAuthController.sendOTP] Buscando médico...');
      const medicoRows = await query(
        `SELECT id, nome, email, registro_conselho, tipo_profissional 
         FROM responsaveis_tecnicos 
         WHERE registro_conselho = ? AND email = ? AND status = 'ativo' 
         LIMIT 1`,
        [medico_crm, medico_email]
      );

      if (medicoRows.length === 0) {
        console.log('❌ [MedicoAuthController.sendOTP] Médico não encontrado');
        const response: ApiResponse = {
          success: false,
          message: 'Médico não encontrado ou email não corresponde ao CRM informado'
        };
        res.status(404).json(response);
        return;
      }

      const medico = medicoRows[0];
      console.log('✅ [MedicoAuthController.sendOTP] Médico encontrado:', medico.nome);

      // Gerar código OTP
      const codigoOTP = MedicoAuthController.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expira em 10 minutos

      console.log('🔐 [MedicoAuthController.sendOTP] Código OTP gerado:', codigoOTP);

      // Invalidar códigos anteriores não utilizados do mesmo médico
      await query(
        `UPDATE medico_auth_otp 
         SET used_at = NOW() 
         WHERE medico_crm = ? AND used_at IS NULL AND expires_at > NOW()`,
        [medico_crm]
      );

      // Salvar código OTP no banco
      console.log('💾 [MedicoAuthController.sendOTP] Salvando código OTP no banco...');
      await query(
        `INSERT INTO medico_auth_otp 
         (medico_crm, medico_email, solicitacao_id, codigo_otp, expires_at, ip_address) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          medico_crm,
          medico_email,
          solicitacao_id || null,
          codigoOTP,
          expiresAt,
          req.ip || req.socket.remoteAddress || null
        ]
      );
      console.log('✅ [MedicoAuthController.sendOTP] Código OTP salvo no banco');

      // Enviar email com código OTP
      console.log('📧 [MedicoAuthController.sendOTP] Enviando email...');
      const emailSent = await MedicoAuthController.emailService.sendMedicoAuthOTPEmail(
        medico_email,
        medico.nome,
        medico_crm,
        codigoOTP
      );

      if (!emailSent) {
        console.error('❌ [MedicoAuthController.sendOTP] Erro ao enviar email OTP');
        const response: ApiResponse = {
          success: false,
          message: 'Erro ao enviar email. Tente novamente.'
        };
        res.status(500).json(response);
        return;
      }

      console.log('✅ [MedicoAuthController.sendOTP] Email enviado com sucesso');

      const response: ApiResponse = {
        success: true,
        message: 'Código OTP enviado por email com sucesso',
        data: {
          medico_nome: medico.nome,
          medico_email: medico_email,
          expires_at: expiresAt.toISOString()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ [MedicoAuthController] Erro ao enviar OTP:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao enviar código OTP',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // POST /api/medico-auth/validate-otp - Validar código OTP
  static async validateOTP(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { medico_crm, medico_email, codigo_otp, solicitacao_id } = req.body;

      console.log('🔍 [MedicoAuthController.validateOTP] Recebida solicitação de validação:', {
        medico_crm,
        medico_email,
        codigo_otp: codigo_otp ? `${codigo_otp.substring(0, 2)}****` : 'não informado',
        solicitacao_id
      });

      // Validações
      if (!medico_crm || !medico_email || !codigo_otp) {
        console.log('❌ [MedicoAuthController.validateOTP] Dados incompletos');
        const response: ApiResponse = {
          success: false,
          message: 'CRM, email e código OTP são obrigatórios'
        };
        res.status(400).json(response);
        return;
      }

      // Limpar código OTP (remover espaços)
      const codigoOTPLimpo = codigo_otp.toString().trim();

      // Buscar código OTP válido (usar UTC para comparação de datas)
      console.log('🔍 [MedicoAuthController.validateOTP] Buscando código OTP no banco...');
      const otpRows = await query(
        `SELECT id, medico_crm, medico_email, solicitacao_id, codigo_otp, expires_at, used_at, created_at,
                NOW() AS current_time_db,
                TIMESTAMPDIFF(MINUTE, NOW(), expires_at) AS minutes_remaining
         FROM medico_auth_otp 
         WHERE medico_crm = ? 
           AND medico_email = ? 
           AND codigo_otp = ? 
           AND used_at IS NULL
         ORDER BY created_at DESC 
         LIMIT 1`,
        [medico_crm, medico_email, codigoOTPLimpo]
      );

      console.log('📊 [MedicoAuthController.validateOTP] Resultado da busca:', {
        encontrados: otpRows.length,
        dados: otpRows.length > 0 ? {
          id: otpRows[0].id,
          expires_at: otpRows[0].expires_at,
          current_time: otpRows[0].current_time_db,
          minutes_remaining: otpRows[0].minutes_remaining,
          used_at: otpRows[0].used_at
        } : null
      });

      if (otpRows.length === 0) {
        console.log('❌ [MedicoAuthController.validateOTP] Código OTP não encontrado');
        const response: ApiResponse = {
          success: false,
          message: 'Código OTP inválido, expirado ou já utilizado'
        };
        res.status(400).json(response);
        return;
      }

      const otpRecord = otpRows[0];

      // Verificar se o código ainda é válido (não expirado)
      const expiresAt = new Date(otpRecord.expires_at);
      const now = new Date();
      
      console.log('⏰ [MedicoAuthController.validateOTP] Verificando expiração:', {
        expires_at: expiresAt.toISOString(),
        now: now.toISOString(),
        is_expired: expiresAt <= now,
        minutes_remaining: otpRecord.minutes_remaining
      });

      if (expiresAt <= now) {
        console.log('❌ [MedicoAuthController.validateOTP] Código OTP expirado');
        const response: ApiResponse = {
          success: false,
          message: 'Código OTP expirado. Solicite um novo código.'
        };
        res.status(400).json(response);
        return;
      }

      if (otpRecord.used_at) {
        console.log('❌ [MedicoAuthController.validateOTP] Código OTP já utilizado');
        const response: ApiResponse = {
          success: false,
          message: 'Código OTP já foi utilizado. Solicite um novo código.'
        };
        res.status(400).json(response);
        return;
      }

      // Verificar se o código corresponde à solicitação (se informado)
      if (solicitacao_id && otpRecord.solicitacao_id && otpRecord.solicitacao_id !== solicitacao_id) {
        const response: ApiResponse = {
          success: false,
          message: 'Código OTP não corresponde à solicitação informada'
        };
        res.status(400).json(response);
        return;
      }

      // Marcar código como utilizado
      console.log('✅ [MedicoAuthController.validateOTP] Código válido, marcando como utilizado...');
      await query(
        `UPDATE medico_auth_otp 
         SET used_at = NOW() 
         WHERE id = ?`,
        [otpRecord.id]
      );
      console.log('✅ [MedicoAuthController.validateOTP] Código marcado como utilizado');

      // Buscar dados do médico
      const medicoRows = await query(
        `SELECT id, nome, email, registro_conselho, tipo_profissional, clinica_id
         FROM responsaveis_tecnicos 
         WHERE registro_conselho = ? AND email = ? 
         LIMIT 1`,
        [medico_crm, medico_email]
      );

      const medico = medicoRows.length > 0 ? medicoRows[0] : null;

      const response: ApiResponse = {
        success: true,
        message: 'Código OTP validado com sucesso',
        data: {
          medico_nome: medico?.nome || null,
          medico_crm: medico_crm,
          medico_email: medico_email,
          validated_at: new Date().toISOString(),
          otp_id: otpRecord.id
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ [MedicoAuthController] Erro ao validar OTP:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao validar código OTP',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }

  // GET /api/medico-auth/medico-info - Buscar informações do médico por CRM
  static async getMedicoInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { crm } = req.query;

      if (!crm) {
        const response: ApiResponse = {
          success: false,
          message: 'CRM é obrigatório'
        };
        res.status(400).json(response);
        return;
      }

      // Buscar médico por CRM
      const medicoRows = await query(
        `SELECT id, nome, email, registro_conselho, tipo_profissional, clinica_id, telefone
         FROM responsaveis_tecnicos 
         WHERE registro_conselho = ? AND status = 'ativo' 
         LIMIT 1`,
        [crm as string]
      );

      if (medicoRows.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Médico não encontrado'
        };
        res.status(404).json(response);
        return;
      }

      const medico = medicoRows[0];

      const response: ApiResponse = {
        success: true,
        message: 'Médico encontrado',
        data: {
          id: medico.id,
          nome: medico.nome,
          email: medico.email,
          crm: medico.registro_conselho,
          tipo_profissional: medico.tipo_profissional,
          clinica_id: medico.clinica_id,
          telefone: medico.telefone
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ [MedicoAuthController] Erro ao buscar médico:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Erro ao buscar informações do médico',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      res.status(500).json(response);
    }
  }
}

