import { Request, Response } from 'express';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

class OperadoraRecursosController {
  // Listar recursos da operadora
  async listarRecursos(req: Request, res: Response) {
    try {
      const operadoraId = (req as any).operadora?.id;
      const operadoraANS = (req as any).operadora?.registro_ans;
      const { status } = req.query;

      if (!operadoraANS) {
        return res.status(401).json({
          success: false,
          message: 'Operadora não identificada'
        });
      }

      let query = `
        SELECT * FROM vw_recursos_glosas_completo
        WHERE operadora_registro_ans = ?
      `;
      const params: any[] = [operadoraANS];

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
      const operadoraANS = (req as any).operadora?.registro_ans;

      // Buscar recurso
      const [recursos] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM vw_recursos_glosas_completo WHERE id = ? AND operadora_registro_ans = ?',
        [id, operadoraANS]
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

      // Buscar pareceres
      const [pareceres] = await pool.execute<RowDataPacket[]>(
        `SELECT rgp.*, a.nome as auditor_nome, a.registro_profissional
         FROM recursos_glosas_pareceres rgp
         LEFT JOIN auditores a ON rgp.auditor_id = a.id
         WHERE rgp.recurso_glosa_id = ?
         ORDER BY rgp.created_at DESC`,
        [id]
      );

      // Buscar mensagens do chat (se houver auditor)
      let mensagens: RowDataPacket[] = [];
      if (recurso.auditor_id) {
        const [chat] = await pool.execute<RowDataPacket[]>(
          `SELECT * FROM recursos_glosas_chat
           WHERE recurso_glosa_id = ?
           ORDER BY created_at ASC`,
          [id]
        );
        mensagens = chat;
      }

      return res.json({
        success: true,
        data: {
          ...recurso,
          documentos,
          historico,
          pareceres,
          mensagens
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

  // Atualizar status ao receber
  async receberRecurso(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const operadoraUserId = (req as any).operadora?.user_id;
      const operadoraNome = (req as any).operadora?.nome;

      // Atualizar status
      await connection.execute(
        `UPDATE recursos_glosas
         SET status_recurso = 'em_analise_operadora',
             data_recebimento_operadora = NOW(),
             usuario_operadora_id = ?
         WHERE id = ?`,
        [operadoraUserId, id]
      );

      // Registrar no histórico
      await connection.execute(
        `INSERT INTO recursos_glosas_historico
         (recurso_glosa_id, acao, status_anterior, status_novo, realizado_por, usuario_id, usuario_nome, descricao)
         VALUES (?, 'status_alterado', 'pendente', 'em_analise_operadora', 'operadora', ?, ?, 'Recurso recebido pela operadora')`,
        [id, operadoraUserId, operadoraNome]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Recurso recebido com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao receber recurso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao receber recurso'
      });
    } finally {
      connection.release();
    }
  }

  // Aprovar/Deferir recurso
  async aprovarRecurso(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const operadoraUserId = (req as any).operadora?.user_id;
      const operadoraNome = (req as any).operadora?.nome;
      const { observacoes } = req.body;

      // Buscar dados do recurso
      const [recursos] = await connection.execute<RowDataPacket[]>(
        'SELECT guia_id, clinica_id FROM recursos_glosas WHERE id = ?',
        [id]
      );

      if (recursos.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado'
        });
      }

      const recurso = recursos[0];

      // Atualizar status do recurso
      await connection.execute(
        `UPDATE recursos_glosas
         SET status_recurso = 'deferido',
             data_decisao_final = NOW()
         WHERE id = ?`,
        [id]
      );

      // Atualizar status da guia para "pago"
      await connection.execute(
        `UPDATE financeiro_items
         SET status_pagamento = 'pago',
             data_pagamento = NOW()
         WHERE id = ?`,
        [recurso.guia_id]
      );

      // Registrar no histórico
      await connection.execute(
        `INSERT INTO recursos_glosas_historico
         (recurso_glosa_id, acao, status_anterior, status_novo, realizado_por, usuario_id, usuario_nome, descricao)
         VALUES (?, 'decisao_final', 'em_analise_operadora', 'deferido', 'operadora', ?, ?, ?)`,
        [id, operadoraUserId, operadoraNome, `Recurso aprovado. ${observacoes || ''}`]
      );

      // Notificar clínica
      await connection.execute(
        `INSERT INTO recursos_glosas_notificacoes
         (recurso_glosa_id, destinatario_tipo, destinatario_id, tipo_notificacao, titulo, mensagem, link)
         VALUES (?, 'clinica', ?, 'decisao_final', 'Recurso Aprovado', ?, ?)`,
        [
          id,
          recurso.clinica_id,
          `Seu recurso de glosa foi aprovado pela operadora. A guia será paga.`,
          `/recursos-glosas/${id}`
        ]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Recurso aprovado com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao aprovar recurso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao aprovar recurso'
      });
    } finally {
      connection.release();
    }
  }

  // Negar/Indeferir recurso
  async negarRecurso(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const operadoraUserId = (req as any).operadora?.user_id;
      const operadoraNome = (req as any).operadora?.nome;
      const { motivo } = req.body;

      if (!motivo) {
        return res.status(400).json({
          success: false,
          message: 'Motivo da negativa é obrigatório'
        });
      }

      // Buscar dados do recurso
      const [recursos] = await connection.execute<RowDataPacket[]>(
        'SELECT clinica_id FROM recursos_glosas WHERE id = ?',
        [id]
      );

      if (recursos.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado'
        });
      }

      const recurso = recursos[0];

      // Atualizar status
      await connection.execute(
        `UPDATE recursos_glosas
         SET status_recurso = 'indeferido',
             data_decisao_final = NOW()
         WHERE id = ?`,
        [id]
      );

      // Registrar no histórico
      await connection.execute(
        `INSERT INTO recursos_glosas_historico
         (recurso_glosa_id, acao, status_anterior, status_novo, realizado_por, usuario_id, usuario_nome, descricao)
         VALUES (?, 'decisao_final', 'em_analise_operadora', 'indeferido', 'operadora', ?, ?, ?)`,
        [id, operadoraUserId, operadoraNome, `Recurso negado. Motivo: ${motivo}`]
      );

      // Notificar clínica
      await connection.execute(
        `INSERT INTO recursos_glosas_notificacoes
         (recurso_glosa_id, destinatario_tipo, destinatario_id, tipo_notificacao, titulo, mensagem, link)
         VALUES (?, 'clinica', ?, 'decisao_final', 'Recurso Negado', ?, ?)`,
        [
          id,
          recurso.clinica_id,
          `Seu recurso de glosa foi negado pela operadora. Motivo: ${motivo}`,
          `/recursos-glosas/${id}`
        ]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Recurso negado'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao negar recurso:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao negar recurso'
      });
    } finally {
      connection.release();
    }
  }

  // Solicitar parecer de auditor
  async solicitarParecer(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const operadoraUserId = (req as any).operadora?.user_id;
      const operadoraNome = (req as any).operadora?.nome;
      const { auditor_id, observacoes } = req.body;

      if (!auditor_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do auditor é obrigatório'
        });
      }

      // Verificar se auditor existe e está ativo
      const [auditores] = await connection.execute<RowDataPacket[]>(
        'SELECT id, nome FROM auditores WHERE id = ? AND ativo = TRUE',
        [auditor_id]
      );

      if (auditores.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Auditor não encontrado'
        });
      }

      // Atualizar recurso
      await connection.execute(
        `UPDATE recursos_glosas
         SET status_recurso = 'solicitado_parecer',
             auditor_id = ?,
             data_solicitacao_parecer = NOW(),
             data_recebimento_auditor = NOW()
         WHERE id = ?`,
        [auditor_id, id]
      );

      // Mudar status para "em_analise_auditor"
      await connection.execute(
        `UPDATE recursos_glosas
         SET status_recurso = 'em_analise_auditor'
         WHERE id = ?`,
        [id]
      );

      // Registrar no histórico
      await connection.execute(
        `INSERT INTO recursos_glosas_historico
         (recurso_glosa_id, acao, status_anterior, status_novo, realizado_por, usuario_id, usuario_nome, descricao)
         VALUES (?, 'parecer_solicitado', 'em_analise_operadora', 'em_analise_auditor', 'operadora', ?, ?, ?)`,
        [id, operadoraUserId, operadoraNome, `Parecer solicitado ao auditor ${auditores[0].nome}. ${observacoes || ''}`]
      );

      // Notificar auditor
      await connection.execute(
        `INSERT INTO recursos_glosas_notificacoes
         (recurso_glosa_id, destinatario_tipo, destinatario_id, tipo_notificacao, titulo, mensagem, link)
         VALUES (?, 'auditor', ?, 'parecer_solicitado', 'Nova Solicitação de Parecer', ?, ?)`,
        [
          id,
          auditor_id,
          `A operadora solicitou seu parecer técnico sobre um recurso de glosa.`,
          `/auditor/recursos/${id}`
        ]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Parecer solicitado com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao solicitar parecer:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao solicitar parecer'
      });
    } finally {
      connection.release();
    }
  }

  // Chat: Enviar mensagem para auditor
  async enviarMensagem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const operadoraUserId = (req as any).operadora?.user_id;
      const operadoraNome = (req as any).operadora?.nome;
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
         VALUES (?, 'operadora', ?, ?, ?, ?)`,
        [id, operadoraUserId, operadoraNome, mensagem, anexos ? JSON.stringify(anexos) : null]
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

  // Listar auditores disponíveis
  async listarAuditores(req: Request, res: Response) {
    try {
      const [auditores] = await pool.execute<RowDataPacket[]>(
        `SELECT id, nome, registro_profissional, especialidade
         FROM auditores
         WHERE ativo = TRUE
         ORDER BY nome`
      );

      return res.json({
        success: true,
        data: auditores
      });

    } catch (error) {
      console.error('Erro ao listar auditores:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar auditores'
      });
    }
  }

  // Dashboard: Estatísticas da operadora
  async dashboard(req: Request, res: Response) {
    try {
      const operadoraANS = (req as any).operadora?.registro_ans;

      // Estatísticas
      const [stats] = await pool.execute<RowDataPacket[]>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status_recurso = 'pendente' THEN 1 ELSE 0 END) as pendentes,
          SUM(CASE WHEN status_recurso IN ('em_analise_operadora', 'solicitado_parecer', 'em_analise_auditor', 'parecer_emitido') THEN 1 ELSE 0 END) as em_analise,
          SUM(CASE WHEN status_recurso = 'deferido' THEN 1 ELSE 0 END) as deferidos,
          SUM(CASE WHEN status_recurso = 'indeferido' THEN 1 ELSE 0 END) as indeferidos,
          SUM(valor_guia) as valor_total,
          SUM(CASE WHEN status_recurso = 'deferido' THEN valor_guia ELSE 0 END) as valor_deferido
         FROM recursos_glosas
         WHERE operadora_registro_ans = ?`,
        [operadoraANS]
      );

      // Recursos recentes
      const [recentes] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM vw_recursos_glosas_completo
         WHERE operadora_registro_ans = ?
         ORDER BY created_at DESC
         LIMIT 10`,
        [operadoraANS]
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

export default new OperadoraRecursosController();
