import { Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

interface TabelaPrecoRow extends RowDataPacket {
  Tabela: string;
  Servico_Codigo: string;
  Fator: string;
  Principio_Ativo: string;
  Descricao: string; // alias sem acento
  Pagamento: string;
  Valor: number;
}

export class TabelaPrecosController {
  /**
   * GET /api/tabelas-precos
   * Buscar tabelas de preços com filtros
   */
  static async getTabelas(req: Request, res: Response) {
    try {
      const { codigo, descricao, tabela, principioAtivo } = req.query;

      let query = `
        SELECT
          Tabela,
          Servico_Codigo,
          Fator,
          Principio_Ativo,
          \`Descrição\` AS Descricao,
          Pagamento,
          Valor
        FROM \`bd_lowcostonco\`.\`Tabela_Casacaresc_2025\`
        WHERE 1=1
      `;

      const params: any[] = [];

      if (codigo) {
        query += ` AND Servico_Codigo LIKE ?`;
        params.push(`%${codigo}%`);
      }

      if (descricao) {
        query += ` AND \`Descrição\` LIKE ?`;
        params.push(`%${descricao}%`);
      }

      if (tabela) {
        query += ` AND Tabela = ?`;
        params.push(tabela);
      }

      if (principioAtivo) {
        query += ` AND Principio_Ativo LIKE ?`;
        params.push(`%${principioAtivo}%`);
      }

      query += ` ORDER BY Tabela, Servico_Codigo LIMIT 1000`;

      console.log('🔍 Buscando tabelas de preços com query:', query);
      console.log('📋 Parâmetros:', params);

      const [rows] = await pool.execute<TabelaPrecoRow[]>(query, params);

      console.log(`✅ ${rows.length} registros encontrados`);

      res.json(rows);
    } catch (error: any) {
      console.error('❌ Erro ao buscar tabelas de preços:', error);
      res.status(500).json({
        message: 'Erro ao buscar tabelas de preços',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/tabelas-precos/operadoras
   * Buscar lista de operadoras disponíveis
   */
  static async getOperadoras(req: Request, res: Response) {
    try {
      const query = `
        SELECT DISTINCT Tabela
        FROM \`bd_lowcostonco\`.\`Tabela_Casacaresc_2025\`
        ORDER BY Tabela
      `;

      console.log('🔍 Buscando operadoras disponíveis');

      const [rows] = await pool.execute<RowDataPacket[]>(query);

      const operadoras = rows.map((row) => row.Tabela);

      console.log(`✅ ${operadoras.length} operadoras encontradas:`, operadoras);

      res.json(operadoras);
    } catch (error: any) {
      console.error('❌ Erro ao buscar operadoras:', error);
      res.status(500).json({
        message: 'Erro ao buscar operadoras',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/tabelas-precos/codigo/:codigo
   * Buscar detalhes de um código específico
   */
  static async getDetalheCodigo(req: Request, res: Response) {
    try {
      const { codigo } = req.params;

      const query = `
        SELECT
          Tabela,
          Servico_Codigo,
          Fator,
          Principio_Ativo,
          \`Descrição\` AS Descricao,
          Pagamento,
          Valor
        FROM \`bd_lowcostonco\`.\`Tabela_Casacaresc_2025\`
        WHERE Servico_Codigo = ?
        ORDER BY Tabela
      `;

      console.log(`🔍 Buscando detalhes do código: ${codigo}`);

      const [rows] = await pool.execute<TabelaPrecoRow[]>(query, [codigo]);

      console.log(`✅ ${rows.length} registros encontrados para código ${codigo}`);

      res.json(rows);
    } catch (error: any) {
      console.error('❌ Erro ao buscar detalhes do código:', error);
      res.status(500).json({
        message: 'Erro ao buscar detalhes do código',
        error: error.message,
      });
    }
  }
}
