import { Request, Response } from 'express';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/recursos-glosas');

    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar apenas PDF, imagens e documentos
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

class RecursosGlosaController {
  // Criar novo recurso de glosa
  async criar(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { guia_id, lote_id, clinica_id, justificativa, motivos_glosa } = req.body;
      const files = req.files as Express.Multer.File[];

      // Log para debug
      console.log('📥 Dados recebidos no backend:', {
        guia_id,
        lote_id,
        clinica_id,
        justificativa: justificativa ? justificativa.substring(0, 50) + '...' : null,
        motivos_glosa,
        files_count: files ? files.length : 0,
        body_keys: Object.keys(req.body)
      });

      // Validações
      if (!guia_id || !lote_id || !clinica_id || !justificativa) {
        console.error('❌ Campos obrigatórios ausentes:', {
          guia_id: !!guia_id,
          lote_id: !!lote_id,
          clinica_id: !!clinica_id,
          justificativa: !!justificativa
        });
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios não preenchidos',
          missing: {
            guia_id: !guia_id,
            lote_id: !lote_id,
            clinica_id: !clinica_id,
            justificativa: !justificativa
          }
        });
      }

      // Buscar operadora_registro_ans do lote
      const [lotes] = await connection.execute<RowDataPacket[]>(
        'SELECT operadora_registro_ans FROM financeiro_lotes WHERE id = ?',
        [lote_id]
      );

      if (!lotes || lotes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Lote não encontrado'
        });
      }

      const operadora_registro_ans = lotes[0].operadora_registro_ans;

      if (!operadora_registro_ans) {
        return res.status(400).json({
          success: false,
          message: 'Lote não possui operadora associada'
        });
      }

      // Buscar valor_guia da guia
      const [guias] = await connection.execute<RowDataPacket[]>(
        'SELECT valor_total FROM financeiro_items WHERE id = ?',
        [guia_id]
      );

      if (!guias || guias.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Guia não encontrada'
        });
      }

      const valor_guia = guias[0].valor_total || 0;

      // 1. Inserir recurso de glosa
      const [resultRecurso] = await connection.execute<ResultSetHeader>(
        `INSERT INTO recursos_glosas
         (guia_id, lote_id, clinica_id, operadora_registro_ans, justificativa, motivos_glosa, valor_guia, status_recurso, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', NOW())`,
        [
          guia_id,
          lote_id,
          clinica_id,
          operadora_registro_ans,
          justificativa,
          motivos_glosa ? JSON.stringify(JSON.parse(motivos_glosa)) : null,
          valor_guia
        ]
      );

      const recursoId = resultRecurso.insertId;

      // 2. Inserir histórico inicial
      await connection.execute(
        `INSERT INTO recursos_glosas_historico
         (recurso_glosa_id, acao, status_novo, realizado_por, descricao, created_at)
         VALUES (?, 'recurso_criado', 'pendente', 'clinica', 'Recurso de glosa criado e aguardando análise da operadora', NOW())`,
        [recursoId]
      );

      // 3. Salvar documentos se houver
      if (files && files.length > 0) {
        for (const file of files) {
          await connection.execute(
            `INSERT INTO recursos_glosas_documentos
             (recurso_glosa_id, tipo_documento, caminho_arquivo, nome_original, tamanho_arquivo, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              recursoId,
              file.mimetype,
              file.path,
              file.originalname,
              file.size
            ]
          );
        }
      }

      // 4. Atualizar status da guia para glosado
      await connection.execute(
        `UPDATE financeiro_items
         SET status_pagamento = 'glosado'
         WHERE id = ?`,
        [guia_id]
      );

      await connection.commit();

      // Buscar o recurso completo com histórico e documentos para retornar
      const [recursoCompleto] = await connection.execute(
        `SELECT * FROM recursos_glosas WHERE id = ?`,
        [recursoId]
      ) as any;

      const [historico] = await connection.execute(
        `SELECT acao, status_novo as status, created_at as data, descricao, realizado_por
         FROM recursos_glosas_historico
         WHERE recurso_glosa_id = ?
         ORDER BY created_at ASC`,
        [recursoId]
      ) as any;

      const [documentos] = await connection.execute(
        `SELECT id, tipo_documento, nome_original, tamanho_arquivo, created_at
         FROM recursos_glosas_documentos WHERE recurso_glosa_id = ?`,
        [recursoId]
      ) as any;

      const recursoRetorno = {
        ...recursoCompleto[0],
        status: recursoCompleto[0].status_recurso,
        historico: historico,
        documentos: documentos
      };

      console.log('✅ Recurso criado com sucesso:', recursoId);

      res.json({
        success: true,
        message: 'Recurso de glosa criado com sucesso',
        data: recursoRetorno
      });

    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao criar recurso de glosa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar recurso de glosa',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Listar recursos de uma clínica
  async listarPorClinica(req: Request, res: Response) {
    try {
      const { clinicaId } = req.params;

      const [recursos] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM vw_recursos_glosas_completo
         WHERE clinica_id = ?
         ORDER BY created_at DESC`,
        [clinicaId]
      );

      res.json({
        success: true,
        data: recursos
      });

    } catch (error: any) {
      console.error('Erro ao listar recursos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar recursos de glosa',
        error: error.message
      });
    }
  }

  // Buscar recurso por guia
  async buscarPorGuia(req: Request, res: Response) {
    try {
      const { guiaId } = req.params;

      const [recursos] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM vw_recursos_glosas_completo
         WHERE guia_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [guiaId]
      );

      if (recursos.length === 0) {
        return res.json({
          success: true,
          data: null
        });
      }

      const recurso = recursos[0];

      // Buscar documentos
      const [documentos] = await pool.execute<RowDataPacket[]>(
        `SELECT id, tipo_documento, nome_original, tamanho_arquivo, created_at
         FROM recursos_glosas_documentos
         WHERE recurso_glosa_id = ?`,
        [recurso.id]
      );

      // Buscar histórico
      const [historico] = await pool.execute<RowDataPacket[]>(
        `SELECT acao, status_novo as status, created_at AS data, descricao, realizado_por
         FROM recursos_glosas_historico
         WHERE recurso_glosa_id = ?
         ORDER BY created_at ASC`,
        [recurso.id]
      );

      res.json({
        success: true,
        data: {
          ...recurso,
          status: recurso.status_recurso,
          documentos,
          historico
        }
      });

    } catch (error: any) {
      console.error('Erro ao buscar recurso:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar recurso',
        error: error.message
      });
    }
  }

  // Buscar recurso por ID
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [recursos] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM vw_recursos_glosas_completo
         WHERE id = ?`,
        [id]
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
        `SELECT id, tipo_documento, nome_original, tamanho_arquivo, created_at
         FROM recursos_glosas_documentos
         WHERE recurso_glosa_id = ?`,
        [recurso.id]
      );

      // Buscar histórico
      const [historico] = await pool.execute<RowDataPacket[]>(
        `SELECT acao, status_novo as status, created_at AS data, descricao, realizado_por
         FROM recursos_glosas_historico
         WHERE recurso_glosa_id = ?
         ORDER BY created_at ASC`,
        [recurso.id]
      );

      res.json({
        success: true,
        data: {
          ...recurso,
          status: recurso.status_recurso,
          documentos,
          historico
        }
      });

    } catch (error: any) {
      console.error('Erro ao buscar recurso:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar recurso',
        error: error.message
      });
    }
  }

  // Atualizar status do recurso (para operadoras)
  async atualizarStatus(req: Request, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { status, observacao } = req.body;

      if (!['pendente', 'em_analise', 'deferido', 'indeferido'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status inválido'
        });
      }

      // Atualizar status do recurso
      await connection.execute(
        `UPDATE recursos_glosas
         SET status_recurso = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, id]
      );

      // Buscar status anterior
      const [recursoAtual] = await connection.execute<RowDataPacket[]>(
        `SELECT status_recurso FROM recursos_glosas WHERE id = ?`,
        [id]
      );
      const statusAnterior = recursoAtual.length > 0 ? recursoAtual[0].status_recurso : null;

      // Inserir no histórico
      await connection.execute(
        `INSERT INTO recursos_glosas_historico
         (recurso_glosa_id, acao, status_anterior, status_novo, realizado_por, descricao, created_at)
         VALUES (?, 'status_alterado', ?, ?, 'operadora', ?, NOW())`,
        [id, statusAnterior, status, observacao || `Status alterado para ${status}`]
      );

      // Se deferido, atualizar status da guia para pago
      if (status === 'deferido') {
        const [recurso] = await connection.execute<RowDataPacket[]>(
          `SELECT guia_id FROM recursos_glosas WHERE id = ?`,
          [id]
        );

        if (recurso.length > 0) {
          await connection.execute(
            `UPDATE financeiro_items
             SET status_pagamento = 'pago'
             WHERE id = ?`,
            [recurso[0].guia_id]
          );
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Status atualizado com sucesso'
      });

    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

export default new RecursosGlosaController();
