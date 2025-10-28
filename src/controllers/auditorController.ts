import { Request, Response } from 'express';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class AuditorController {
  // Autenticação de auditor
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username e senha são obrigatórios'
        });
      }

      // Buscar auditor
      const [users] = await pool.execute<RowDataPacket[]>(
        `SELECT au.*, a.nome, a.email, a.registro_profissional, a.especialidade
         FROM auditor_users au
         INNER JOIN auditores a ON au.auditor_id = a.id
         WHERE au.username = ? AND au.ativo = TRUE AND a.ativo = TRUE`,
        [username]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      const user = users[0];

      // Verificar senha
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        {
          id: user.auditor_id,
          username: user.username,
          tipo: 'auditor'
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '24h' }
      );

      // Atualizar último acesso
      await pool.execute(
        'UPDATE auditor_users SET ultimo_acesso = NOW() WHERE id = ?',
        [user.id]
      );

      return res.json({
        success: true,
        data: {
          token,
          auditor: {
            id: user.auditor_id,
            nome: user.nome,
            email: user.email,
            username: user.username,
            registro_profissional: user.registro_profissional,
            especialidade: user.especialidade
          }
        }
      });

    } catch (error) {
      console.error('Erro no login de auditor:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao fazer login'
      });
    }
  }

  // Listar recursos atribuídos ao auditor
  async listarRecursos(req: Request, res: Response) {
    try {
      const auditorId = (req as any).auditor?.id;
      const { status } = req.query;

      if (!auditorId) {
        return res.status(401).json({
          success: false,
          message: 'Auditor não identificado'
        });
      }

      let query = `
        SELECT * FROM vw_recursos_glosas_completo
        WHERE auditor_id = ?
      `;
      const params: any[] = [auditorId];

      if (status) {
        query += ' AND status_recurso = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const [recursos] = await pool.execute<RowDataPacket[]>(query, params);

      return res.json({
        success: true,
        data: recursos
      });

    } catch (error) {
      console.error('Erro ao listar recursos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar recursos'
      });
    }
  }

  // Buscar detalhes de um recurso
  async buscarRecurso(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const auditorId = (req as any).auditor?.id;

      // Buscar recurso
      const [recursos] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM vw_recursos_glosas_completo WHERE id = ? AND auditor_id = ?',
        [id, auditorId]
      );

      if (recursos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado'
        });
      }

      const recurso = recursos[0];

      // Buscar documentos
      const [documentos] = await pool.execute<RowDataPacket[]>(
        `SELECT id, tipo_documento, nome_original, tamanho_arquivo, enviado_por, created_at
         FROM recursos_glosas_documentos
         WHERE recurso_glosa_id = ?`,
        [id]
      );

      // Buscar histórico
      const [historico] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM recursos_glosas_historico
         WHERE recurso_glosa_id = ?
         ORDER BY created_at DESC`,
        [id]
      );

      // Buscar parecer anterior (se houver)
      const [pareceres] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM recursos_glosas_pareceres
         WHERE recurso_glosa_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [id]
      );

      return res.json({
        success: true,
        data: {
          ...recurso,
          documentos,
          historico,
          parecer_anterior: pareceres[0] || null
        }
      });

    } catch (error) {
      console.error('Erro ao buscar recurso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar recurso'
      });
    }
  }

  // Emitir parecer
  async emitirParecer(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const auditorId = (req as any).auditor?.id;
      const {
        parecer_tecnico,
        recomendacao,
        valor_recomendado,
        justificativa_tecnica,
        cids_analisados,
        procedimentos_analisados,
        tempo_analise_minutos
      } = req.body;

      // Validações
      if (!parecer_tecnico || !recomendacao) {
        return res.status(400).json({
          success: false,
          message: 'Parecer técnico e recomendação são obrigatórios'
        });
      }

      // Verificar se o recurso existe e está atribuído ao auditor
      const [recursos] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM recursos_glosas WHERE id = ? AND auditor_id = ?',
        [id, auditorId]
      );

      if (recursos.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado ou não atribuído a você'
        });
      }

      // Inserir parecer
      const [resultParecer] = await connection.execute<ResultSetHeader>(
        `INSERT INTO recursos_glosas_pareceres
         (recurso_glosa_id, auditor_id, parecer_tecnico, recomendacao, valor_recomendado,
          justificativa_tecnica, cids_analisados, procedimentos_analisados, tempo_analise_minutos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          auditorId,
          parecer_tecnico,
          recomendacao,
          valor_recomendado || null,
          justificativa_tecnica || null,
          cids_analisados ? JSON.stringify(cids_analisados) : null,
          procedimentos_analisados ? JSON.stringify(procedimentos_analisados) : null,
          tempo_analise_minutos || null
        ]
      );

      // Atualizar status do recurso
      await connection.execute(
        `UPDATE recursos_glosas
         SET status_recurso = 'parecer_emitido',
             data_emissao_parecer = NOW()
         WHERE id = ?`,
        [id]
      );

      // Registrar no histórico
      await connection.execute(
        `INSERT INTO recursos_glosas_historico
         (recurso_glosa_id, acao, status_anterior, status_novo, realizado_por, usuario_id, usuario_nome, descricao)
         VALUES (?, 'parecer_emitido', 'em_analise_auditor', 'parecer_emitido', 'auditor', ?, ?, ?)`,
        [id, auditorId, (req as any).auditor?.nome, `Parecer técnico emitido com recomendação: ${recomendacao}`]
      );

      // Criar notificação para a operadora
      const recurso = recursos[0];
      await connection.execute(
        `INSERT INTO recursos_glosas_notificacoes
         (recurso_glosa_id, destinatario_tipo, destinatario_id, tipo_notificacao, titulo, mensagem, link)
         VALUES (?, 'operadora', ?, 'parecer_emitido', ?, ?, ?)`,
        [
          id,
          recurso.usuario_operadora_id,
          'Parecer Técnico Emitido',
          `O auditor emitiu parecer técnico sobre o recurso. Recomendação: ${recomendacao}`,
          `/recursos-glosas/${id}`
        ]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Parecer emitido com sucesso',
        data: { parecer_id: resultParecer.insertId }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao emitir parecer:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao emitir parecer'
      });
    } finally {
      connection.release();
    }
  }

  // Chat: Enviar mensagem
  async enviarMensagem(req: Request, res: Response) {
    try {
      const { id } = req.params; // recurso_glosa_id
      const auditorId = (req as any).auditor?.id;
      const auditorNome = (req as any).auditor?.nome;
      const { mensagem, anexos } = req.body;

      if (!mensagem) {
        return res.status(400).json({
          success: false,
          message: 'Mensagem é obrigatória'
        });
      }

      // Inserir mensagem
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO recursos_glosas_chat
         (recurso_glosa_id, tipo_remetente, remetente_id, remetente_nome, mensagem, anexos)
         VALUES (?, 'auditor', ?, ?, ?, ?)`,
        [id, auditorId, auditorNome, mensagem, anexos ? JSON.stringify(anexos) : null]
      );

      return res.json({
        success: true,
        message: 'Mensagem enviada',
        data: { mensagem_id: result.insertId }
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem'
      });
    }
  }

  // Chat: Listar mensagens
  async listarMensagens(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const auditorId = (req as any).auditor?.id;

      // Verificar se o recurso está atribuído ao auditor
      const [recursos] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM recursos_glosas WHERE id = ? AND auditor_id = ?',
        [id, auditorId]
      );

      if (recursos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado'
        });
      }

      // Buscar mensagens
      const [mensagens] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM recursos_glosas_chat
         WHERE recurso_glosa_id = ?
         ORDER BY created_at ASC`,
        [id]
      );

      // Marcar mensagens da operadora como lidas
      await pool.execute(
        `UPDATE recursos_glosas_chat
         SET lida = TRUE, data_leitura = NOW()
         WHERE recurso_glosa_id = ? AND tipo_remetente = 'operadora' AND lida = FALSE`,
        [id]
      );

      return res.json({
        success: true,
        data: mensagens
      });

    } catch (error) {
      console.error('Erro ao listar mensagens:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar mensagens'
      });
    }
  }

  // Dashboard: Estatísticas do auditor
  async dashboard(req: Request, res: Response) {
    try {
      const auditorId = (req as any).auditor?.id;

      // Estatísticas
      const [stats] = await pool.execute<RowDataPacket[]>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status_recurso = 'em_analise_auditor' THEN 1 ELSE 0 END) as pendentes,
          SUM(CASE WHEN status_recurso = 'parecer_emitido' THEN 1 ELSE 0 END) as concluidos,
          AVG(tempo_analise_minutos) as tempo_medio_minutos
         FROM recursos_glosas rg
         LEFT JOIN recursos_glosas_pareceres rgp ON rg.id = rgp.recurso_glosa_id
         WHERE rg.auditor_id = ?`,
        [auditorId]
      );

      // Recursos recentes
      const [recentes] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM vw_recursos_glosas_completo
         WHERE auditor_id = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [auditorId]
      );

      return res.json({
        success: true,
        data: {
          estatisticas: stats[0],
          recursos_recentes: recentes
        }
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao carregar dashboard'
      });
    }
  }
}

export default new AuditorController();
