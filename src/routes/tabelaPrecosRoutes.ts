import { Router } from 'express';
import { TabelaPrecosController } from '../controllers/tabelaPrecosController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação de clínica
router.use(authenticateToken);

/**
 * GET /api/tabelas-precos
 * Buscar tabelas de preços com filtros opcionais
 * Query params: codigo, descricao, tabela, principioAtivo
 */
router.get('/', TabelaPrecosController.getTabelas);

/**
 * GET /api/tabelas-precos/operadoras
 * Buscar lista de operadoras disponíveis
 */
router.get('/operadoras', TabelaPrecosController.getOperadoras);

/**
 * GET /api/tabelas-precos/codigo/:codigo
 * Buscar detalhes de um código específico
 */
router.get('/codigo/:codigo', TabelaPrecosController.getDetalheCodigo);

export default router;
