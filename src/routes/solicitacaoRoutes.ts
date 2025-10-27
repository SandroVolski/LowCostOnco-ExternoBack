// src/routes/solicitacaoRoutes.ts

import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { SolicitacaoController } from '../controllers/solicitacaoController';

const router = Router();

// Rotas para solicitações de autorização (apenas clínicas e admin)
router.post('/', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.create);                                    // POST /api/solicitacoes
router.get('/', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.index);                                      // GET /api/solicitacoes
router.get('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.show);                                    // GET /api/solicitacoes/:id
router.get('/:id/pdf', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.generatePDF);                         // GET /api/solicitacoes/:id/pdf - NOVA ROTA
router.get('/clinica/:clinicaId', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.getByClinica);             // GET /api/solicitacoes/clinica/:clinicaId
router.put('/:id/status', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.updateStatus);                     // PUT /api/solicitacoes/:id/status
// Alias de compatibilidade com o frontend da operadora
router.put('/:id/aprovar', authenticateToken, requireRole(['operadora_admin', 'operadora_user', 'admin']), (req, res) => {
  // Forçar status "aprovada" e delegar para o mesmo controlador
  req.body = { ...(req.body || {}), status: 'aprovada' };
  return (SolicitacaoController.updateStatus as any)(req, res);
});
router.put('/:id/rejeitar', authenticateToken, requireRole(['operadora_admin', 'operadora_user', 'admin']), (req, res) => {
  // Forçar status "rejeitada" e delegar para o mesmo controlador
  req.body = { ...(req.body || {}), status: 'rejeitada' };
  return (SolicitacaoController.updateStatus as any)(req, res);
});
router.delete('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.destroy);                              // DELETE /api/solicitacoes/:id
router.get('/status/:status', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), SolicitacaoController.getByStatus);                  // GET /api/solicitacoes/status/:status

export default router;