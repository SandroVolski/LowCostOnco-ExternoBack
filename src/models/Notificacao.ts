import { query } from '../config/database';
import { Notificacao, NotificacaoCreateInput } from '../types';

export class NotificacaoModel {
  static async findByClinica(clinicaId: number, limit: number = 20): Promise<Notificacao[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
    const sql = `
      SELECT * FROM notificacoes
      WHERE clinica_id = ?
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `;
    return await query(sql, [clinicaId]);
  }

  static async markAsRead(id: number): Promise<boolean> {
    const sql = `UPDATE notificacoes SET lida = TRUE WHERE id = ?`;
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }

  static async markAllAsRead(clinicaId: number): Promise<number> {
    const sql = `UPDATE notificacoes SET lida = TRUE WHERE clinica_id = ? AND lida = FALSE`;
    const result = await query(sql, [clinicaId]);
    return result.affectedRows || 0;
  }

  static async create(n: NotificacaoCreateInput): Promise<Notificacao> {
    const sql = `
      INSERT INTO notificacoes (clinica_id, tipo, titulo, mensagem, solicitacao_id, paciente_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [n.clinica_id, n.tipo, n.titulo, n.mensagem, n.solicitacao_id || null, n.paciente_id || null];
    const result = await query(sql, values);
    const inserted = await query(`SELECT * FROM notificacoes WHERE id = ?`, [result.insertId]);
    return inserted[0];
  }
} 