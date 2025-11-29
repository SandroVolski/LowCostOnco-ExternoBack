import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { checkAdminSecret } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', authenticateToken, requireRole(['admin']), AuthController.register);
router.get('/me', AuthController.me);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/bootstrap-admin', checkAdminSecret, AuthController.bootstrapAdmin);

export default router; 