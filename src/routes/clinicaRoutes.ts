// src/routes/clinicaRoutes.ts

import { Router } from 'express';
import { ClinicaController } from '../controllers/clinicaController';
import { optionalAuth, authenticateToken } from '../middleware/auth';

const router = Router();

// Rotas públicas (não requerem autenticação)
router.post('/register', ClinicaController.register);              // POST /api/clinicas/register
router.post('/login', ClinicaController.login);                    // POST /api/clinicas/login

// Rotas protegidas (requerem autenticação ou são opcionais para desenvolvimento)
router.get('/profile', optionalAuth, ClinicaController.getProfile);           // GET /api/clinicas/profile
router.put('/profile', optionalAuth, ClinicaController.updateProfile);        // PUT /api/clinicas/profile

// Rotas para responsáveis técnicos
router.post('/responsaveis', optionalAuth, ClinicaController.addResponsavel);       // POST /api/clinicas/responsaveis
router.put('/responsaveis/:id', optionalAuth, ClinicaController.updateResponsavel); // PUT /api/clinicas/responsaveis/:id
router.delete('/responsaveis/:id', optionalAuth, ClinicaController.removeResponsavel); // DELETE /api/clinicas/responsaveis/:id

export default router;