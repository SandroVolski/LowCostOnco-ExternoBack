import { Router } from 'express';
import { PacienteController } from '../controllers/pacienteController';

const router = Router();

// Rotas para pacientes
router.get('/', PacienteController.index);                    // GET /api/pacientes
router.get('/:id', PacienteController.show);                  // GET /api/pacientes/:id
router.get('/clinica/:clinicaId', PacienteController.getByClinica); // GET /api/pacientes/clinica/:clinicaId
router.post('/', PacienteController.store);                   // POST /api/pacientes
router.put('/:id', PacienteController.update);                // PUT /api/pacientes/:id
router.delete('/:id', PacienteController.destroy);            // DELETE /api/pacientes/:id

export default router;