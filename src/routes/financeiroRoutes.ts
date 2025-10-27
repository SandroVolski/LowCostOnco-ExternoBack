import express from 'express';
import multer from 'multer';
import path from 'path';
import { FinanceiroController } from '../controllers/financeiroController';

const router = express.Router();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/financeiro/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Validação mais flexível para arquivos XML
  const isValidXML = 
    file.originalname.toLowerCase().endsWith('.xml') || 
    file.mimetype === 'text/xml' || 
    file.mimetype === 'application/xml' ||
    file.mimetype === 'application/xml; charset=utf-8' ||
    file.mimetype === 'application/xml; charset=ISO-8859-1' ||
    file.mimetype === 'text/plain' && file.originalname.toLowerCase().endsWith('.xml') ||
    file.mimetype === ''; // Alguns navegadores não detectam o MIME type corretamente

  if (isValidXML) {
    console.log(`✅ Arquivo XML aceito: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  } else {
    console.log(`❌ Arquivo rejeitado: ${file.originalname} (${file.mimetype})`);
    cb(new Error('Apenas arquivos XML são permitidos'));
  }
};

const uploadXML = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadDocumentos = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/financeiro/documentos/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB por arquivo
});

// ==================== ROTAS ====================

/**
 * POST /api/financeiro/upload-xml
 * Upload e processamento de arquivo XML TISS
 */
router.post('/upload-xml', uploadXML.single('xml'), FinanceiroController.uploadXML);

/**
 * GET /api/financeiro/lotes
 * Listar todos os lotes de uma clínica
 * Query params: clinica_id
 */
router.get('/lotes', FinanceiroController.getLotes);

/**
 * GET /api/financeiro/lotes/:id
 * Buscar lote específico por ID
 */
router.get('/lotes/:id', FinanceiroController.getLoteById);

/**
 * GET /api/financeiro/lotes/:id/guias
 * Listar guias de um lote específico
 */
router.get('/lotes/:id/guias', FinanceiroController.getGuiasPorLote);

// TESTE - Buscar todos os itens de um lote
router.get('/lotes/:id/itens', FinanceiroController.getAllItemsPorLote);

/**
 * GET /api/financeiro/guias/:id/procedimentos
 * Listar procedimentos de uma guia específica
 */
router.get('/guias/:id/procedimentos', FinanceiroController.getProcedimentosPorGuia);

/**
 * GET /api/financeiro/guias/:id/despesas
 * Listar despesas de uma guia específica
 */
router.get('/guias/:id/despesas', FinanceiroController.getDespesasPorGuia);

/**
 * GET /api/financeiro/guias/:id/documentos
 * Listar documentos anexados a uma guia
 */
router.get('/guias/:id/documentos', FinanceiroController.getDocumentosPorGuia);

/**
 * GET /api/financeiro/guias/:id/historico
 * Listar histórico de alterações de uma guia
 */
router.get('/guias/:id/historico', FinanceiroController.getHistoricoPorGuia);

/**
 * PATCH /api/financeiro/lotes/:id/status
 * Atualizar status de um lote
 * Body: { status: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago' }
 */
router.patch('/lotes/:id/status', FinanceiroController.updateLoteStatus);

/**
 * GET /api/financeiro/lotes/competencia/:competencia
 * Buscar lotes por competência (formato: YYYY-MM)
 * Query params: clinica_id
 */
router.get('/lotes/competencia/:competencia', FinanceiroController.getLotesPorCompetencia);

/**
 * GET /api/financeiro/lotes/operadora/:registro_ans
 * Buscar lotes por operadora (registro ANS)
 * Query params: clinica_id
 */
router.get('/lotes/operadora/:registro_ans', FinanceiroController.getLotesPorOperadora);

/**
 * GET /api/financeiro/guias/:id
 * Buscar guia específica por ID
 */
router.get('/guias/:id', FinanceiroController.getGuiaById);

/**
 * PATCH /api/financeiro/guias/:id/status
 * Atualizar status de uma guia
 * Body: { status_pagamento: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago' }
 */
router.patch('/guias/:id/status', FinanceiroController.updateGuiaStatus);

/**
 * POST /api/financeiro/guias/anexar-documentos
 * Anexar documentos a uma guia
 * Form data: guia_id, documentos (multiple files)
 */
router.post('/guias/anexar-documentos', uploadDocumentos.array('documentos', 10), FinanceiroController.anexarDocumentos);

/**
 * GET /api/financeiro/estatisticas
 * Buscar estatísticas financeiras
 * Query params: clinica_id
 */
router.get('/estatisticas', FinanceiroController.getEstatisticas);

/**
 * POST /api/financeiro/guias
 * Criar nova guia manualmente
 * Body: { lote_id, clinica_id, numero_guia_prestador, ... }
 */
router.post('/guias', FinanceiroController.createGuia);

/**
 * POST /api/financeiro/procedimentos
 * Criar novo procedimento
 * Body: { guia_id, lote_id, clinica_id, codigo_procedimento, ... }
 */
router.post('/procedimentos', FinanceiroController.createProcedimento);

/**
 * POST /api/financeiro/despesas
 * Criar nova despesa
 * Body: { guia_id, lote_id, clinica_id, codigo_item, ... }
 */
router.post('/despesas', FinanceiroController.createDespesa);

/**
 * GET /api/financeiro/lotes/:id/xml
 * Visualizar/Baixar XML de um lote
 */
router.get('/lotes/:id/xml', FinanceiroController.downloadXML);

export default router;

