// src/routes/solicitacaoRoutes.ts

import { Router } from 'express';
import { SolicitacaoController } from '../controllers/solicitacaoController';

const router = Router();

// Rotas para solicitações de autorização
router.post('/', SolicitacaoController.create);                                    // POST /api/solicitacoes
router.get('/:id', SolicitacaoController.show);                                    // GET /api/solicitacoes/:id
router.get('/clinica/:clinicaId', SolicitacaoController.getByClinica);             // GET /api/solicitacoes/clinica/:clinicaId
router.put('/:id/status', SolicitacaoController.updateStatus);                     // PUT /api/solicitacoes/:id/status
router.delete('/:id', SolicitacaoController.destroy);                              // DELETE /api/solicitacoes/:id
router.get('/status/:status', SolicitacaoController.getByStatus);                  // GET /api/solicitacoes/status/:status

export default router;