import { Request, Response } from 'express';
import { CatalogModel } from '../models/Catalog';

export class CatalogController {
  static async principiosAtivos(req: Request, res: Response): Promise<void> {
    try {
      const search = (req.query.search as string) || '';
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const result = await CatalogModel.getPrincipiosAtivos({ search, limit, offset });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao listar princípios ativos', error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  }

  static async cid10(req: Request, res: Response): Promise<void> {
    try {
      const search = (req.query.search as string) || '';
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const result = await CatalogModel.getCid10Subcategorias({ search, limit, offset });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao listar CID-10', error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  }
} 