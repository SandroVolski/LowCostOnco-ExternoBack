import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Tipos para output (leitura do banco)
export interface LoteFinanceiro extends RowDataPacket {
  id: number;
  clinica_id: number;
  operadora_registro_ans: string;
  operadora_nome: string;
  numero_lote: string;
  competencia: string;
  data_envio: Date;
  data_registro_transacao?: Date;
  hora_registro_transacao?: string;
  tipo_transacao?: string;
  sequencial_transacao?: string;
  padrao_tiss?: string;
  quantidade_guias: number;
  valor_total: number;
  status: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  arquivo_xml?: string;
  caminho_arquivo?: string;
  hash_xml?: string;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

// Tipo para input (criação/atualização) - objeto simples sem RowDataPacket
export interface LoteFinanceiroInput {
  clinica_id?: number;
  operadora_registro_ans?: string;
  operadora_nome?: string;
  numero_lote?: string;
  competencia?: string;
  data_envio?: Date;
  data_registro_transacao?: Date;
  hora_registro_transacao?: string;
  tipo_transacao?: string;
  sequencial_transacao?: string;
  padrao_tiss?: string;
  quantidade_guias?: number;
  valor_total?: number;
  status?: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  arquivo_xml?: string;
  caminho_arquivo?: string;
  hash_xml?: string;
  observacoes?: string;
}

export interface GuiaFinanceira extends RowDataPacket {
  id: number;
  lote_id: number;
  clinica_id: number;
  registro_ans: string;
  numero_guia_prestador: string;
  numero_guia_operadora?: string;
  guia_principal?: string;
  data_autorizacao?: Date;
  senha?: string;
  data_validade_senha?: Date;
  numero_carteira?: string;
  atendimento_rn?: string;
  cnpj_contratado_solicitante?: string;
  nome_contratado_solicitante?: string;
  nome_profissional_solicitante?: string;
  conselho_profissional_solicitante?: string;
  numero_conselho_solicitante?: string;
  uf_solicitante?: string;
  cbos_solicitante?: string;
  data_solicitacao?: Date;
  carater_atendimento?: string;
  indicacao_clinica?: string;
  cnpj_contratado_executante?: string;
  cnes_executante?: string;
  tipo_atendimento?: string;
  indicacao_acidente?: string;
  regime_atendimento?: string;
  data_execucao?: Date;
  valor_procedimentos: number;
  valor_taxas_alugueis: number;
  valor_materiais: number;
  valor_medicamentos: number;
  valor_gases_medicinais: number;
  valor_total: number;
  status_pagamento: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  valor_pago: number;
  valor_glosado: number;
  data_pagamento?: Date;
  motivo_glosa?: string;
  documentos_anexos?: string;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

// Tipo para input (criação/atualização) - objeto simples sem RowDataPacket
export interface GuiaFinanceiraInput {
  lote_id?: number;
  clinica_id?: number;
  registro_ans?: string;
  numero_guia_prestador?: string;
  numero_guia_operadora?: string;
  guia_principal?: string;
  data_autorizacao?: Date;
  senha?: string;
  data_validade_senha?: Date;
  numero_carteira?: string;
  atendimento_rn?: string;
  cnpj_contratado_solicitante?: string;
  nome_contratado_solicitante?: string;
  nome_profissional_solicitante?: string;
  conselho_profissional_solicitante?: string;
  numero_conselho_solicitante?: string;
  uf_solicitante?: string;
  cbos_solicitante?: string;
  data_solicitacao?: Date;
  carater_atendimento?: string;
  indicacao_clinica?: string;
  cnpj_contratado_executante?: string;
  cnes_executante?: string;
  tipo_atendimento?: string;
  indicacao_acidente?: string;
  regime_atendimento?: string;
  data_execucao?: Date;
  valor_procedimentos?: number;
  valor_taxas_alugueis?: number;
  valor_materiais?: number;
  valor_medicamentos?: number;
  valor_gases_medicinais?: number;
  valor_total?: number;
  status_pagamento?: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  valor_pago?: number;
  valor_glosado?: number;
  data_pagamento?: Date;
  motivo_glosa?: string;
  documentos_anexos?: string;
  observacoes?: string;
}

export interface ProcedimentoExecutado extends RowDataPacket {
  id: number;
  guia_id: number;
  sequencial_item: number;
  data_execucao: Date;
  hora_inicial?: string;
  hora_final?: string;
  codigo_tabela?: string;
  codigo_procedimento: string;
  descricao_procedimento?: string;
  quantidade_executada: number;
  via_acesso?: string;
  tecnica_utilizada?: string;
  reducao_acrescimo: number;
  valor_unitario: number;
  valor_total: number;
  unidade_medida?: string;
  grau_participacao?: string;
  cpf_profissional?: string;
  nome_profissional?: string;
  conselho_profissional?: string;
  numero_conselho?: string;
  uf_profissional?: string;
  cbos_profissional?: string;
}

// Tipo para input (criação) - objeto simples sem RowDataPacket
export interface ProcedimentoExecutadoInput {
  guia_id?: number;
  sequencial_item?: number;
  data_execucao?: Date;
  hora_inicial?: string;
  hora_final?: string;
  codigo_tabela?: string;
  codigo_procedimento?: string;
  descricao_procedimento?: string;
  quantidade_executada?: number;
  via_acesso?: string;
  tecnica_utilizada?: string;
  reducao_acrescimo?: number;
  valor_unitario?: number;
  valor_total?: number;
  unidade_medida?: string;
  grau_participacao?: string;
  cpf_profissional?: string;
  nome_profissional?: string;
  conselho_profissional?: string;
  numero_conselho?: string;
  uf_profissional?: string;
  cbos_profissional?: string;
}

export interface OutraDespesa extends RowDataPacket {
  id: number;
  guia_id: number;
  sequencial_item: number;
  codigo_despesa: string;
  tipo_despesa?: string;
  data_execucao: Date;
  hora_inicial?: string;
  hora_final?: string;
  codigo_tabela?: string;
  codigo_item: string;
  descricao_item?: string;
  quantidade_executada: number;
  unidade_medida?: string;
  reducao_acrescimo: number;
  valor_unitario: number;
  valor_total: number;
  registro_anvisa?: string;
}

// Tipo para input (criação) - objeto simples sem RowDataPacket
export interface OutraDespesaInput {
  guia_id?: number;
  sequencial_item?: number;
  codigo_despesa?: string;
  tipo_despesa?: string;
  data_execucao?: Date;
  hora_inicial?: string;
  hora_final?: string;
  codigo_tabela?: string;
  codigo_item?: string;
  descricao_item?: string;
  quantidade_executada?: number;
  unidade_medida?: string;
  reducao_acrescimo?: number;
  valor_unitario?: number;
  valor_total?: number;
  registro_anvisa?: string;
}

export class FinanceiroModel {
  // ==================== LOTES ====================
  
  static async createLote(lote: LoteFinanceiroInput): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_lotes (
        clinica_id, operadora_registro_ans, operadora_nome, numero_lote,
        competencia, data_envio, quantidade_guias,
        valor_total, status, arquivo_xml, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lote.clinica_id,
        lote.operadora_registro_ans,
        lote.operadora_nome,
        lote.numero_lote,
        lote.competencia,
        lote.data_envio,
        lote.quantidade_guias,
        lote.valor_total,
        lote.status || 'pendente',
        lote.arquivo_xml,
        lote.observacoes,
      ]
    );
    return result.insertId;
  }

  static async getLotesByClinica(clinicaId: number): Promise<LoteFinanceiro[]> {
    const [rows] = await pool.execute<LoteFinanceiro[]>(
      'SELECT * FROM financeiro_lotes WHERE clinica_id = ? ORDER BY data_envio DESC',
      [clinicaId]
    );
    return rows;
  }

  static async getLoteById(loteId: number): Promise<LoteFinanceiro | null> {
    const [rows] = await pool.execute<LoteFinanceiro[]>(
      'SELECT * FROM financeiro_lotes WHERE id = ?',
      [loteId]
    );
    return rows[0] || null;
  }

  static async updateLoteStatus(loteId: number, status: string): Promise<void> {
    await pool.execute(
      'UPDATE financeiro_lotes SET status = ? WHERE id = ?',
      [status, loteId]
    );
  }

  static async getLotesPorCompetencia(clinicaId: number, competencia: string): Promise<LoteFinanceiro[]> {
    const [rows] = await pool.execute<LoteFinanceiro[]>(
      'SELECT * FROM financeiro_lotes WHERE clinica_id = ? AND competencia = ? ORDER BY data_envio DESC',
      [clinicaId, competencia]
    );
    return rows;
  }

  static async getLotesPorOperadora(clinicaId: number, registroANS: string): Promise<LoteFinanceiro[]> {
    const [rows] = await pool.execute<LoteFinanceiro[]>(
      'SELECT * FROM financeiro_lotes WHERE clinica_id = ? AND operadora_registro_ans = ? ORDER BY data_envio DESC',
      [clinicaId, registroANS]
    );
    return rows;
  }

  // ==================== GUIAS ====================
  
  static async createGuia(guia: GuiaFinanceiraInput): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_guias (
        lote_id, clinica_id, numero_guia_prestador, numero_guia_operadora,
        numero_carteira, data_autorizacao, data_execucao,
        valor_procedimentos, valor_taxas_alugueis, valor_materiais,
        valor_medicamentos, valor_total, status_pagamento, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guia.lote_id,
        guia.clinica_id,
        guia.numero_guia_prestador,
        guia.numero_guia_operadora,
        guia.numero_carteira,
        guia.data_autorizacao,
        guia.data_execucao,
        guia.valor_procedimentos || 0,
        guia.valor_taxas_alugueis || 0,
        guia.valor_materiais || 0,
        guia.valor_medicamentos || 0,
        guia.valor_total,
        guia.status_pagamento || 'pendente',
        guia.observacoes,
      ]
    );
    return result.insertId;
  }

  static async getGuiasByLote(loteId: number): Promise<GuiaFinanceira[]> {
    const [rows] = await pool.execute<GuiaFinanceira[]>(
      'SELECT * FROM financeiro_guias WHERE lote_id = ? ORDER BY data_execucao DESC',
      [loteId]
    );
    return rows;
  }

  static async getGuiaById(guiaId: number): Promise<GuiaFinanceira | null> {
    const [rows] = await pool.execute<GuiaFinanceira[]>(
      'SELECT * FROM financeiro_guias WHERE id = ?',
      [guiaId]
    );
    return rows[0] || null;
  }

  static async updateGuiaStatus(guiaId: number, status: string): Promise<void> {
    await pool.execute(
      'UPDATE financeiro_guias SET status_pagamento = ? WHERE id = ?',
      [status, guiaId]
    );
  }

  static async updateGuiaDocumentos(guiaId: number, documentos: string): Promise<void> {
    await pool.execute(
      'UPDATE financeiro_guias SET documentos_anexos = ? WHERE id = ?',
      [documentos, guiaId]
    );
  }

  // ==================== PROCEDIMENTOS ====================
  
  static async createProcedimento(procedimento: ProcedimentoExecutadoInput): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_procedimentos (
        guia_id, codigo_procedimento, descricao_procedimento,
        data_execucao, quantidade_executada, valor_unitario, valor_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        procedimento.guia_id,
        procedimento.codigo_procedimento,
        procedimento.descricao_procedimento,
        procedimento.data_execucao,
        procedimento.quantidade_executada,
        procedimento.valor_unitario,
        procedimento.valor_total,
      ]
    );
    return result.insertId;
  }

  static async getProcedimentosByGuia(guiaId: number): Promise<ProcedimentoExecutado[]> {
    const [rows] = await pool.execute<ProcedimentoExecutado[]>(
      'SELECT * FROM financeiro_procedimentos WHERE guia_id = ? ORDER BY data_execucao',
      [guiaId]
    );
    return rows;
  }

  // ==================== OUTRAS DESPESAS ====================
  
  static async createDespesa(despesa: OutraDespesaInput): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_despesas (
        guia_id, codigo_despesa, tipo_despesa, codigo_item, descricao_item,
        quantidade_executada, valor_unitario, valor_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        despesa.guia_id,
        despesa.codigo_despesa,
        despesa.tipo_despesa,
        despesa.codigo_item,
        despesa.descricao_item,
        despesa.quantidade_executada,
        despesa.valor_unitario,
        despesa.valor_total,
      ]
    );
    return result.insertId;
  }

  static async getDespesasByGuia(guiaId: number): Promise<OutraDespesa[]> {
    const [rows] = await pool.execute<OutraDespesa[]>(
      'SELECT * FROM financeiro_despesas WHERE guia_id = ? ORDER BY codigo_despesa',
      [guiaId]
    );
    return rows;
  }

  // ==================== ESTATÍSTICAS ====================
  
  static async getEstatisticas(clinicaId: number): Promise<any> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT l.id) as total_lotes,
        COUNT(DISTINCT g.id) as total_guias,
        COALESCE(SUM(l.valor_total), 0) as valor_total,
        COALESCE(SUM(CASE WHEN l.status = 'pago' THEN l.valor_total ELSE 0 END), 0) as valor_pago,
        COALESCE(SUM(CASE WHEN l.status = 'pendente' THEN l.valor_total ELSE 0 END), 0) as valor_pendente,
        COALESCE(SUM(CASE WHEN l.status = 'glosado' THEN l.valor_total ELSE 0 END), 0) as valor_glosado
      FROM financeiro_lotes l
      LEFT JOIN financeiro_guias g ON g.lote_id = l.id
      WHERE l.clinica_id = ?`,
      [clinicaId]
    );
    return rows[0];
  }

  // ==================== HISTÓRICO DE STATUS ====================
  
  static async createHistoricoStatus(data: {
    lote_id?: number;
    guia_id?: number;
    status_anterior?: string;
    status_novo: string;
    observacao?: string;
    alterado_por?: number;
  }): Promise<void> {
    await pool.execute(
      `INSERT INTO financeiro_historico (
        lote_id, guia_id, acao, valor_anterior, valor_novo, usuario_id, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.lote_id,
        data.guia_id,
        data.status_novo,
        data.status_anterior,
        data.status_novo,
        data.alterado_por,
        data.observacao,
      ]
    );
  }
}

