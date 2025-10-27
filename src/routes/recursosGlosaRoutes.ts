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

// Buscar recurso por ID
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
