import { Router } from 'express';
import { PacienteController } from '../controllers/pacienteController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Rotas para pacientes (apenas clínicas e admin)
router.get('/', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), PacienteController.index);                    // GET /api/pacientes
router.get('/clinica/:clinicaId', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), PacienteController.getByClinica); // GET /api/pacientes/clinica/:clinicaId
router.get('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), PacienteController.show);                  // GET /api/pacientes/:id
router.post('/', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), PacienteController.store);                   // POST /api/pacientes
router.put('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), PacienteController.update);                // PUT /api/pacientes/:id
router.delete('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), PacienteController.destroy);            // DELETE /api/pacientes/:id

export default router;