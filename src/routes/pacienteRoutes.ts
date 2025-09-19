import { Router } from 'express';
import { PacienteController } from '../controllers/pacienteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rotas para pacientes
router.get('/', authenticateToken, PacienteController.index);                    // GET /api/pacientes
router.get('/clinica/:clinicaId', authenticateToken, PacienteController.getByClinica); // GET /api/pacientes/clinica/:clinicaId
router.get('/:id', authenticateToken, PacienteController.show);                  // GET /api/pacientes/:id
router.post('/', authenticateToken, PacienteController.store);                   // POST /api/pacientes
router.put('/:id', authenticateToken, PacienteController.update);                // PUT /api/pacientes/:id
router.delete('/:id', authenticateToken, PacienteController.destroy);            // DELETE /api/pacientes/:id

export default router;