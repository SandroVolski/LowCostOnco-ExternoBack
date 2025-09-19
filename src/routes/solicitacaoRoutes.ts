// src/routes/solicitacaoRoutes.ts

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { SolicitacaoController } from '../controllers/solicitacaoController';

const router = Router();

// Rotas para solicitações de autorização
router.post('/', authenticateToken, SolicitacaoController.create);                                    // POST /api/solicitacoes
router.get('/', authenticateToken, SolicitacaoController.index);                                      // GET /api/solicitacoes
router.get('/:id', authenticateToken, SolicitacaoController.show);                                    // GET /api/solicitacoes/:id
router.get('/:id/pdf', authenticateToken, SolicitacaoController.generatePDF);                         // GET /api/solicitacoes/:id/pdf - NOVA ROTA
router.get('/clinica/:clinicaId', authenticateToken, SolicitacaoController.getByClinica);             // GET /api/solicitacoes/clinica/:clinicaId
router.put('/:id/status', authenticateToken, SolicitacaoController.updateStatus);                     // PUT /api/solicitacoes/:id/status
router.delete('/:id', authenticateToken, SolicitacaoController.destroy);                              // DELETE /api/solicitacoes/:id
router.get('/status/:status', authenticateToken, SolicitacaoController.getByStatus);                  // GET /api/solicitacoes/status/:status

export default router;