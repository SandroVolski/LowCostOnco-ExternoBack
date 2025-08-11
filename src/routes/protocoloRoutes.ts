// src/routes/protocoloRoutes.ts

import { Router } from 'express';
import { ProtocoloController } from '../controllers/protocoloController';

const router = Router();

// Rotas CRUD básicas
router.post('/', ProtocoloController.create);                    // Criar protocolo
router.get('/', ProtocoloController.index);                      // Listar todos os protocolos
router.get('/:id', ProtocoloController.show);                    // Buscar protocolo por ID
router.put('/:id', ProtocoloController.update);                  // Atualizar protocolo
router.delete('/:id', ProtocoloController.destroy);              // Deletar protocolo

// Rotas específicas
router.get('/clinica/:clinicaId', ProtocoloController.getByClinica);  // Buscar por clínica
router.get('/status/:status', ProtocoloController.getByStatus);       // Buscar por status
router.get('/cid/:cid', ProtocoloController.getByCID);                // Buscar por CID

export default router; 