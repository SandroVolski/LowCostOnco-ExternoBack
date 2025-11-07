import { Request, Response } from 'express';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { FinanceiroCompactModel } from '../models/FinanceiroCompact';

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

      const [statsRows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status_recurso IN ('pendente', 'em_analise_auditor', 'solicitado_parecer') THEN 1 ELSE 0 END) AS pendentes,
          SUM(CASE WHEN status_recurso = 'parecer_emitido' THEN 1 ELSE 0 END) AS concluidos,
          SUM(CASE WHEN status_recurso = 'pendente' THEN 1 ELSE 0 END) AS pendentes_nao_analisados,
          AVG(rgp.tempo_analise_minutos) AS tempo_medio_minutos
         FROM recursos_glosas rg
         LEFT JOIN recursos_glosas_pareceres rgp ON rg.id = rgp.recurso_glosa_id
         WHERE rg.auditor_id = ?`,
        [auditorId]
      );

      const estatisticas = statsRows[0] || {
        total: 0,
        pendentes: 0,
        concluidos: 0,
        pendentes_nao_analisados: 0,
        tempo_medio_minutos: 0
      };

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
          total_recursos: Number(estatisticas.total) || 0,
          aguardando_analise: Number(estatisticas.pendentes) || 0,
          pareceres_emitidos: Number(estatisticas.concluidos) || 0,
          media_tempo_analise: Math.round(Number(estatisticas.tempo_medio_minutos) || 0),
          pendentes_nao_analisados: Number(estatisticas.pendentes_nao_analisados) || 0,
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

  // Guia completa para análise do auditor
  async getGuiaCompleta(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const auditorId = (req as any).auditor?.id;

      if (!auditorId) {
        return res.status(401).json({
          success: false,
          message: 'Auditor não identificado'
        });
      }

      const [recursos] = await pool.execute<RowDataPacket[]>(
        `SELECT rg.*,
                fl.operadora_nome,
                fl.operadora_registro_ans,
                fl.numero_lote,
                fl.competencia,
                fl.data_envio,
                fl.tipo_transacao,
                fl.sequencial_transacao,
                fl.data_registro_transacao,
                fl.hora_registro_transacao,
                fl.cnpj_prestador,
                fl.nome_prestador,
                fl.registro_ans,
                fl.padrao_tiss,
                fl.hash_lote,
                fl.cnes
         FROM recursos_glosas rg
         LEFT JOIN financeiro_lotes fl ON fl.id = rg.lote_id
         WHERE rg.id = ? AND rg.auditor_id = ?`,
        [id, auditorId]
      );

      if (recursos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado ou não atribuído a este auditor'
        });
      }

      const recurso = recursos[0];

      if (!recurso.lote_id || !recurso.guia_id) {
        return res.status(400).json({
          success: false,
          message: 'Recurso não possui informações completas de lote/guia'
        });
      }

      const lote = await FinanceiroCompactModel.getLoteById(recurso.lote_id);
      const itens = await FinanceiroCompactModel.getAllItemsByLote(recurso.lote_id);

      if (!lote) {
        return res.status(404).json({
          success: false,
          message: 'Lote financeiro não encontrado'
        });
      }

      if ((!lote.cnes || lote.cnes === 'N/A') && Array.isArray(itens)) {
        const guiaComCnes = itens.find((item: any) => item.tipo_item === 'guia' && item.cnes);
        if (guiaComCnes?.cnes) {
          (lote as any).cnes = guiaComCnes.cnes;
        }
      }

      return res.json({
        success: true,
        data: {
          recurso,
          lote,
          itens
        }
      });

    } catch (error: any) {
      console.error('Erro ao buscar guia completa para auditor:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter dados completos da guia',
        error: error.message
      });
    }
  }

  // Listar pacientes atendidos pelo auditor
  async listarPacientes(req: Request, res: Response) {
    try {
      const auditorId = (req as any).auditor?.id;
      if (!auditorId) {
        return res.status(401).json({
          success: false,
          message: 'Auditor não identificado'
        });
      }

      const [pacientes] = await pool.execute<RowDataPacket[]>(
        `SELECT 
           numero_carteira,
           clinica_nome,
           COUNT(*) AS total_recursos,
           MAX(created_at) AS ultimo_recurso
         FROM vw_recursos_glosas_completo
         WHERE auditor_id = ?
         GROUP BY numero_carteira, clinica_nome
         ORDER BY ultimo_recurso DESC
         LIMIT 200`,
        [auditorId]
      );

      return res.json({
        success: true,
        data: pacientes
      });

    } catch (error: any) {
      console.error('Erro ao listar pacientes do auditor:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar pacientes atendidos',
        error: error.message
      });
    }
  }

  // Buscar histórico de recursos por carteira
  async buscarHistoricoPorCarteira(req: Request, res: Response) {
    try {
      const { carteira } = req.query;

      if (!carteira || typeof carteira !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Número da carteira é obrigatório'
        });
      }

      // Buscar recursos por carteira usando a view completa
      const [recursos] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM vw_recursos_glosas_completo
         WHERE numero_carteira LIKE ?
         ORDER BY created_at DESC
         LIMIT 200`,
        [`%${carteira}%`]
      );

      // Para cada recurso, buscar parecer anterior
      const recursosComPareceres = await Promise.all(
        recursos.map(async (recurso) => {
          const [pareceres] = await pool.execute<RowDataPacket[]>(
            `SELECT rgp.*, a.nome as auditor_nome
             FROM recursos_glosas_pareceres rgp
             LEFT JOIN auditores a ON rgp.auditor_id = a.id
             WHERE rgp.recurso_glosa_id = ?
             ORDER BY rgp.created_at DESC
             LIMIT 1`,
            [recurso.id]
          );

          const parecer = pareceres[0] || null;
          
          return {
            ...recurso,
            parecer: parecer ? {
              parecer_tecnico: parecer.parecer_tecnico,
              recomendacao: parecer.recomendacao,
              valor_recomendado: parecer.valor_recomendado,
              justificativa_tecnica: parecer.justificativa_tecnica,
              data_emissao: parecer.data_emissao || parecer.created_at
            } : null
          };
        })
      );

      return res.json({
        success: true,
        data: recursosComPareceres
      });

    } catch (error) {
      console.error('Erro ao buscar histórico por carteira:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar histórico do paciente',
        error: (error as any).message
      });
    }
  }
}

export default new AuditorController();
