import { Router } from 'express';
import recursosGlosaController, { upload } from '../controllers/recursosGlosaController';

const router = Router();

// Criar novo recurso de glosa (com upload de documentos)
router.post(
  '/recursos-glosas',
  upload.array('documentos', 10), // Máximo 10 arquivos
  recursosGlosaController.criar
);

// Listar recursos de uma clínica
router.get(
  '/recursos-glosas/clinica/:clinicaId',
  recursosGlosaController.listarPorClinica
);

// Buscar recurso por guia
router.get(
  '/recursos-glosas/guia/:guiaId',
  recursosGlosaController.buscarPorGuia
);

// Download/visualizar documento anexado
// IMPORTANTE: Esta rota deve vir ANTES de /recursos-glosas/:id para evitar conflito
router.get(
  '/recursos-glosas/documentos/:documentoId',
  recursosGlosaController.downloadDocumento
);

// Buscar recurso por ID
// IMPORTANTE: Esta rota genérica deve vir DEPOIS das rotas mais específicas
router.get(
  '/recursos-glosas/:id',
  recursosGlosaController.buscarPorId
);

// Atualizar status do recurso
router.patch(
  '/recursos-glosas/:id/status',
  recursosGlosaController.atualizarStatus
);

export default router;
