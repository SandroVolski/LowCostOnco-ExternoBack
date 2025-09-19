import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import { rateLimit, uploadRateLimit } from '../middleware/rateLimit';
import { query, queryWithLimit } from '../config/database';
import { invalidateCache } from '../middleware/cache';

const router = express.Router();

// Headers: desabilitar cache para desenvolvimento
router.use((req, res, next) => {
	res.set('Cache-Control', 'no-store');
	next();
});

// Autenticação obrigatória e rate limit
router.use(authenticateToken);
router.use(rateLimit());

// Configuração de upload para anexos de ajustes
const uploadsRootDir = path.resolve(__dirname, '..', '..', 'uploads');
const ajustesRootDir = path.join(uploadsRootDir, 'ajustes');
if (!fs.existsSync(ajustesRootDir)) {
	fs.mkdirSync(ajustesRootDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, _file, cb) => {
		const id = String((req.params as any).id || (req.body as any).solicitacao_id || 'misc');
		const dir = path.join(ajustesRootDir, id);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		cb(null, dir);
	},
	filename: (_req, file, cb) => {
		const timestamp = Date.now();
		const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
		cb(null, `${timestamp}_${sanitized}`);
	}
});
const upload = multer({ storage });

// Helper resposta
const send = (res: express.Response, success: boolean, message: string, data: any = null, statusCode = 200) => res.status(statusCode).json({ success, message, data });

// Helpers
const parsePaging = (pageStr?: string, pageSizeStr?: string) => {
	let page = Math.max(1, parseInt(String(pageStr || '1'), 10) || 1);
	let pageSize = Math.max(1, Math.min(100, parseInt(String(pageSizeStr || '20'), 10) || 20));
	const offset = (page - 1) * pageSize;
	return { page, pageSize, offset };
};

const parseSort = (sort?: string) => {
	const defaultSort = { column: 'created_at', direction: 'DESC' as 'ASC' | 'DESC' };
	if (!sort) return defaultSort;
	const parts = String(sort).split(':');
	const col = parts[0];
	const dir = (parts[1] || 'desc').toUpperCase();
	const allowedCols = new Set(['created_at', 'updated_at', 'titulo', 'status', 'prioridade', 'categoria']);
	const column = allowedCols.has(col) ? col : defaultSort.column;
	const direction = dir === 'ASC' ? 'ASC' : 'DESC';
	return { column, direction };
};

// =============================================================
// Listar solicitações (paginado/filtrado)
// GET /api/ajustes/solicitacoes
// =============================================================
interface AuthRequest extends express.Request { user?: { id: number; clinicaId?: number; role?: string } }

router.get('/solicitacoes', async (req: AuthRequest, res) => {
	try {
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		const { status, search, medico, especialidade, prioridade, categoria, page, pageSize, sort, tipo } = req.query as any;
		if (!tokenClinicaId) return send(res, false, 'Clínica não identificada no token', null, 401);
		
		// Validar tipo se fornecido
		if (tipo && !['corpo_clinico', 'negociacao'].includes(tipo)) {
			return send(res, false, 'Tipo inválido. Use tipo=corpo_clinico ou tipo=negociacao', null, 400);
		}
		
		const { page: p, pageSize: ps, offset } = parsePaging(page, pageSize);
		const { column, direction } = parseSort(sort || 'created_at:desc');

		const conditions: string[] = ['clinica_id = ?'];
		const params: any[] = [Number(tokenClinicaId)];
		
		// Filtrar por tipo se especificado
		if (tipo) {
			conditions.push('tipo = ?');
			params.push(String(tipo));
		}
		
		if (status) { conditions.push('status = ?'); params.push(String(status)); }
		
		// Filtros específicos por tipo
		if (tipo === 'corpo_clinico') {
			if (medico) { conditions.push('medico LIKE ?'); params.push(`%${String(medico)}%`); }
			if (especialidade) { conditions.push('especialidade LIKE ?'); params.push(`%${String(especialidade)}%`); }
		} else if (tipo === 'negociacao') {
			if (prioridade) { conditions.push('prioridade = ?'); params.push(String(prioridade)); }
			if (categoria) { conditions.push('categoria = ?'); params.push(String(categoria)); }
		}
		
		if (search) {
			if (tipo === 'corpo_clinico') {
				conditions.push('(titulo LIKE ? OR descricao LIKE ? OR medico LIKE ? OR especialidade LIKE ?)');
				params.push(`%${String(search)}%`, `%${String(search)}%`, `%${String(search)}%`, `%${String(search)}%`);
			} else if (tipo === 'negociacao') {
				conditions.push('(titulo LIKE ? OR descricao LIKE ?)');
				params.push(`%${String(search)}%`, `%${String(search)}%`);
			} else {
				// Busca geral se tipo não especificado
				conditions.push('(titulo LIKE ? OR descricao LIKE ?)');
				params.push(`%${String(search)}%`, `%${String(search)}%`);
			}
		}
		
		const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

		const baseSql = `
			SELECT id, clinica_id, tipo, titulo, descricao, status, medico, especialidade, prioridade, categoria, created_at, updated_at
			FROM ajustes_solicitacoes
			${whereClause}
			ORDER BY ${column} ${direction}
		`;
		const rows: any[] = await queryWithLimit(baseSql, params, ps, offset);
		const countSql = `SELECT COUNT(*) AS total FROM ajustes_solicitacoes ${whereClause}`;
		const countRows: any[] = await query(countSql, params);
		const total = countRows[0]?.total || 0;
		return send(res, true, 'OK', { items: rows, total, page: p, pageSize: ps });
	} catch (error) {
		console.error('Erro ao listar solicitações:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Obter uma solicitação (com anexos e histórico)
// GET /api/ajustes/solicitacoes/:id
// =============================================================
router.get('/solicitacoes/:id', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as any;
		if (!id || isNaN(Number(id))) return send(res, false, 'Parâmetro id inválido', null, 400);
		const sql = `SELECT id, clinica_id, tipo, titulo, descricao, status, medico, especialidade, prioridade, categoria, created_at, updated_at FROM ajustes_solicitacoes WHERE id = ? LIMIT 1`;
		const rows: any[] = await query(sql, [Number(id)]);
		if (!rows || rows.length === 0) return send(res, false, 'Solicitação não encontrada', null, 404);
		const solic = rows[0];
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId || solic.clinica_id !== Number(tokenClinicaId)) return send(res, false, 'Acesso negado', null, 403);
		const anexosSql = `SELECT id, solicitacao_id, arquivo_url, arquivo_nome, arquivo_tamanho, created_at FROM ajustes_anexos WHERE solicitacao_id = ? ORDER BY id DESC`;
		const anexos: any[] = await query(anexosSql, [Number(id)]);
		const histSql = `SELECT id, solicitacao_id, status, comentario, created_at FROM ajustes_historico WHERE solicitacao_id = ? ORDER BY created_at ASC`;
		const historico: any[] = await query(histSql, [Number(id)]);
		return send(res, true, 'OK', { ...solic, anexos, historico });
	} catch (error) {
		console.error('Erro ao obter solicitação:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Criar solicitação (corpo clínico ou negociação)
// POST /api/ajustes/solicitacoes
// =============================================================
router.post('/solicitacoes', async (req: AuthRequest, res) => {
	try {
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		const { tipo, titulo, descricao, medico, especialidade, prioridade, categoria } = req.body as any;
		
		if (!tokenClinicaId) return send(res, false, 'Clínica não identificada no token', null, 401);
		
		if (!tipo || !['corpo_clinico', 'negociacao'].includes(tipo)) {
			return send(res, false, 'tipo deve ser "corpo_clinico" ou "negociacao"', null, 422);
		}
		
		if (!titulo || !descricao) {
			return send(res, false, 'Campos obrigatórios: titulo, descricao', null, 422);
		}
		
		let sql: string = '';
		let params: any[] = [];
		
		if (tipo === 'corpo_clinico') {
			// Validações específicas para corpo clínico
			if (!medico || !especialidade) {
				return send(res, false, 'Para corpo_clinico: medico e especialidade são obrigatórios', null, 422);
			}
			// Forçar prioridade/categoria nulos para respeitar constraint
			sql = `INSERT INTO ajustes_solicitacoes (clinica_id, tipo, titulo, descricao, status, prioridade, categoria, medico, especialidade) VALUES (?, ?, ?, ?, 'pendente', NULL, NULL, ?, ?)`;
			params = [Number(tokenClinicaId), String(tipo), String(titulo), String(descricao), String(medico), String(especialidade)];
		} else if (tipo === 'negociacao') {
			// Validações específicas para negociação
			if (!prioridade || !categoria) {
				return send(res, false, 'Para negociacao: prioridade e categoria são obrigatórios', null, 422);
			}
			// Validar valores dos enums
			const prioridadesValidas = ['baixa', 'media', 'alta', 'critica'];
			const categoriasValidas = ['protocolo', 'medicamento', 'procedimento', 'administrativo'];
			
			if (!prioridadesValidas.includes(prioridade)) {
				return send(res, false, 'Prioridade inválida. Use: baixa, media, alta, critica', null, 422);
			}
			
			if (!categoriasValidas.includes(categoria)) {
				return send(res, false, 'Categoria inválida. Use: protocolo, medicamento, procedimento, administrativo', null, 422);
			}
			
			// Forçar medico/especialidade nulos para respeitar constraint
			sql = `INSERT INTO ajustes_solicitacoes (clinica_id, tipo, titulo, descricao, status, prioridade, categoria, medico, especialidade) VALUES (?, ?, ?, ?, 'pendente', ?, ?, NULL, NULL)`;
			params = [Number(tokenClinicaId), String(tipo), String(titulo), String(descricao), String(prioridade), String(categoria)];
		}
		
		const result: any = await query(sql, params);
		invalidateCache('/api/ajustes');
		
		// Retornar objeto completo
		const id = result.insertId;
		const created: any[] = await query(`SELECT id, clinica_id, tipo, titulo, descricao, status, medico, especialidade, prioridade, categoria, created_at, updated_at FROM ajustes_solicitacoes WHERE id = ?`, [id]);
		return send(res, true, 'Solicitação criada com sucesso', created[0], 201);
	} catch (error: any) {
		console.error('Erro ao criar solicitação:', error);
		const msg = (error?.message || '').toLowerCase();
		if (msg.includes('chk_corpo_clinico_fields') || msg.includes('check constraint') || msg.includes('constraint')) {
			return send(res, false, 'Violação de regra de negócio (campos específicos do tipo)', error.message, 422);
		}
		return send(res, false, 'Erro interno do servidor', error.message, 500);
	}
});

// =============================================================
// Atualizar solicitação (parcial)
// PUT /api/ajustes/solicitacoes/:id
// =============================================================
router.put('/solicitacoes/:id', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as any;
		if (!id || isNaN(Number(id))) return send(res, false, 'Parâmetro id inválido', null, 400);
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId) return send(res, false, 'Clínica não identificada no token', null, 401);
		
		// Primeiro, obter o tipo da solicitação existente
		const existingSql = `SELECT tipo, clinica_id FROM ajustes_solicitacoes WHERE id = ? LIMIT 1`;
		const existingRows: any[] = await query(existingSql, [Number(id)]);
		if (!existingRows || existingRows.length === 0) return send(res, false, 'Solicitação não encontrada', null, 404);
		if (existingRows[0].clinica_id !== Number(tokenClinicaId)) return send(res, false, 'Acesso negado', null, 403);
		const tipo = existingRows[0].tipo;
		let allowed: string[];
		
		if (tipo === 'corpo_clinico') {
			allowed = ['titulo', 'descricao', 'medico', 'especialidade'] as const;
		} else if (tipo === 'negociacao') {
			allowed = ['titulo', 'descricao', 'prioridade', 'categoria'] as const;
		} else {
			return send(res, false, 'Tipo de solicitação não suportado', null, 400);
		}
		
		const updates: string[] = [];
		const params: any[] = [];
		
		for (const f of allowed) {
			if ((req.body as any)[f] !== undefined) { 
				updates.push(`${f} = ?`); 
				params.push((req.body as any)[f]); 
			}
		}
		
		if (updates.length === 0) return send(res, false, 'Nenhum campo válido para atualizar', null, 400);
		
		// Validações específicas para negociação
		if (tipo === 'negociacao') {
			if ((req.body as any).prioridade !== undefined) {
				const prioridadesValidas = ['baixa', 'media', 'alta', 'critica'];
				if (!prioridadesValidas.includes((req.body as any).prioridade)) {
					return send(res, false, 'Prioridade inválida. Use: baixa, media, alta, critica', null, 422);
				}
			}
			
			if ((req.body as any).categoria !== undefined) {
				const categoriasValidas = ['protocolo', 'medicamento', 'procedimento', 'administrativo'];
				if (!categoriasValidas.includes((req.body as any).categoria)) {
					return send(res, false, 'Categoria inválida. Use: protocolo, medicamento, procedimento, administrativo', null, 422);
				}
			}
		}
		
		const sql = `UPDATE ajustes_solicitacoes SET ${updates.join(', ')} WHERE id = ? AND tipo = ?`;
		params.push(Number(id), tipo);
		
		const result: any = await query(sql, params);
		if (result.affectedRows === 0) return send(res, false, 'Solicitação não encontrada', null, 404);
		
		invalidateCache('/api/ajustes');
		return send(res, true, 'Solicitação atualizada com sucesso');
	} catch (error) {
		console.error('Erro ao atualizar solicitação:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Alterar status (gera histórico)
// PATCH /api/ajustes/solicitacoes/:id/status
// =============================================================
router.patch('/solicitacoes/:id/status', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as any;
		const { status, comentario } = req.body as any;
		if (!id || isNaN(Number(id))) return send(res, false, 'Parâmetro id inválido', null, 400);
		if (!status) return send(res, false, 'status é obrigatório', null, 422);
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId) return send(res, false, 'Clínica não identificada no token', null, 401);
		
		// Obter o tipo da solicitação
		const rows: any[] = await query(`SELECT status, tipo, clinica_id FROM ajustes_solicitacoes WHERE id = ?`, [Number(id)]);
		if (!rows || rows.length === 0) return send(res, false, 'Solicitação não encontrada', null, 404);
		if (rows[0].clinica_id !== Number(tokenClinicaId)) return send(res, false, 'Acesso negado', null, 403);
		
		const atual = rows[0].status as string;
		const tipo = rows[0].tipo as string;
		
		// Validar se é um tipo suportado
		if (!['corpo_clinico', 'negociacao'].includes(tipo)) {
			return send(res, false, 'Tipo de solicitação não suportado', null, 400);
		}
		
		const allowed: Record<string, string[]> = { 
			pendente: ['em_analise'], 
			em_analise: ['aprovado', 'rejeitado'], 
			aprovado: [], 
			rejeitado: [] 
		};
		
		if (!(allowed[atual] || []).includes(String(status))) {
			return send(res, false, `Transição de status inválida: ${atual} -> ${status}`, null, 400);
		}
		
		await query(`UPDATE ajustes_solicitacoes SET status = ? WHERE id = ?`, [String(status), Number(id)]);
		await query(`INSERT INTO ajustes_historico (solicitacao_id, status, comentario) VALUES (?, ?, ?)`, [Number(id), String(status), comentario ? String(comentario) : '']);
		
		invalidateCache('/api/ajustes');
		return send(res, true, 'Status atualizado com sucesso');
	} catch (error) {
		console.error('Erro ao alterar status:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Excluir solicitação
// DELETE /api/ajustes/solicitacoes/:id
// =============================================================
router.delete('/solicitacoes/:id', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as any;
		if (!id || isNaN(Number(id))) return send(res, false, 'Parâmetro id inválido', null, 400);
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId) return send(res, false, 'Clínica não identificada no token', null, 401);
		
		// Verificar se a solicitação existe e obter o tipo
		const existingSql = `SELECT tipo, clinica_id FROM ajustes_solicitacoes WHERE id = ? LIMIT 1`;
		const existingRows: any[] = await query(existingSql, [Number(id)]);
		if (!existingRows || existingRows.length === 0) return send(res, false, 'Solicitação não encontrada', null, 404);
		if (existingRows[0].clinica_id !== Number(tokenClinicaId)) return send(res, false, 'Acesso negado', null, 403);
		
		const tipo = existingRows[0].tipo as string;
		
		// Validar se é um tipo suportado
		if (!['corpo_clinico', 'negociacao'].includes(tipo)) {
			return send(res, false, 'Tipo de solicitação não suportado', null, 400);
		}
		
		// Excluir solicitação (anexos e histórico serão excluídos automaticamente por CASCADE)
		const result: any = await query(`DELETE FROM ajustes_solicitacoes WHERE id = ?`, [Number(id)]);
		if (result.affectedRows === 0) return send(res, false, 'Solicitação não encontrada', null, 404);
		
		invalidateCache('/api/ajustes');
		return send(res, true, 'Solicitação excluída com sucesso');
	} catch (error) {
		console.error('Erro ao excluir solicitação:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Upload de anexo
// POST /api/ajustes/solicitacoes/:id/anexos
// =============================================================
router.post('/solicitacoes/:id/anexos', uploadRateLimit, upload.single('file'), async (req, res) => {
	try {
		const { id } = req.params as any;
		if (!id || isNaN(Number(id))) return send(res, false, 'Parâmetro id inválido', null, 400);
		if (!req.file) return send(res, false, 'Arquivo não enviado. Use campo "file".', null, 400);
		const publicUrl = `${req.protocol}://${req.get('host')}/uploads/ajustes/${id}/${req.file.filename}`;
		const sql = `INSERT INTO ajustes_anexos (solicitacao_id, arquivo_url, arquivo_nome, arquivo_tamanho) VALUES (?, ?, ?, ?)`;
		const result: any = await query(sql, [Number(id), publicUrl, req.file.originalname, req.file.size]);
		invalidateCache('/api/ajustes');
		return send(res, true, 'Anexo enviado com sucesso', { id: result.insertId, arquivo_url: publicUrl, arquivo_nome: req.file.originalname, arquivo_tamanho: req.file.size }, 201);
	} catch (error) {
		console.error('Erro ao enviar anexo:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Listar anexos de uma solicitação
// GET /api/ajustes/solicitacoes/:id/anexos
// =============================================================
router.get('/solicitacoes/:id/anexos', async (req, res) => {
	try {
		const { id } = req.params as any;
		if (!id || isNaN(Number(id))) return send(res, false, 'Parâmetro id inválido', null, 400);
		const rows: any[] = await query(`SELECT id, solicitacao_id, arquivo_url, arquivo_nome, arquivo_tamanho, created_at FROM ajustes_anexos WHERE solicitacao_id = ? ORDER BY id DESC`, [Number(id)]);
		return send(res, true, 'OK', rows);
	} catch (error) {
		console.error('Erro ao listar anexos:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Download de anexo por id do anexo
// GET /api/ajustes/anexos/:anexoId/download
// =============================================================
router.get('/anexos/:anexoId/download', async (req, res) => {
	try {
		const { anexoId } = req.params as any;
		if (!anexoId || isNaN(Number(anexoId))) return send(res, false, 'Parâmetro anexoId inválido', null, 400);
		const rows: any[] = await query(`SELECT id, solicitacao_id, arquivo_url, arquivo_nome FROM ajustes_anexos WHERE id = ?`, [Number(anexoId)]);
		if (!rows || rows.length === 0) return send(res, false, 'Anexo não encontrado', null, 404);
		const anexo = rows[0];
		const baseUrl = `${req.protocol}://${req.get('host')}`;
		if (typeof anexo.arquivo_url === 'string' && anexo.arquivo_url.startsWith(`${baseUrl}/uploads/ajustes/`)) {
			// servir localmente
			const relative = anexo.arquivo_url.replace(`${baseUrl}/uploads/ajustes/`, '');
			const filePath = path.join(ajustesRootDir, relative);
			if (fs.existsSync(filePath)) {
				return res.download(filePath, anexo.arquivo_nome || path.basename(filePath));
			}
		}
		// fallback: redirecionar
		return res.redirect(302, String(anexo.arquivo_url));
	} catch (error) {
		console.error('Erro no download de anexo:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Remover anexo por id do anexo
// DELETE /api/ajustes/anexos/:anexoId
// =============================================================
router.delete('/anexos/:anexoId', async (req, res) => {
	try {
		const { anexoId } = req.params as any;
		if (!anexoId || isNaN(Number(anexoId))) return send(res, false, 'Parâmetro anexoId inválido', null, 400);
		// Obter antes para tentar deletar arquivo local
		const getSql = `SELECT id, solicitacao_id, arquivo_url FROM ajustes_anexos WHERE id = ?`;
		const rows: any[] = await query(getSql, [Number(anexoId)]);
		if (!rows || rows.length === 0) return send(res, false, 'Anexo não encontrado', null, 404);
		const anexo = rows[0];
		await query(`DELETE FROM ajustes_anexos WHERE id = ?`, [Number(anexoId)]);
		// tentar remover arquivo local
		try {
			const baseUrl = `${req.protocol}://${req.get('host')}`;
			if (typeof anexo.arquivo_url === 'string' && anexo.arquivo_url.startsWith(`${baseUrl}/uploads/ajustes/`)) {
				const relative = anexo.arquivo_url.replace(`${baseUrl}/uploads/ajustes/`, '');
				const filePath = path.join(ajustesRootDir, relative);
				if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
			}
		} catch {}
		invalidateCache('/api/ajustes');
		return send(res, true, 'Anexo deletado com sucesso');
	} catch (error) {
		console.error('Erro ao deletar anexo:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

// =============================================================
// Estatísticas de negociação
// GET /api/ajustes/estatisticas/negociacao
// =============================================================
router.get('/estatisticas/negociacao', async (req, res) => {
	try {
		const { clinica_id } = req.query as any;
		if (!clinica_id || isNaN(Number(clinica_id))) {
			return send(res, false, 'Parâmetro clinica_id inválido', null, 400);
		}
		
		// Estatísticas por status
		const statusSql = `
			SELECT status, COUNT(*) as total 
			FROM ajustes_solicitacoes 
			WHERE clinica_id = ? AND tipo = 'negociacao' 
			GROUP BY status
		`;
		const statusStats: any[] = await query(statusSql, [Number(clinica_id)]);
		
		// Estatísticas por prioridade
		const prioridadeSql = `
			SELECT prioridade, COUNT(*) as total 
			FROM ajustes_solicitacoes 
			WHERE clinica_id = ? AND tipo = 'negociacao' 
			GROUP BY prioridade
		`;
		const prioridadeStats: any[] = await query(prioridadeSql, [Number(clinica_id)]);
		
		// Estatísticas por categoria
		const categoriaSql = `
			SELECT categoria, COUNT(*) as total 
			FROM ajustes_solicitacoes 
			WHERE clinica_id = ? AND tipo = 'negociacao' 
			GROUP BY categoria
		`;
		const categoriaStats: any[] = await query(categoriaSql, [Number(clinica_id)]);
		
		// Total de solicitações
		const totalSql = `SELECT COUNT(*) as total FROM ajustes_solicitacoes WHERE clinica_id = ? AND tipo = 'negociacao'`;
		const totalResult: any[] = await query(totalSql, [Number(clinica_id)]);
		const totalSolicitacoes = totalResult[0]?.total || 0;
		
		// Solicitações críticas
		const criticasSql = `SELECT COUNT(*) as total FROM ajustes_solicitacoes WHERE clinica_id = ? AND tipo = 'negociacao' AND prioridade = 'critica'`;
		const criticasResult: any[] = await query(criticasSql, [Number(clinica_id)]);
		const solicitacoesCriticas = criticasResult[0]?.total || 0;
		
		// Taxa de aprovação
		const aprovadasSql = `SELECT COUNT(*) as total FROM ajustes_solicitacoes WHERE clinica_id = ? AND tipo = 'negociacao' AND status = 'aprovado'`;
		const aprovadasResult: any[] = await query(aprovadasSql, [Number(clinica_id)]);
		const aprovadas = aprovadasResult[0]?.total || 0;
		const taxaAprovacao = totalSolicitacoes > 0 ? Math.round((aprovadas / totalSolicitacoes) * 100) : 0;
		
		// Converter arrays para objetos para facilitar o uso no frontend
		const solicitacoesPorStatus: Record<string, number> = {};
		statusStats.forEach(stat => {
			solicitacoesPorStatus[stat.status] = stat.total;
		});
		
		const solicitacoesPorPrioridade: Record<string, number> = {};
		prioridadeStats.forEach(stat => {
			solicitacoesPorPrioridade[stat.prioridade] = stat.total;
		});
		
		const solicitacoesPorCategoria: Record<string, number> = {};
		categoriaStats.forEach(stat => {
			solicitacoesPorCategoria[stat.categoria] = stat.total;
		});
		
		const estatisticas = {
			solicitacoesCriticas,
			totalSolicitacoes,
			taxaAprovacao,
			protocolosAtualizados: solicitacoesPorCategoria['protocolo'] || 0,
			tempoMedioRetorno: 2.8, // Placeholder - pode ser implementado depois
			solicitacoesPorStatus,
			solicitacoesPorPrioridade,
			solicitacoesPorCategoria
		};
		
		return send(res, true, 'Estatísticas obtidas com sucesso', estatisticas);
	} catch (error) {
		console.error('Erro ao obter estatísticas:', error);
		return send(res, false, 'Erro interno do servidor', (error as Error).message, 500);
	}
});

export default router; 