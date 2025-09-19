// src/routes/protocoloRoutes.ts

import { Router } from 'express';
import { ProtocoloController } from '../controllers/protocoloController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rotas CRUD básicas
router.post('/', authenticateToken, ProtocoloController.create);                    // Criar protocolo
router.get('/', authenticateToken, ProtocoloController.index);                      // Listar todos os protocolos
router.get('/:id', authenticateToken, ProtocoloController.show);                    // Buscar protocolo por ID
router.put('/:id', authenticateToken, ProtocoloController.update);                  // Atualizar protocolo
router.delete('/:id', authenticateToken, ProtocoloController.destroy);              // Deletar protocolo

// Rotas específicas
router.get('/clinica/:clinicaId', authenticateToken, ProtocoloController.getByClinica);  // Buscar por clínica
router.get('/status/:status', authenticateToken, ProtocoloController.getByStatus);       // Buscar por status
router.get('/cid/:cid', authenticateToken, ProtocoloController.getByCID);                // Buscar por CID

export default router; 