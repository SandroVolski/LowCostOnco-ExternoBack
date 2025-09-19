import { Router } from 'express';
import { PacienteController } from '../controllers/pacienteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas as rotas mobile exigem auth
router.use(authenticateToken);

// Pacientes por médico
router.get('/pacientes/medico/:medicoId', PacienteController.getByMedico);

export default router;
