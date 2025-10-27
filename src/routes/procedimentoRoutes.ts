// src/routes/procedimentoRoutes.ts

import { Router } from 'express';
import { ProcedimentoController } from '../controllers/procedimentoController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// ==================== PROCEDIMENTOS ====================

// GET /api/procedimentos?clinica_id=123
// Listar procedimentos de uma clínica
router.get('/', ProcedimentoController.getProcedimentosByClinica);

// GET /api/procedimentos/:id
// Buscar procedimento por ID com suas negociações
router.get('/:id', ProcedimentoController.getProcedimentoById);

// POST /api/procedimentos
// Criar novo procedimento
router.post('/', ProcedimentoController.createProcedimento);

// PUT /api/procedimentos/:id
// Atualizar procedimento
router.put('/:id', ProcedimentoController.updateProcedimento);

// DELETE /api/procedimentos/:id
// Deletar procedimento
router.delete('/:id', ProcedimentoController.deleteProcedimento);

// ==================== NEGOCIAÇÕES ====================

// GET /api/procedimentos/negociacoes?clinica_id=123
// Listar negociações de uma clínica
router.get('/negociacoes/all', ProcedimentoController.getNegociacoesByClinica);

// GET /api/procedimentos/negociacoes/vigentes?clinica_id=123&operadora_id=456
// Buscar negociações vigentes entre clínica e operadora
router.get('/negociacoes/vigentes', ProcedimentoController.getNegociacoesVigentes);

// GET /api/procedimentos/:id/negociacoes
// Listar negociações de um procedimento específico
router.get('/:id/negociacoes', ProcedimentoController.getNegociacoesByProcedimento);

// POST /api/procedimentos/:id/negociacoes
// Criar nova negociação para um procedimento
router.post('/:id/negociacoes', ProcedimentoController.createNegociacao);

// PUT /api/procedimentos/negociacoes/:id
// Atualizar negociação
router.put('/negociacoes/:id', ProcedimentoController.updateNegociacao);

// DELETE /api/procedimentos/negociacoes/:id
// Deletar negociação
router.delete('/negociacoes/:id', ProcedimentoController.deleteNegociacao);

export default router;

