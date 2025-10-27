import { Request, Response } from 'express';
import { NotificacaoModel } from '../models/Notificacao';
import { ApiResponse, NotificacaoCreateInput } from '../types';
import { invalidateCache } from '../middleware/cache';

export class NotificacaoController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const clinicaIdFromQuery = parseInt(req.query.clinica_id as string);
      const user = (req as any).user;
      const clinicaId = clinicaIdFromQuery || user?.clinicaId;
      const limit = parseInt((req.query.limit as string) || '20');
      if (!clinicaId) {
        res.status(400).json({ success: false, message: 'clinica_id é obrigatório' });
        return;
      }
      const rows = await NotificacaoModel.findByClinica(clinicaId, limit);
      const response: ApiResponse = { success: true, message: 'OK', data: rows };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao listar notificações', error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  }

  static async marcarLida(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (!id) { res.status(400).json({ success: false, message: 'id inválido' }); return; }
      const ok = await NotificacaoModel.markAsRead(id);
      invalidateCache('/api/notificacoes');
      res.json({ success: ok });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao marcar como lida', error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  }

  static async marcarTodas(req: Request, res: Response): Promise<void> {
    try {
      const clinicaIdFromBody = parseInt(req.body?.clinica_id);
      const user = (req as any).user;
      const clinicaId = clinicaIdFromBody || user?.clinicaId;
      if (!clinicaId) { res.status(400).json({ success: false, message: 'clinica_id é obrigatório' }); return; }
      await NotificacaoModel.markAllAsRead(clinicaId);
      invalidateCache('/api/notificacoes');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao marcar todas como lidas', error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  }

  // opcional/dev
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const body: NotificacaoCreateInput = req.body;
      if (!body?.clinica_id || !body?.tipo || !body?.titulo || !body?.mensagem) {
        res.status(400).json({ success: false, message: 'Campos obrigatórios: clinica_id, tipo, titulo, mensagem' });
        return;
      }
      const criada = await NotificacaoModel.create(body);
      invalidateCache('/api/notificacoes');
      res.status(201).json({ success: true, data: criada });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao criar notificação', error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  }
} 