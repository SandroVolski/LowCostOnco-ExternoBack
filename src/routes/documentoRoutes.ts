import express from 'express';
import { optionalAuth, authenticateToken } from '../middleware/auth';
import { rateLimit, uploadRateLimit } from '../middleware/rateLimit';
import { query } from '../config/database';
import { invalidateCache } from '../middleware/cache';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Helper de resposta padronizada
const sendResponse = (res: express.Response, success: boolean, message: string, data: any = null, statusCode: number = 200) => {
	return res.status(statusCode).json({ success, message, data });
};

// Validação simples de data (YYYY-MM-DD)
const isValidDate = (value?: string) => {
	if (!value) return true;
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

// Configuração de upload (multer)
const uploadsRootDir = path.resolve(__dirname, '..', '..', 'uploads');
const documentosDir = path.join(uploadsRootDir, 'documentos');
if (!fs.existsSync(documentosDir)) {
	fs.mkdirSync(documentosDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, documentosDir);
	},
	filename: (_req, file, cb) => {
		const timestamp = Date.now();
		const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
		cb(null, `${timestamp}_${sanitized}`);
	}
});

const upload = multer({ storage });

// Aplicar autenticação opcional e rate limiting
// Nota: quando a autenticação do sistema estiver pronta, troque optionalAuth por authenticateToken
router.use(authenticateToken);
router.use(rateLimit());

interface AuthRequest extends express.Request {
  user?: { id: number; clinicaId?: number; role?: string };
}

// ===================================================
// ROTAS PARA DOCUMENTOS DA CLÍNICA
// ===================================================

// GET - Listar documentos por query (clinica_id)
router.get('/', async (req: AuthRequest, res) => {
	try {
		// Headers de cache específicos para documentos
		res.set('Cache-Control', 'private, max-age=60'); // 1 minuto
		res.set('ETag', `documents-${Date.now()}`);
		

		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId) {
			return sendResponse(res, false, 'Clínica não identificada no token', null, 401);
		}

		const { status, tipo } = req.query as { status?: string; tipo?: string };

		const conditions: string[] = ['clinica_id = ?'];
		const params: any[] = [Number(tokenClinicaId)];

		if (status) {
			conditions.push('status = ?');
			params.push(status);
		}
		if (tipo) {
			conditions.push('tipo = ?');
			params.push(tipo);
		}

		const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
		const sql = `
			SELECT 
				id, clinica_id, nome, tipo, descricao, arquivo_url, arquivo_nome, arquivo_tamanho,
				data_envio, data_vencimento, status, created_at, updated_at
			FROM clinic_documents
			${whereClause}
			ORDER BY (data_vencimento IS NULL), data_vencimento ASC, id DESC
		`;
		const documentos = await query(sql, params);
		return sendResponse(res, true, 'Documentos listados com sucesso', { documentos });
	} catch (error) {
		console.error('Erro ao listar documentos (query):', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

// GET - Listar documentos de uma clínica
router.get('/clinica/:clinicaId', async (req: AuthRequest, res) => {
	try {
		// Headers de cache específicos para documentos
		res.set('Cache-Control', 'private, max-age=60'); // 1 minuto
		res.set('ETag', `documents-clinica-${req.params.clinicaId}-${Date.now()}`);
		
		const { clinicaId } = req.params as { clinicaId: string };
		const { status, tipo } = req.query as { status?: string; tipo?: string };

		if (!clinicaId || isNaN(Number(clinicaId))) {
			return sendResponse(res, false, 'Parâmetro clinicaId inválido', null, 400);
		}

		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId) {
			return sendResponse(res, false, 'Clínica não identificada no token', null, 401);
		}
		if (Number(clinicaId) !== Number(tokenClinicaId)) {
			return sendResponse(res, false, 'Acesso negado aos documentos de outra clínica', null, 403);
		}

		const conditions: string[] = ['clinica_id = ?'];
		const params: any[] = [Number(tokenClinicaId)];

		if (status) {
			conditions.push('status = ?');
			params.push(status);
		}
		if (tipo) {
			conditions.push('tipo = ?');
			params.push(tipo);
		}

		const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

		const sql = `
			SELECT 
				id, clinica_id, nome, tipo, descricao, arquivo_url, arquivo_nome, arquivo_tamanho,
				data_envio, data_vencimento, status, created_at, updated_at
			FROM clinic_documents
			${whereClause}
			ORDER BY (data_vencimento IS NULL), data_vencimento ASC, id DESC
		`;

		const documentos = await query(sql, params);

		return sendResponse(res, true, 'Documentos listados com sucesso', { documentos });
	} catch (error) {
		console.error('Erro ao listar documentos:', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

// GET - Buscar documento por ID
router.get('/:id', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as { id: string };
		if (!id || isNaN(Number(id))) {
			return sendResponse(res, false, 'Parâmetro id inválido', null, 400);
		}

		const sql = `
			SELECT 
				id, clinica_id, nome, tipo, descricao, arquivo_url, arquivo_nome, arquivo_tamanho,
				data_envio, data_vencimento, status, created_at, updated_at
			FROM clinic_documents
			WHERE id = ?
			LIMIT 1
		`;
		const rows: any[] = await query(sql, [Number(id)]);
		if (!rows || rows.length === 0) {
			return sendResponse(res, false, 'Documento não encontrado', null, 404);
		}
		// Validar propriedade
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId || rows[0].clinica_id !== Number(tokenClinicaId)) {
			return sendResponse(res, false, 'Acesso negado ao documento solicitado', null, 403);
		}
		return sendResponse(res, true, 'Documento encontrado com sucesso', rows[0]);
	} catch (error) {
		console.error('Erro ao buscar documento:', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

// GET - Download do arquivo do documento
router.get('/:id/download', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as { id: string };
		if (!id || isNaN(Number(id))) {
			return sendResponse(res, false, 'Parâmetro id inválido', null, 400);
		}

		const sql = `
			SELECT id, arquivo_url, arquivo_nome
			FROM clinic_documents
			WHERE id = ?
			LIMIT 1
		`;
		const rows: any[] = await query(sql, [Number(id)]);
		if (!rows || rows.length === 0) {
			return sendResponse(res, false, 'Documento não encontrado', null, 404);
		}
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId || rows[0].clinica_id !== Number(tokenClinicaId)) {
			return sendResponse(res, false, 'Acesso negado ao documento solicitado', null, 403);
		}

		const doc = rows[0];
		if (!doc.arquivo_url) {
			return sendResponse(res, false, 'Documento não possui arquivo', null, 404);
		}

		// Tentar servir localmente se o arquivo estiver em /uploads/documentos
		try {
			const baseUrl = `${req.protocol}://${req.get('host')}`;
			const isLocalUpload = typeof doc.arquivo_url === 'string' && doc.arquivo_url.startsWith(`${baseUrl}/uploads/documentos/`);
			if (isLocalUpload) {
				const fileName = doc.arquivo_url.substring(`${baseUrl}/uploads/documentos/`.length);
				const filePath = path.join(documentosDir, fileName);
				if (fs.existsSync(filePath)) {
					return res.download(filePath, doc.arquivo_nome || fileName);
				}
			}
		} catch (e) {
			// fallback para redirect
		}

		// Se não for local ou não existir, redirecionar para a URL (pode ser externa)
		return res.redirect(302, String(doc.arquivo_url));
	} catch (error) {
		console.error('Erro no download do documento:', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

// POST - Criar novo documento (sem arquivo - apenas metadados)
router.post('/', async (req: AuthRequest, res) => {
	try {
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId) {
			return sendResponse(res, false, 'Clínica não identificada no token', null, 401);
		}
		const {
			nome,
			tipo,
			descricao,
			arquivo_url,
			arquivo_nome,
			arquivo_tamanho,
			data_envio,
			data_vencimento,
			status
		} = req.body || {};

		if (!nome || !tipo || !data_envio) {
			return sendResponse(res, false, 'Campos obrigatórios: nome, tipo, data_envio', null, 400);
		}
		if (!isValidDate(data_envio) || !isValidDate(data_vencimento)) {
			return sendResponse(res, false, 'Datas devem estar no formato YYYY-MM-DD', null, 400);
		}

		// Montar INSERT dinamicamente para não sobrescrever status quando não enviado
		const columns: string[] = [
			'clinica_id', 'nome', 'tipo', 'descricao', 'arquivo_url', 'arquivo_nome',
			'arquivo_tamanho', 'data_envio', 'data_vencimento'
		];
		const values: any[] = [
			Number(tokenClinicaId), nome, tipo, descricao || null, arquivo_url || null, arquivo_nome || null,
			arquivo_tamanho || null, data_envio, data_vencimento || null
		];
		if (status) {
			columns.push('status');
			values.push(status);
		}

		const placeholders = columns.map(() => '?').join(', ');
		const sql = `INSERT INTO clinic_documents (${columns.join(', ')}) VALUES (${placeholders})`;
		const result: any = await query(sql, values);

		// Invalidar cache mais específico
		invalidateCache('/api/clinicas/documentos');
		invalidateCache(`/api/clinicas/documentos?clinica_id=${tokenClinicaId}`);
		invalidateCache(`/api/clinicas/documentos/clinica/${tokenClinicaId}`);

		return sendResponse(res, true, 'Documento criado com sucesso', { id: result.insertId }, 201);
	} catch (error) {
		console.error('Erro ao criar documento:', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

// POST - Upload de documento (multipart/form-data)
router.post('/upload', uploadRateLimit, upload.single('file'), async (req: AuthRequest, res) => {
	try {
		let meta: any = {};
		if (req.body && typeof (req.body as any).documento === 'string') {
			try { meta = JSON.parse((req.body as any).documento); }
			catch { return sendResponse(res, false, 'Campo documento inválido (JSON mal formatado)', null, 400); }
		}
		const rawId = meta.id ?? meta.documento_id ?? meta.documentId ?? (req.body as any).id ?? (req.body as any).documento_id ?? (req.body as any).documentId ?? (req.query as any)?.id ?? req.headers['x-document-id'];
		const idNum = rawId !== undefined && rawId !== null && !isNaN(Number(rawId)) ? Number(rawId) : undefined;
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!tokenClinicaId) {
			return sendResponse(res, false, 'Clínica não identificada no token', null, 401);
		}
		const nome = meta.nome ?? (req.body as any).nome;
		const tipo = meta.tipo ?? (req.body as any).tipo;
		const descricao = meta.descricao ?? (req.body as any).descricao;
		const data_envio = meta.data_envio ?? (req.body as any).data_envio;
		const data_vencimento = meta.data_vencimento ?? (req.body as any).data_vencimento;
		const status = meta.status ?? (req.body as any).status;

		const dataEnvioStr = data_envio != null ? String(data_envio) : '';
		const dataVencStr = data_vencimento != null ? String(data_vencimento) : '';
		if ((dataEnvioStr && !isValidDate(dataEnvioStr)) || (dataVencStr && !isValidDate(dataVencStr))) {
			return sendResponse(res, false, 'Datas devem estar no formato YYYY-MM-DD', null, 400);
		}

		const hasFile = !!req.file;

		// UPDATE quando id presente
		if (idNum !== undefined) {
			const updates: string[] = [];
			const params: any[] = [];
			const upsertFields: Record<string, any> = { nome, tipo, descricao, data_envio: dataEnvioStr || undefined, data_vencimento: dataVencStr || null, status };
			for (const [k, v] of Object.entries(upsertFields)) {
				if (v !== undefined) {
					updates.push(`${k} = ?`);
					params.push(v);
				}
			}
			let publicUrl: string | undefined;
			if (hasFile) {
				publicUrl = `${req.protocol}://${req.get('host')}/uploads/documentos/${req.file!.filename}`;
				updates.push('arquivo_url = ?', 'arquivo_nome = ?', 'arquivo_tamanho = ?');
				params.push(publicUrl, req.file!.originalname, req.file!.size);
			}
			if (updates.length === 0) {
				return sendResponse(res, false, 'Nenhum campo válido para atualizar', null, 400);
			}
			const sql = `UPDATE clinic_documents SET ${updates.join(', ')} WHERE id = ?`;
			params.push(idNum);
			const result: any = await query(sql, params);
			if (!result || (typeof result.affectedRows === 'number' && result.affectedRows === 0)) {
				return sendResponse(res, false, 'Documento não encontrado para atualizar', null, 404);
			}
			
			// Invalidar cache mais específico
			invalidateCache('/api/clinicas/documentos');
			invalidateCache(`/api/clinicas/documentos?clinica_id=${tokenClinicaId}`);
			invalidateCache(`/api/clinicas/documentos/clinica/${tokenClinicaId}`);
			
			return sendResponse(res, true, 'Documento atualizado com sucesso', { id: idNum, ...(hasFile ? { arquivo_url: publicUrl, arquivo_nome: req.file!.originalname, arquivo_tamanho: req.file!.size } : {}) });
		}

		// INSERT quando id ausente — aqui sim campos obrigatórios
		if (!nome || !tipo || !dataEnvioStr) {
			return sendResponse(res, false, 'Campos obrigatórios: nome, tipo, data_envio', null, 400);
		}
		if (!hasFile) {
			return sendResponse(res, false, 'Arquivo não enviado. Use campo "file" no formulário.', null, 400);
		}
		const publicUrl = `${req.protocol}://${req.get('host')}/uploads/documentos/${req.file!.filename}`;
		const columns: string[] = ['clinica_id', 'nome', 'tipo', 'descricao', 'arquivo_url', 'arquivo_nome', 'arquivo_tamanho', 'data_envio', 'data_vencimento'];
		const values: any[] = [Number(tokenClinicaId), String(nome), String(tipo), (descricao ? String(descricao) : null), publicUrl, req.file!.originalname, req.file!.size, dataEnvioStr, (dataVencStr ? dataVencStr : null)];
		if (status) { columns.push('status'); values.push(String(status)); }
		const placeholders = columns.map(() => '?').join(', ');
		const insertSql = `INSERT INTO clinic_documents (${columns.join(', ')}) VALUES (${placeholders})`;
		const insertResult: any = await query(insertSql, values);
		
		// Invalidar cache mais específico
		invalidateCache('/api/clinicas/documentos');
		invalidateCache(`/api/clinicas/documentos?clinica_id=${tokenClinicaId}`);
		invalidateCache(`/api/clinicas/documentos/clinica/${tokenClinicaId}`);
		
		return sendResponse(res, true, 'Documento enviado e criado com sucesso', { id: insertResult.insertId, arquivo_url: publicUrl, arquivo_nome: req.file!.originalname, arquivo_tamanho: req.file!.size }, 201);
	} catch (error) {
		console.error('Erro no upload de documento:', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

// PUT - Atualizar documento
router.put('/:id', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as { id: string };
		if (!id || isNaN(Number(id))) {
			return sendResponse(res, false, 'Parâmetro id inválido', null, 400);
		}

		const allowedFields: string[] = [
			'nome', 'tipo', 'descricao', 'arquivo_url', 'arquivo_nome', 'arquivo_tamanho',
			'data_envio', 'data_vencimento', 'status'
		];
		const updates: string[] = [];
		const params: any[] = [];

		for (const field of allowedFields) {
			if ((req.body as any)[field] !== undefined) {
				if ((field === 'data_envio' || field === 'data_vencimento') && !isValidDate((req.body as any)[field])) {
					return sendResponse(res, false, 'Datas devem estar no formato YYYY-MM-DD', null, 400);
				}
				updates.push(`${field} = ?`);
				params.push((req.body as any)[field] ?? null);
			}
		}

		if (updates.length === 0) {
			return sendResponse(res, false, 'Nenhum campo válido para atualizar', null, 400);
		}


		// Checar propriedade
		const ownerRows: any[] = await query('SELECT clinica_id FROM clinic_documents WHERE id = ? LIMIT 1', [Number(id)]);
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!ownerRows || ownerRows.length === 0) {
			return sendResponse(res, false, 'Documento não encontrado', null, 404);
		}
		if (!tokenClinicaId || ownerRows[0].clinica_id !== Number(tokenClinicaId)) {
			return sendResponse(res, false, 'Acesso negado ao documento solicitado', null, 403);
		}

		const sql = `UPDATE clinic_documents SET ${updates.join(', ')} WHERE id = ?`;
		params.push(Number(id));
		await query(sql, params);

		// Invalidar cache mais específico
		invalidateCache('/api/clinicas/documentos');
		// Buscar clinica_id para invalidar cache específico
		const clinicaQuery = 'SELECT clinica_id FROM clinic_documents WHERE id = ?';
		const clinicaResult: any[] = await query(clinicaQuery, [Number(id)]);
		if (clinicaResult.length > 0) {
			const clinica_id = clinicaResult[0].clinica_id;
			invalidateCache(`/api/clinicas/documentos?clinica_id=${clinica_id}`);
			invalidateCache(`/api/clinicas/documentos/clinica/${clinica_id}`);
		}

		return sendResponse(res, true, 'Documento atualizado com sucesso');
	} catch (error) {
		console.error('Erro ao atualizar documento:', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

// DELETE - Deletar documento
router.delete('/:id', async (req: AuthRequest, res) => {
	try {
		const { id } = req.params as { id: string };
		if (!id || isNaN(Number(id))) {
			return sendResponse(res, false, 'Parâmetro id inválido', null, 400);
		}

		// Checar propriedade
		const ownerRows: any[] = await query('SELECT clinica_id FROM clinic_documents WHERE id = ? LIMIT 1', [Number(id)]);
		const tokenClinicaId = req.user?.clinicaId || req.user?.id;
		if (!ownerRows || ownerRows.length === 0) {
			return sendResponse(res, false, 'Documento não encontrado', null, 404);
		}
		if (!tokenClinicaId || ownerRows[0].clinica_id !== Number(tokenClinicaId)) {
			return sendResponse(res, false, 'Acesso negado ao documento solicitado', null, 403);
		}

		const sql = 'DELETE FROM clinic_documents WHERE id = ?';
		await query(sql, [Number(id)]);

		// Invalidar cache mais específico
		invalidateCache('/api/clinicas/documentos');
		// Buscar clinica_id para invalidar cache específico (se ainda existir)
		const clinicaQuery = 'SELECT clinica_id FROM clinic_documents WHERE id = ?';
		const clinicaResult: any[] = await query(clinicaQuery, [Number(id)]);
		if (clinicaResult.length > 0) {
			const clinica_id = clinicaResult[0].clinica_id;
			invalidateCache(`/api/clinicas/documentos?clinica_id=${clinica_id}`);
			invalidateCache(`/api/clinicas/documentos/clinica/${clinica_id}`);
		}

		return sendResponse(res, true, 'Documento deletado com sucesso');
	} catch (error) {
		console.error('Erro ao deletar documento:', error);
		return sendResponse(res, false, 'Erro interno do servidor', null, 500);
	}
});

export default router; 