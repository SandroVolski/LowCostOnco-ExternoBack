// src/routes/clinicaRoutes.ts

import { Router } from 'express';
import { ClinicaController } from '../controllers/clinicaController';
import { optionalAuth, authenticateToken } from '../middleware/auth';

const router = Router();

// Rotas públicas (não requerem autenticação)
router.post('/register', ClinicaController.register);              // POST /api/clinicas/register
router.post('/login', ClinicaController.login);                    // POST /api/clinicas/login

// Rotas protegidas (requerem autenticação ou são opcionais para desenvolvimento)
router.get('/profile', authenticateToken, ClinicaController.getProfile);           // GET /api/clinicas/profile
router.put('/profile', authenticateToken, ClinicaController.updateProfile);        // PUT /api/clinicas/profile
router.get('/por-operadora', authenticateToken, ClinicaController.getClinicasPorOperadora); // GET /api/clinicas/por-operadora

// Rotas para responsáveis técnicos
router.post('/responsaveis', authenticateToken, ClinicaController.addResponsavel);       // POST /api/clinicas/responsaveis
router.put('/responsaveis/:id', authenticateToken, ClinicaController.updateResponsavel); // PUT /api/clinicas/responsaveis/:id
router.delete('/responsaveis/:id', authenticateToken, ClinicaController.removeResponsavel); // DELETE /api/clinicas/responsaveis/:id

// 🆕 ROTAS ADMINISTRATIVAS PARA CRUD COMPLETO
// Listar todas as clínicas (para administradores)
router.get('/admin', ClinicaController.getAllClinicas);           // GET /api/clinicas/admin
// Buscar clínica por ID (para administradores)
router.get('/admin/:id', ClinicaController.getClinicaById);       // GET /api/clinicas/admin/:id
// Criar nova clínica (para administradores)
router.post('/admin', ClinicaController.createClinica);           // POST /api/clinicas/admin
// Atualizar clínica (para administradores)
router.put('/admin/:id', ClinicaController.updateClinica);        // PUT /api/clinicas/admin/:id
// Deletar clínica (para administradores)
router.delete('/admin/:id', ClinicaController.deleteClinica);     // DELETE /api/clinicas/admin/:id

export default router;