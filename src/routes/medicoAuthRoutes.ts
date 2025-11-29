import { Router } from 'express';
import { MedicoAuthController } from '../controllers/medicoAuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rotas de autenticação médica (requerem autenticação)
router.post('/send-otp', authenticateToken, MedicoAuthController.sendOTP);
router.post('/validate-otp', authenticateToken, MedicoAuthController.validateOTP);
router.get('/medico-info', authenticateToken, MedicoAuthController.getMedicoInfo);

export default router;

