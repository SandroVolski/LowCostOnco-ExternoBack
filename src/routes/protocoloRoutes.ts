// src/routes/protocoloRoutes.ts

import { Router } from 'express';
import { ProtocoloController } from '../controllers/protocoloController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Rotas CRUD básicas (apenas clínicas e admin)
router.post('/', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.create);                    // Criar protocolo
router.get('/', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.index);                      // Listar todos os protocolos
router.get('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.show);                    // Buscar protocolo por ID
router.put('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.update);                  // Atualizar protocolo
router.delete('/:id', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.destroy);              // Deletar protocolo

// Rotas específicas (apenas clínicas e admin)
router.get('/clinica/:clinicaId', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.getByClinica);  // Buscar por clínica
router.get('/status/:status', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.getByStatus);       // Buscar por status
router.get('/cid/:cid', authenticateToken, requireRole(['clinica', 'admin', 'operadora_admin', 'operadora_user']), ProtocoloController.getByCID);                // Buscar por CID

export default router; 