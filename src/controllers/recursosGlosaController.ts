import { Request, Response } from 'express';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

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

      const { guia_id, lote_id, clinica_id, justificativa, motivos_glosa, itens_glosados } = req.body;
      const files = req.files as Express.Multer.File[];

      // Parse itens_glosados se vier como string
      let itensGlosadosArray = [];
      if (itens_glosados) {
        try {
          itensGlosadosArray = typeof itens_glosados === 'string' 
            ? JSON.parse(itens_glosados) 
            : itens_glosados;
        } catch (e) {
          console.error('Erro ao parsear itens_glosados:', e);
        }
      }

      // Log para debug
      console.log('📥 Dados recebidos no backend:', {
        guia_id,
        lote_id,
        clinica_id,
        justificativa: justificativa ? justificativa.substring(0, 50) + '...' : null,
        motivos_glosa,
        itens_glosados_count: itensGlosadosArray.length,
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

      // Log detalhado do lote_id
      console.log('🔍 Tentando buscar lote com ID:', lote_id, 'tipo:', typeof lote_id);

      // Buscar operadora_registro_ans do lote
      const [lotes] = await connection.execute<RowDataPacket[]>(
        'SELECT id, numero_lote, operadora_registro_ans FROM financeiro_lotes WHERE id = ?',
        [lote_id]
      );

      console.log('📦 Lotes encontrados:', lotes.length, lotes);

      if (!lotes || lotes.length === 0) {
        // Log de todos os lotes disponíveis
        const [todosLotes] = await connection.execute<RowDataPacket[]>(
          'SELECT id, numero_lote FROM financeiro_lotes ORDER BY id DESC LIMIT 10'
        );
        console.error('❌ Lote não encontrado. Lotes disponíveis:', todosLotes);
        
        return res.status(404).json({
          success: false,
          message: 'Lote não encontrado',
          lote_id_recebido: lote_id,
          lotes_disponiveis: todosLotes.map(l => ({ id: l.id, numero: l.numero_lote }))
        });
      }

      const operadora_registro_ans = lotes[0].operadora_registro_ans;

      if (!operadora_registro_ans) {
        return res.status(400).json({
          success: false,
          message: 'Lote não possui operadora associada'
        });
      }

      // Calcular valor_guia
      let valor_guia = 0;
      
      if (itensGlosadosArray.length > 0) {
        // Se há itens específicos glosados, usar a soma deles
        valor_guia = itensGlosadosArray.reduce((sum: number, item: any) => {
          return sum + (Number(item.valor_total) || 0);
        }, 0);
      } else {
        // Se não há itens específicos, usar o valor total da guia
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

        valor_guia = guias[0].valor_total || 0;
      }

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

      // 3. Salvar itens glosados específicos e atualizar status no banco
      if (itensGlosadosArray.length > 0) {
        for (const item of itensGlosadosArray) {
          // Salvar o item glosado
          await connection.execute(
            `INSERT INTO recursos_glosas_itens
             (recurso_glosa_id, item_id, tipo_item, codigo_item, descricao_item, quantidade, valor_unitario, valor_total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              recursoId,
              item.id || '',
              item.tipo || 'procedimento',
              item.codigo || '',
              item.descricao || '',
              item.quantidade || 1,
              (Number(item.valor_total) || 0) / (Number(item.quantidade) || 1), // valor_unitario
              Number(item.valor_total) || 0
            ]
          );

          // Atualizar o status do item específico no financeiro_items
          // Procurar o item no banco pelo codigo_item e guia_id
          console.log('🔍 Buscando item para atualizar status:', {
            parent_id: guia_id,
            codigo_item: item.codigo,
            item_completo: item
          });

          const [itemsBanco] = await connection.execute<RowDataPacket[]>(
            `SELECT id, codigo_item, descricao_item, tipo_item, status_pagamento 
             FROM financeiro_items 
             WHERE parent_id = ? 
             AND codigo_item = ? 
             AND tipo_item != 'guia'
             LIMIT 1`,
            [guia_id, item.codigo || '']
          );

          console.log('📦 Items encontrados no banco:', itemsBanco);

          if (itemsBanco.length > 0) {
            await connection.execute(
              `UPDATE financeiro_items 
               SET status_pagamento = 'glosado' 
               WHERE id = ?`,
              [itemsBanco[0].id]
            );
            console.log(`✅ Item ${itemsBanco[0].id} (${itemsBanco[0].codigo_item}) marcado como glosado (antes: ${itemsBanco[0].status_pagamento})`);
            
            // Verificar se foi atualizado
            const [verificacao] = await connection.execute<RowDataPacket[]>(
              'SELECT status_pagamento FROM financeiro_items WHERE id = ?',
              [itemsBanco[0].id]
            );
            console.log(`✔️ Verificação após UPDATE - status_pagamento: ${verificacao[0]?.status_pagamento}`);
          } else {
            console.warn(`⚠️ Nenhum item encontrado no banco com parent_id=${guia_id} e codigo_item=${item.codigo}`);
          }
        }
      }

      // 4. Salvar documentos se houver
      if (files && files.length > 0) {
        for (const file of files) {
          await connection.execute(
            `INSERT INTO recursos_glosas_documentos
             (recurso_glosa_id, tipo_documento, nome_arquivo, caminho_arquivo, nome_original, tamanho_arquivo, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              recursoId,
              file.mimetype,
              file.filename,
              file.path,
              file.originalname,
              file.size
            ]
          );
        }
      }

      // Nota: Não marcar a guia inteira como glosada, apenas os itens específicos

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

      const [itensGlosados] = await connection.execute(
        `SELECT * FROM recursos_glosas_itens WHERE recurso_glosa_id = ?`,
        [recursoId]
      ) as any;

      const recursoRetorno = {
        ...recursoCompleto[0],
        status: recursoCompleto[0].status_recurso,
        historico: historico,
        documentos: documentos,
        itens_glosados: itensGlosados
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

      // Buscar itens glosados
      const [itensGlosados] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM recursos_glosas_itens WHERE recurso_glosa_id = ?`,
        [recurso.id]
      );

      res.json({
        success: true,
        data: {
          ...recurso,
          status: recurso.status_recurso,
          documentos,
          historico,
          itens_glosados: itensGlosados
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

      // Buscar itens glosados
      const [itensGlosados2] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM recursos_glosas_itens WHERE recurso_glosa_id = ?`,
        [recurso.id]
      );

      res.json({
        success: true,
        data: {
          ...recurso,
          status: recurso.status_recurso,
          documentos,
          historico,
          itens_glosados: itensGlosados2
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

  // Baixar/Visualizar documento anexado
  async downloadDocumento(req: Request, res: Response) {
    try {
      const { documentoId } = req.params;

      console.log('📥 Solicitação de download do documento:', documentoId);

      // Buscar informações do documento no banco
      const [documentos] = await pool.execute<RowDataPacket[]>(
        `SELECT id, nome_arquivo, nome_original, tipo_documento, caminho_arquivo 
         FROM recursos_glosas_documentos 
         WHERE id = ?`,
        [documentoId]
      );

      if (documentos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
      }

      const documento = documentos[0];

      // Construir caminho do arquivo com fallback para caminho absoluto no banco
      let filePath = '';

      if (documento.nome_arquivo) {
        filePath = path.join(__dirname, '../../uploads/recursos-glosas', documento.nome_arquivo);
      }

      // Se não encontrou por nome_arquivo, tentar usar o caminho_arquivo salvo
      if (!filePath || !fs.existsSync(filePath)) {
        if (documento.caminho_arquivo) {
          // Se o caminho no banco for relativo, torná-lo absoluto
          filePath = path.isAbsolute(documento.caminho_arquivo)
            ? documento.caminho_arquivo
            : path.join(__dirname, '../../', documento.caminho_arquivo);
        }
      }

      console.log('📂 Caminho do arquivo resolvido:', filePath);

      // Verificar se o arquivo existe
      if (!filePath || !fs.existsSync(filePath)) {
        console.error('❌ Arquivo não encontrado no sistema de arquivos. nome_arquivo:', documento.nome_arquivo, 'caminho_arquivo:', documento.caminho_arquivo, 'filePathResolvido:', filePath);
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado no servidor',
          detalhes: {
            nome_arquivo: documento.nome_arquivo,
            caminho_arquivo: documento.caminho_arquivo,
            filePathResolvido: filePath
          }
        });
      }

      // Determinar o tipo MIME do arquivo
      const mimeType = mime.lookup(documento.nome_original) || 'application/octet-stream';
      
      console.log('✅ Enviando arquivo:', documento.nome_original, 'tipo:', mimeType);

      // Configurar headers para download/visualização
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome_original}"`);
      
      // Enviar o arquivo
      fs.createReadStream(filePath).pipe(res);

    } catch (error: any) {
      console.error('Erro ao fazer download do documento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer download do documento',
        error: error.message
      });
    }
  }
}

export default new RecursosGlosaController();
