import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController';

const router = Router();

router.get('/principios-ativos', CatalogController.principiosAtivos);
router.get('/cid10', CatalogController.cid10);

export default router; 