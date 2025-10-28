import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export async function authenticateAuditor(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

    if (decoded.tipo !== 'auditor') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: tipo de usuário inválido'
      });
    }

    // Buscar dados do auditor
    const [auditores] = await pool.execute<RowDataPacket[]>(
      `SELECT a.*, au.username
       FROM auditores a
       INNER JOIN auditor_users au ON a.id = au.auditor_id
       WHERE a.id = ? AND a.ativo = TRUE AND au.ativo = TRUE`,
      [decoded.id]
    );

    if (auditores.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Auditor não encontrado ou inativo'
      });
    }

    // Adicionar dados do auditor ao request
    (req as any).auditor = {
      id: auditores[0].id,
      nome: auditores[0].nome,
      email: auditores[0].email,
      username: auditores[0].username,
      registro_profissional: auditores[0].registro_profissional,
      especialidade: auditores[0].especialidade
    };

    next();

  } catch (error) {
    console.error('Erro na autenticação de auditor:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
}
