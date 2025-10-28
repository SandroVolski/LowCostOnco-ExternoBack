import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export async function authenticateOperadora(req: Request, res: Response, next: NextFunction) {
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

    if (decoded.tipo !== 'operadora') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: tipo de usuário inválido'
      });
    }

    // Buscar dados da operadora na tabela usuarios
    const [usuarios] = await pool.execute<RowDataPacket[]>(
      `SELECT u.*, o.nome as operadora_nome, o.codigo as registro_ans
       FROM usuarios u
       INNER JOIN operadoras o ON u.operadora_id = o.id
       WHERE u.id = ?
       AND u.operadora_id IS NOT NULL
       AND u.role IN ('operadora_admin', 'operadora_user')
       AND u.status = 'ativo'`,
      [decoded.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Operadora não encontrada ou inativa'
      });
    }

    // Adicionar dados da operadora ao request
    (req as any).operadora = {
      user_id: usuarios[0].id,
      id: usuarios[0].operadora_id,
      nome: usuarios[0].operadora_nome,
      registro_ans: usuarios[0].registro_ans,
      username: usuarios[0].username,
      role: usuarios[0].role
    };

    next();

  } catch (error) {
    console.error('Erro na autenticação de operadora:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
}
