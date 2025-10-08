import { Request, Response } from 'express';
import { CatalogModel } from '../models/Catalog';

export class CatalogController {
  static async principiosAtivos(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Buscando princípios ativos...');
      const search = (req.query.search as string) || '';
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      console.log(`   Search: "${search}", Limit: ${limit}, Offset: ${offset}`);
      
      const result = await CatalogModel.getPrincipiosAtivos({ search, limit, offset });
      console.log(`✅ Princípios ativos encontrados: ${result.total} total, ${result.data.length} nesta página`);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('❌ Erro ao listar princípios ativos:', error);
      console.error('   Mensagem:', error instanceof Error ? error.message : 'Erro desconhecido');
      console.error('   Código:', (error as any)?.code);
      console.error('   SQL:', (error as any)?.sql);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar princípios ativos', 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        code: (error as any)?.code,
        sqlMessage: (error as any)?.sqlMessage
      });
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