import { Request, Response } from 'express';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

class AdminAuditoresController {
  // Listar todos os auditores
  async listar(req: Request, res: Response) {
    try {
      const [auditores] = await pool.execute<RowDataPacket[]>(
        `SELECT a.id, a.nome, a.email, a.telefone, a.registro_profissional,
                a.especialidade, a.observacoes, a.ativo, a.created_at
         FROM auditores a
         ORDER BY a.nome`
      );

      res.json({
        success: true,
        data: auditores
      });
    } catch (error: any) {
      console.error('Erro ao listar auditores:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar auditores',
        error: error.message
      });
    }
  }

  // Buscar auditor por ID
  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [auditores] = await pool.execute<RowDataPacket[]>(
        `SELECT a.id, a.nome, a.email, a.telefone, a.registro_profissional,
                a.especialidade, a.observacoes, a.ativo, a.created_at
         FROM auditores a
         WHERE a.id = ?`,
        [id]
      );

      if (auditores.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Auditor não encontrado'
        });
      }

      res.json({
        success: true,
        data: auditores[0]
      });
    } catch (error: any) {
      console.error('Erro ao buscar auditor:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar auditor',
        error: error.message
      });
    }
  }

  // Criar novo auditor
  async criar(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        nome,
        email,
        telefone,
        registro_profissional,
        especialidade,
        observacoes,
        username,
        senha,
        ativo
      } = req.body;

      // Validações
      if (!nome || !registro_profissional || !username || !senha) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios não preenchidos'
        });
      }

      // Verificar se email/username já existe
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM auditores WHERE email = ?',
        [username]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email/Username já cadastrado'
        });
      }

      // 1. Inserir auditor
      const [resultAuditor] = await connection.execute<ResultSetHeader>(
        `INSERT INTO auditores
         (nome, email, telefone, registro_profissional, especialidade, observacoes, ativo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [nome, username, telefone || null, registro_profissional, especialidade || null, observacoes || null, ativo !== false]
      );

      const auditorId = resultAuditor.insertId;

      // 2. Criar usuário de login
      const passwordHash = await bcrypt.hash(senha, 10);

      await connection.execute(
        `INSERT INTO auditor_users
         (auditor_id, username, password_hash, ativo, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [auditorId, username, passwordHash, ativo !== false]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Auditor criado com sucesso',
        data: { id: auditorId }
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao criar auditor:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar auditor',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Atualizar auditor
  async atualizar(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        nome,
        email,
        telefone,
        registro_profissional,
        especialidade,
        observacoes,
        username,
        senha,
        ativo
      } = req.body;

      // Atualizar dados do auditor
      await connection.execute(
        `UPDATE auditores
         SET nome = ?, email = ?, telefone = ?, registro_profissional = ?,
             especialidade = ?, observacoes = ?, ativo = ?, updated_at = NOW()
         WHERE id = ?`,
        [nome, username, telefone || null, registro_profissional, especialidade || null, observacoes || null, ativo !== false, id]
      );

      // Atualizar username no auditor_users
      await connection.execute(
        `UPDATE auditor_users
         SET username = ?, ativo = ?
         WHERE auditor_id = ?`,
        [username, ativo !== false, id]
      );

      // Atualizar senha se fornecida
      if (senha) {
        const passwordHash = await bcrypt.hash(senha, 10);
        await connection.execute(
          `UPDATE auditor_users
           SET password_hash = ?
           WHERE auditor_id = ?`,
          [passwordHash, id]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Auditor atualizado com sucesso'
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao atualizar auditor:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar auditor',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Excluir auditor
  async excluir(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;

      // Verificar se auditor tem recursos atribuídos
      const [recursos] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM recursos_glosas WHERE auditor_id = ?',
        [id]
      );

      if (recursos[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível excluir auditor com recursos atribuídos. Desative-o ao invés de excluir.'
        });
      }

      // Excluir usuário de login
      await connection.execute(
        'DELETE FROM auditor_users WHERE auditor_id = ?',
        [id]
      );

      // Excluir auditor
      await connection.execute(
        'DELETE FROM auditores WHERE id = ?',
        [id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Auditor excluído com sucesso'
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao excluir auditor:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir auditor',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

export default new AdminAuditoresController();
