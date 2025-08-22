import { query } from '../config/database';

const EXTERNAL_DB = process.env.EXT_DB_NAME || process.env.SERVICO_DB_NAME || 'bd_servico';

export interface PrincipioAtivoRow {
	PrincipioAtivo: string;
}

export interface Cid10Row {
	codigo: string;
	descricao: string;
}

export class CatalogModel {
	static async getPrincipiosAtivos(params: { search?: string; limit?: number; offset?: number } = {}): Promise<{ data: string[]; total: number }> {
		const { search = '', limit = 50, offset = 0 } = params;
		const safeLimit = Math.max(1, Math.min(200, Math.floor(Number(limit))));
		const safeOffset = Math.max(0, Math.floor(Number(offset)));

		// Total (COUNT DISTINCT)
		let countSql = `SELECT COUNT(DISTINCT PrincipioAtivo) AS total FROM ${EXTERNAL_DB}.dPrincipioativo`;
		const countParams: any[] = [];
		if (search && search.trim() !== '') {
			countSql += ` WHERE PrincipioAtivo LIKE ?`;
			countParams.push(`%${search}%`);
		}
		const countResult = await query(countSql, countParams);
		const total: number = countResult?.[0]?.total ?? 0;

		// Dados paginados
		let dataSql = `SELECT DISTINCT PrincipioAtivo FROM ${EXTERNAL_DB}.dPrincipioativo`;
		const dataParams: any[] = [];
		if (search && search.trim() !== '') {
			dataSql += ` WHERE PrincipioAtivo LIKE ?`;
			dataParams.push(`%${search}%`);
		}
		dataSql += ` ORDER BY PrincipioAtivo ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
		const rows: PrincipioAtivoRow[] = await query(dataSql, dataParams);
		const data = rows.map(r => r.PrincipioAtivo).filter(Boolean);
		return { data, total };
	}

	static async getCid10Subcategorias(params: { search?: string; limit?: number; offset?: number } = {}): Promise<{ data: Cid10Row[]; total: number }> {
		const { search = '', limit = 50, offset = 0 } = params;
		const safeLimit = Math.max(1, Math.min(200, Math.floor(Number(limit))));
		const safeOffset = Math.max(0, Math.floor(Number(offset)));

		// Total
		let countSql = `SELECT COUNT(*) AS total FROM ${EXTERNAL_DB}.bd_cid10_subcategoria`;
		const countParams: any[] = [];
		if (search && search.trim() !== '') {
			countSql += ` WHERE SUBCAT LIKE ? OR DESCRICAO LIKE ?`;
			countParams.push(`%${search}%`, `%${search}%`);
		}
		const countResult = await query(countSql, countParams);
		const total: number = countResult?.[0]?.total ?? 0;

		// Dados paginados
		let dataSql = `SELECT SUBCAT as codigo, DESCRICAO as descricao FROM ${EXTERNAL_DB}.bd_cid10_subcategoria`;
		const dataParams: any[] = [];
		if (search && search.trim() !== '') {
			dataSql += ` WHERE SUBCAT LIKE ? OR DESCRICAO LIKE ?`;
			dataParams.push(`%${search}%`, `%${search}%`);
		}
		dataSql += ` ORDER BY codigo ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
		const rows: Cid10Row[] = await query(dataSql, dataParams);
		return { data: rows, total };
	}
} 