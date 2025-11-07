import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// ==================== INTERFACES ====================

// Interface para Lote Financeiro (nova estrutura)
export interface LoteFinanceiro extends RowDataPacket {
  id: number;
  clinica_id: number;
  operadora_registro_ans: string;
  operadora_nome: string;
  numero_lote: string;
  competencia: string;
  data_envio: Date;
  quantidade_guias: number;
  valor_total: number;
  status: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  arquivo_xml?: string;
  hash_xml?: string;
  versao_tiss?: string;
  // Campos do cabeçalho TISS
  tipo_transacao?: string;
  sequencial_transacao?: string;
  data_registro_transacao?: Date;
  hora_registro_transacao?: string;
  cnpj_prestador?: string;
  nome_prestador?: string;
  registro_ans?: string;
  padrao_tiss?: string;
  hash_lote?: string;
  cnes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoteFinanceiroInput {
  clinica_id?: number;
  operadora_registro_ans?: string;
  operadora_nome?: string;
  numero_lote?: string;
  competencia?: string;
  data_envio?: Date;
  quantidade_guias?: number;
  valor_total?: number;
  status?: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  arquivo_xml?: string;
  tipo_transacao?: string;
  sequencial_transacao?: string;
  data_registro_transacao?: Date;
  hora_registro_transacao?: string;
  cnpj_prestador?: string;
  nome_prestador?: string;
  registro_ans?: string;
  padrao_tiss?: string;
  hash_lote?: string;
  cnes?: string;
}

// Interface para Items Financeiros (nova estrutura)
export interface ItemFinanceiro extends RowDataPacket {
  id: number;
  lote_id: number;
  clinica_id: number;
  tipo_item: 'guia' | 'procedimento' | 'despesa';
  
  // Dados da guia
  numero_guia_prestador?: string;
  numero_guia_operadora?: string;
  numero_carteira?: string;
  data_autorizacao?: Date;
  data_execucao?: Date;
  data_solicitacao?: Date;
  senha?: string;
  data_validade_senha?: Date;
  indicacao_clinica?: string;
  tipo_atendimento?: string;
  carater_atendimento?: string;
  regime_atendimento?: string;
  cnpj_prestador?: string;
  cnes?: string;
  hash_xml?: string;
  
  // Dados do procedimento/despesa
  codigo_item?: string;
  descricao_item?: string;
  quantidade_executada?: number;
  valor_unitario?: number;
  valor_total?: number;
  valor_procedimentos?: number;
  valor_medicamentos?: number;
  valor_materiais?: number;
  valor_taxas?: number;
  unidade_medida?: string;
  via_acesso?: string;
  reducao_acrescimo?: number;
  
  // Controle de pagamento
  status_pagamento: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  valor_pago?: number;
  data_pagamento?: Date;
  
  // Hierarquia
  parent_id?: number;
  // Competência AAAAMM
  competencia?: string;
  
  created_at: Date;
  updated_at: Date;
}

export interface ItemFinanceiroInput {
  lote_id?: number;
  clinica_id?: number;
  tipo_item?: 'guia' | 'procedimento' | 'despesa';
  numero_guia_prestador?: string;
  numero_guia_operadora?: string;
  numero_carteira?: string;
  data_autorizacao?: Date;
  data_execucao?: Date;
  data_solicitacao?: Date;
  senha?: string;
  data_validade_senha?: Date;
  indicacao_clinica?: string;
  tipo_atendimento?: string;
  carater_atendimento?: string;
  regime_atendimento?: string;
  cnpj_prestador?: string;
  cnes?: string;
  hash_xml?: string;
  codigo_item?: string;
  descricao_item?: string;
  quantidade_executada?: number;
  valor_unitario?: number;
  valor_total?: number;
  valor_procedimentos?: number;
  valor_medicamentos?: number;
  valor_materiais?: number;
  valor_taxas?: number;
  valor_taxas_alugueis?: number;
  unidade_medida?: string;
  via_acesso?: string;
  reducao_acrescimo?: number;
  status_pagamento?: 'pendente' | 'pago' | 'glosado' | 'parcialmente_pago';
  valor_pago?: number;
  data_pagamento?: Date;
  parent_id?: number;
  // Competência AAAAMM
  competencia?: string;
  // Dados do profissional
  profissional_nome?: string;
  profissional_conselho?: string;
  profissional_numero_conselho?: string;
  profissional_uf?: string;
  profissional_cbos?: string;
  // Dados adicionais
  observacoes?: string;
  guia_principal?: string;
  atendimento_rn?: string;
  beneficiario_nome?: string;
  // Dados de despesas
  codigo_despesa?: string;
  codigo_tabela?: string;
  // Dados de horários
  hora_inicial?: string;
  hora_final?: string;
  sequencial_item?: number;
  // Dados do executante
  grau_participacao?: string;
  executante_cpf?: string;
  executante_nome?: string;
  executante_conselho?: string;
  executante_numero_conselho?: string;
  executante_uf?: string;
  executante_cbos?: string;
  indicacao_acidente?: string;
}

// Interface para Profissionais
export interface ProfissionalFinanceiro extends RowDataPacket {
  id: number;
  lote_id: number;
  clinica_id: number;
  nome: string;
  conselho: string;
  numero_conselho: string;
  uf: string;
  cbos: string;
  cpf?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProfissionalFinanceiroInput {
  lote_id?: number;
  clinica_id?: number;
  nome?: string;
  conselho?: string;
  numero_conselho?: string;
  uf?: string;
  cbos?: string;
  cpf?: string;
}

// Interface para Guia Profissional
export interface GuiaProfissionalFinanceiro extends RowDataPacket {
  id: number;
  lote_id: number;
  clinica_id: number;
  item_id: number;
  profissional_id: number;
  tipo_relacao: 'solicitante' | 'executante';
  grau_participacao?: string;
  created_at: Date;
  updated_at: Date;
}

export interface GuiaProfissionalFinanceiroInput {
  lote_id?: number;
  clinica_id?: number;
  item_id?: number;
  profissional_id?: number;
  tipo_relacao?: 'solicitante' | 'executante';
  grau_participacao?: string;
}

// Interface para Anexos
export interface AnexoFinanceiro extends RowDataPacket {
  id: number;
  lote_id?: number;
  item_id?: number;
  clinica_id: number;
  tipo_anexo: 'documento' | 'historico';
  tipo_documento?: string;
  nome_arquivo?: string;
  caminho_arquivo?: string;
  tamanho_arquivo?: number;
  mime_type?: string;
  acao?: string;
  valor_anterior?: string;
  valor_novo?: string;
  descricao?: string;
  usuario_id?: number;
  created_at: Date;
}

export interface AnexoFinanceiroInput {
  lote_id?: number;
  item_id?: number;
  clinica_id?: number;
  tipo_anexo?: 'documento' | 'historico';
  tipo_documento?: string;
  nome_arquivo?: string;
  caminho_arquivo?: string;
  tamanho_arquivo?: number;
  mime_type?: string;
  acao?: string;
  valor_anterior?: string;
  valor_novo?: string;
  descricao?: string;
  usuario_id?: number;
}

// ==================== MODELO PRINCIPAL ====================

export class FinanceiroCompactModel {
  
  // ==================== LOTES ====================
  
  static async createLote(lote: LoteFinanceiroInput): Promise<number> {
    console.log('🔧 Criando lote com dados:', lote);
    
    // Verificar se o lote já existe
    const [existingLotes] = await pool.execute<LoteFinanceiro[]>(
      'SELECT id FROM financeiro_lotes WHERE clinica_id = ? AND numero_lote = ? AND operadora_registro_ans = ?',
      [lote.clinica_id, lote.numero_lote, lote.operadora_registro_ans]
    );
    
    if (existingLotes.length > 0) {
      console.log('⚠️ Lote já existe, retornando ID existente:', existingLotes[0].id);
      return existingLotes[0].id;
    }
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_lotes (
        clinica_id, operadora_registro_ans, operadora_nome, numero_lote,
        competencia, data_envio, quantidade_guias, valor_total, status,
        arquivo_xml, tipo_transacao, sequencial_transacao, data_registro_transacao,
        hora_registro_transacao, cnpj_prestador, nome_prestador, registro_ans,
        padrao_tiss, hash_lote, cnes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lote.clinica_id || null,
        lote.operadora_registro_ans || null,
        lote.operadora_nome || null,
        lote.numero_lote || null,
        lote.competencia || null,
        lote.data_envio || null,
        lote.quantidade_guias || 0,
        lote.valor_total || 0,
        lote.status || 'pendente',
        lote.arquivo_xml || null,
        lote.tipo_transacao || null,
        lote.sequencial_transacao || null,
        lote.data_registro_transacao || null,
        lote.hora_registro_transacao || null,
        lote.cnpj_prestador || null,
        lote.nome_prestador || null,
        lote.registro_ans || null,
        lote.padrao_tiss || null,
        lote.hash_lote || null,
        lote.cnes || null
      ]
    );
    return result.insertId;
  }

  static async getLotesByClinica(clinicaId: number): Promise<LoteFinanceiro[]> {
    const [rows] = await pool.execute<LoteFinanceiro[]>(
      `SELECT 
        fl.*,
        op.nome as operadora_nome_real
       FROM financeiro_lotes fl
       LEFT JOIN operadoras op ON fl.operadora_registro_ans = op.registroANS
       WHERE fl.clinica_id = ? 
       ORDER BY fl.data_envio DESC`,
      [clinicaId]
    );

    // Garantir que valor_total seja número e substituir nome da operadora
    return rows.map(lote => {
      const loteProcessado = lote as any;
      return {
        ...loteProcessado,
        operadora_nome: loteProcessado.operadora_nome_real || loteProcessado.operadora_nome,
        valor_total: parseFloat(lote.valor_total as any) || 0,
        quantidade_guias: parseInt(lote.quantidade_guias as any) || 0
      };
    });
  }

  static async getLoteById(loteId: number): Promise<LoteFinanceiro | null> {
    const [rows] = await pool.execute<LoteFinanceiro[]>(
      `SELECT 
        fl.*,
        op.nome as operadora_nome_real
       FROM financeiro_lotes fl
       LEFT JOIN operadoras op ON fl.operadora_registro_ans = op.registroANS
       WHERE fl.id = ?`,
      [loteId]
    );
    
    if (!rows[0]) return null;
    
    // Substituir operadora_nome pelo nome real da tabela operadoras se existir
    const lote = rows[0] as any;
    if (lote.operadora_nome_real) {
      lote.operadora_nome = lote.operadora_nome_real;
    }
    
    return lote;
  }

  // Buscar lote com dados completos para visualização
  static async getLoteCompleto(loteId: number): Promise<any> {
    const lote = await this.getLoteById(loteId);
    if (!lote) return null;

    console.log('📋 Dados do lote do banco:', {
      tipo_transacao: lote.tipo_transacao,
      sequencial_transacao: lote.sequencial_transacao,
      data_registro_transacao: lote.data_registro_transacao,
      hora_registro_transacao: lote.hora_registro_transacao,
      cnpj_prestador: lote.cnpj_prestador,
      nome_prestador: lote.nome_prestador,
      registro_ans: lote.registro_ans,
      padrao_tiss: lote.padrao_tiss,
      cnes: lote.cnes,
      hash_lote: lote.hash_lote
    });

    // Buscar guias do lote
    const guias = await this.getGuiasByLote(loteId);

    // Buscar CNES da primeira guia (se não estiver no lote)
    const primeiraGuia = guias.find(g => g.tipo_item === 'guia');
    const cnes = lote.cnes || primeiraGuia?.cnes || 'N/A';

    // Estruturar dados para o frontend
    const dadosCompletos = {
      cabecalho: {
        tipoTransacao: lote.tipo_transacao || 'N/A',
        sequencialTransacao: lote.sequencial_transacao || 'N/A',
        dataRegistroTransacao: lote.data_registro_transacao || 'N/A',
        horaRegistroTransacao: lote.hora_registro_transacao || 'N/A',
        cnpjPrestador: lote.cnpj_prestador || 'N/A',
        nomePrestador: lote.nome_prestador || 'N/A',
        registroANS: lote.registro_ans || 'N/A',
        padrao: lote.padrao_tiss || 'N/A',
        cnes: cnes,  // Usar CNES do lote ou da primeira guia
        hash: lote.hash_lote || 'N/A'
      },
      lote: {
        numeroLote: lote.numero_lote || 'N/A',
        competencia: lote.competencia || 'N/A',
        data_envio: lote.data_envio || null,
        valor_total: lote.valor_total || 0
      },
      operadora: {
        registro_ans: lote.operadora_registro_ans || 'N/A',
        nome: lote.operadora_nome || 'N/A'
      },
      versao_tiss: '4.01.00', // Versão padrão
      hash_xml: lote.hash_lote || 'N/A',
      guias: guias.map(guia => ({
        cabecalhoGuia: {
          numeroGuiaPrestador: guia.numero_guia_prestador || 'N/A',
          registroANS: lote.registro_ans || 'N/A'
        },
        dadosBeneficiario: {
          numeroCarteira: guia.numero_carteira || 'N/A'
        },
        dadosAutorizacao: {
          dataAutorizacao: guia.data_autorizacao || 'N/A',
          senha: guia.senha || 'N/A'
        },
        dadosSolicitante: {
          profissional: {
            nomeProfissional: guia.profissional_nome || 'N/A',
            conselhoProfissional: guia.profissional_conselho || 'N/A',
            numeroConselhoProfissional: guia.profissional_numero_conselho || 'N/A'
          }
        },
        dadosSolicitacao: {
          indicacaoClinica: guia.indicacao_clinica || 'N/A'
        },
        valorTotal: {
          valorTotalGeral: guia.valor_total || 0
        },
        // Dados para medicamentos, materiais, taxas e procedimentos
        medicamentos: [],
        materiais: [],
        taxas: [],
        procedimentos: [],
        profissionais: []
      }))
    };

    console.log('✅ Cabeçalho retornado para frontend:', dadosCompletos.cabecalho);
    return dadosCompletos;
  }

  static async updateLoteStatus(loteId: number, status: string): Promise<void> {
    await pool.execute(
      'UPDATE financeiro_lotes SET status = ? WHERE id = ?',
      [status, loteId]
    );
  }

  // ==================== ITEMS (GUIAS, PROCEDIMENTOS, DESPESAS) ====================
  
  static async createItem(item: ItemFinanceiroInput): Promise<number> {
    console.log('🔧 Criando item com dados:', item);
    
    try {
      // Usar todas as 58 colunas da tabela financeiro_items (58 valores, 58 ?)
      const values = [
        item.lote_id || null,
        item.clinica_id || null,
        item.competencia || null,
        item.tipo_item || null,
        item.numero_guia_prestador || null,
        item.numero_guia_operadora || null,
        item.numero_carteira || null,
        item.data_autorizacao || null,
        item.data_execucao || null,
        item.codigo_item || null,
        item.descricao_item || null,
        item.quantidade_executada || 1,
        item.valor_unitario || 0,
        item.valor_total || 0,
        item.status_pagamento || 'pendente',
        item.valor_pago || 0,
        item.data_pagamento || null,
        item.parent_id || null,
        item.profissional_nome || null,
        item.profissional_conselho || null,
        item.profissional_numero_conselho || null,
        item.profissional_uf || null,
        item.profissional_cbos || null,
        item.indicacao_clinica || null,
        item.tipo_atendimento || null,
        item.carater_atendimento || null,
        item.regime_atendimento || null,
        item.cnes || null,
        item.cnpj_prestador || null,
        item.hash_xml || null,
        item.observacoes || null,
        item.guia_principal || null,
        item.senha || null,
        item.data_validade_senha || null,
        item.data_solicitacao || null,
        item.atendimento_rn || null,
        item.beneficiario_nome || null,
        item.valor_procedimentos || null,
        item.valor_medicamentos || null,
        item.valor_materiais || null,
        item.valor_taxas_alugueis || item.valor_taxas || null,
        item.codigo_despesa || null,
        item.codigo_tabela || null,
        item.unidade_medida || null,
        item.reducao_acrescimo || null,
        item.hora_inicial || null,
        item.hora_final || null,
        item.sequencial_item || null,
        item.via_acesso || null,
        item.grau_participacao || null,
        item.executante_cpf || null,
        item.executante_nome || null,
        item.executante_conselho || null,
        item.executante_numero_conselho || null,
        item.executante_uf || null,
        item.executante_cbos || null,
        item.indicacao_acidente || null
      ];
      
      console.log('📊 Total de valores:', values.length);
      
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO financeiro_items (
          lote_id, clinica_id, competencia, tipo_item, numero_guia_prestador, numero_guia_operadora,
          numero_carteira, data_autorizacao, data_execucao, codigo_item, descricao_item,
          quantidade_executada, valor_unitario, valor_total, status_pagamento,
          valor_pago, data_pagamento, parent_id, profissional_nome, profissional_conselho,
          profissional_numero_conselho, profissional_uf, profissional_cbos, indicacao_clinica,
          tipo_atendimento, carater_atendimento, regime_atendimento, cnes, cnpj_prestador,
          hash_xml, observacoes, guia_principal, senha, data_validade_senha, data_solicitacao,
          atendimento_rn, beneficiario_nome, valor_procedimentos, valor_medicamentos,
          valor_materiais, valor_taxas_alugueis, codigo_despesa, codigo_tabela,
          unidade_medida, reducao_acrescimo, hora_inicial, hora_final, sequencial_item,
          via_acesso, grau_participacao, executante_cpf, executante_nome, executante_conselho,
          executante_numero_conselho, executante_uf, executante_cbos, indicacao_acidente
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
      
      console.log('✅ Item criado com ID:', result.insertId);
      return result.insertId;
    } catch (error: any) {
      console.error('❌ Erro ao criar item:', error.message);
      console.error('❌ SQL:', error.sql);
      throw error;
    }
  }

  // Criar guia
  static async createGuia(guia: ItemFinanceiroInput): Promise<number> {
    return this.createItem({ ...guia, tipo_item: 'guia' });
  }

  // Criar procedimento (vinculado a uma guia)
  static async createProcedimento(procedimento: ItemFinanceiroInput): Promise<number> {
    return this.createItem({ ...procedimento, tipo_item: 'procedimento' });
  }

  // Criar despesa (vinculada a uma guia)
  static async createDespesa(despesa: ItemFinanceiroInput): Promise<number> {
    return this.createItem({ ...despesa, tipo_item: 'despesa' });
  }

  // Buscar guias por lote
  static async getGuiasByLote(loteId: number): Promise<ItemFinanceiro[]> {
    console.log('🔧 Buscando guias para lote ID:', loteId);
    
    try {
      // Primeiro, verificar se existem itens para este lote
      const [allItems] = await pool.execute<ItemFinanceiro[]>(
        'SELECT * FROM financeiro_items WHERE lote_id = ?',
        [loteId]
      );
      console.log('📋 Total de itens no lote:', allItems.length);
      console.log('📋 Total de itens retornados:', allItems.length);
      console.log('  - Guias:', allItems.filter(i => i.tipo_item === 'guia').length);
      console.log('  - Procedimentos:', allItems.filter(i => i.tipo_item === 'procedimento').length);
      console.log('  - Despesas:', allItems.filter(i => i.tipo_item === 'despesa').length);

      return allItems;
    } catch (error) {
      console.error('❌ Erro ao buscar itens:', error);
      throw error;
    }
  }

  // Buscar procedimentos por guia
  static async getProcedimentosByGuia(guiaId: number): Promise<ItemFinanceiro[]> {
    const [rows] = await pool.execute<ItemFinanceiro[]>(
      'SELECT * FROM financeiro_items WHERE parent_id = ? AND tipo_item = "procedimento" ORDER BY codigo_item',
      [guiaId]
    );
    return rows;
  }

  // Método de teste para verificar todos os itens de um lote
  static async getAllItemsByLote(loteId: number): Promise<ItemFinanceiro[]> {
    console.log('🔧 Buscando TODOS os itens para lote ID:', loteId);
    
    try {
      const [rows] = await pool.execute<ItemFinanceiro[]>(
        'SELECT * FROM financeiro_items WHERE lote_id = ? ORDER BY tipo_item, id',
        [loteId]
      );
      console.log('📋 Todos os itens encontrados:', rows.length);
      console.log('📋 Tipos de itens:', rows.map(item => item.tipo_item));
      return rows;
    } catch (error) {
      console.error('❌ Erro ao buscar todos os itens:', error);
      throw error;
    }
  }

  // Buscar despesas por guia
  static async getDespesasByGuia(guiaId: number): Promise<ItemFinanceiro[]> {
    const [rows] = await pool.execute<ItemFinanceiro[]>(
      'SELECT * FROM financeiro_items WHERE parent_id = ? AND tipo_item = "despesa" ORDER BY codigo_item',
      [guiaId]
    );
    return rows;
  }

  // Atualizar status de item
  static async updateItemStatus(itemId: number, status: string): Promise<void> {
    await pool.execute(
      'UPDATE financeiro_items SET status_pagamento = ? WHERE id = ?',
      [status, itemId]
    );
  }

  // ==================== PROFISSIONAIS ====================
  
  static async createProfissional(profissional: ProfissionalFinanceiroInput): Promise<number> {
    console.log('🔧 Criando profissional:', profissional);
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_profissionais (
        lote_id, clinica_id, nome, conselho, numero_conselho, uf, cbos, cpf
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profissional.lote_id || null,
        profissional.clinica_id || null,
        profissional.nome || null,
        profissional.conselho || null,
        profissional.numero_conselho || null,
        profissional.uf || null,
        profissional.cbos || null,
        profissional.cpf || null,
      ]
    );
    return result.insertId;
  }

  static async getProfissionaisByLote(loteId: number): Promise<ProfissionalFinanceiro[]> {
    const [rows] = await pool.execute<ProfissionalFinanceiro[]>(
      'SELECT * FROM financeiro_profissionais WHERE lote_id = ? ORDER BY nome',
      [loteId]
    );
    return rows;
  }

  // ==================== GUIA PROFISSIONAL ====================
  
  static async createGuiaProfissional(guiaProfissional: GuiaProfissionalFinanceiroInput): Promise<number> {
    console.log('🔧 Criando guia profissional:', guiaProfissional);
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_guia_profissional (
        lote_id, clinica_id, item_id, profissional_id, tipo_relacao, grau_participacao
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        guiaProfissional.lote_id || null,
        guiaProfissional.clinica_id || null,
        guiaProfissional.item_id || null,
        guiaProfissional.profissional_id || null,
        guiaProfissional.tipo_relacao || null,
        guiaProfissional.grau_participacao || null,
      ]
    );
    return result.insertId;
  }

  // ==================== ANEXOS ====================
  
  static async createAnexo(anexo: AnexoFinanceiroInput): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO financeiro_anexos (
        lote_id, item_id, clinica_id, tipo_anexo, tipo_documento, nome_arquivo,
        caminho_arquivo, tamanho_arquivo, mime_type, acao, valor_anterior,
        valor_novo, descricao, usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        anexo.lote_id,
        anexo.item_id,
        anexo.clinica_id,
        anexo.tipo_anexo,
        anexo.tipo_documento,
        anexo.nome_arquivo,
        anexo.caminho_arquivo,
        anexo.tamanho_arquivo,
        anexo.mime_type,
        anexo.acao,
        anexo.valor_anterior,
        anexo.valor_novo,
        anexo.descricao,
        anexo.usuario_id,
      ]
    );
    return result.insertId;
  }

  // Anexar documento a uma guia
  static async anexarDocumento(guiaId: number, documento: AnexoFinanceiroInput): Promise<number> {
    return this.createAnexo({
      ...documento,
      item_id: guiaId,
      tipo_anexo: 'documento'
    });
  }

  // Criar histórico de alteração
  static async criarHistorico(historico: AnexoFinanceiroInput): Promise<number> {
    return this.createAnexo({
      ...historico,
      tipo_anexo: 'historico'
    });
  }

  // Buscar documentos por item
  static async getDocumentosByItem(itemId: number): Promise<AnexoFinanceiro[]> {
    const [rows] = await pool.execute<AnexoFinanceiro[]>(
      'SELECT * FROM financeiro_anexos WHERE item_id = ? AND tipo_anexo = "documento" ORDER BY created_at DESC',
      [itemId]
    );
    return rows;
  }

  // Buscar histórico por item
  static async getHistoricoByItem(itemId: number): Promise<AnexoFinanceiro[]> {
    const [rows] = await pool.execute<AnexoFinanceiro[]>(
      'SELECT * FROM financeiro_anexos WHERE item_id = ? AND tipo_anexo = "historico" ORDER BY created_at DESC',
      [itemId]
    );
    return rows;
  }

  // ==================== ESTATÍSTICAS ====================
  
  static async getEstatisticas(clinicaId: number): Promise<any> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT l.id) as total_lotes,
        COUNT(DISTINCT CASE WHEN i.tipo_item = 'guia' THEN i.id END) as total_guias,
        COUNT(DISTINCT CASE WHEN i.tipo_item = 'procedimento' THEN i.id END) as total_procedimentos,
        COUNT(DISTINCT CASE WHEN i.tipo_item = 'despesa' THEN i.id END) as total_despesas,
        COALESCE(SUM(l.valor_total), 0) as valor_total,
        COALESCE(SUM(CASE WHEN l.status = 'pago' THEN l.valor_total ELSE 0 END), 0) as valor_pago,
        COALESCE(SUM(CASE WHEN l.status = 'pendente' THEN l.valor_total ELSE 0 END), 0) as valor_pendente,
        COALESCE(SUM(CASE WHEN l.status = 'glosado' THEN l.valor_total ELSE 0 END), 0) as valor_glosado
      FROM financeiro_lotes l
      LEFT JOIN financeiro_items i ON l.id = i.lote_id
      WHERE l.clinica_id = ?`,
      [clinicaId]
    );
    return rows[0];
  }

  // ==================== MÉTODOS UTILITÁRIOS ====================
  
  // Processar XML TISS e criar estrutura completa
  static async processarXMLTISS(xmlData: any, clinicaId: number, operadoraId?: number): Promise<number> {
    console.log('🔧 Processando XML TISS para clínica:', clinicaId);
    console.log('🏢 Operadora ID fornecida:', operadoraId);
    console.log('📋 Dados recebidos:', JSON.stringify(xmlData, null, 2));
    
    try {
    // Buscar dados da operadora se operadoraId foi fornecido
    let operadoraData = {
      registro_ans: xmlData.operadora?.registro_ans || null,
      nome: xmlData.operadora?.nome || null
    };

    if (operadoraId) {
      console.log('🔍 Buscando dados da operadora ID:', operadoraId);
      const [operadoraRows] = await pool.execute<RowDataPacket[]>(
        'SELECT registroANS as registro_ans, nome FROM operadoras WHERE id = ? AND status = ?',
        [operadoraId, 'ativo']
      );
      
      if (operadoraRows.length > 0) {
        operadoraData = {
          registro_ans: operadoraRows[0].registro_ans,
          nome: operadoraRows[0].nome
        };
        console.log('✅ Dados da operadora encontrados:', operadoraData);
      } else {
        console.log('⚠️ Operadora não encontrada, usando dados do XML');
      }
    }

    // 1. Criar lote com validação de valores
    const loteId = await this.createLote({
      clinica_id: clinicaId,
      operadora_registro_ans: operadoraData.registro_ans,
      operadora_nome: operadoraData.nome,
      numero_lote: xmlData.lote?.numero || null,
      competencia: xmlData.lote?.competencia || null,
      data_envio: xmlData.lote?.data_envio || null,
      quantidade_guias: xmlData.guias?.length || 0,
      valor_total: xmlData.lote?.valor_total || 0,
      arquivo_xml: xmlData.nome_arquivo || null,
      tipo_transacao: xmlData.cabecalho?.tipoTransacao || null,
      sequencial_transacao: xmlData.cabecalho?.sequencialTransacao || null,
      data_registro_transacao: xmlData.cabecalho?.dataRegistroTransacao || null,
      hora_registro_transacao: xmlData.cabecalho?.horaRegistroTransacao || null,
      cnpj_prestador: xmlData.cabecalho?.cnpjPrestador || null,
      nome_prestador: xmlData.cabecalho?.nomePrestador || null,
      registro_ans: xmlData.cabecalho?.registroANS || null,
      padrao_tiss: xmlData.cabecalho?.padrao || null,
      hash_lote: xmlData.cabecalho?.hash || null,
      cnes: xmlData.cabecalho?.cnes || null,
      status: 'pendente'
    });

    console.log('✅ Lote criado com ID:', loteId);

    // 2. Criar guias e seus itens
    if (xmlData.guias && Array.isArray(xmlData.guias)) {
      console.log(`📋 Processando ${xmlData.guias.length} guias...`);
      
      for (const guiaData of xmlData.guias) {
        console.log('🔧 Processando guia:', guiaData.numero_guia_prestador);
        console.log('📋 Dados da guia:', JSON.stringify(guiaData, null, 2));
        
        // Criar guia principal
        const guiaId = await this.createGuia({
          lote_id: loteId,
          clinica_id: clinicaId,
          competencia: xmlData.lote?.competencia || null,
          numero_guia_prestador: guiaData.numero_guia_prestador || null,
          numero_guia_operadora: guiaData.numero_guia_operadora || null,
          numero_carteira: guiaData.numero_carteira || null,
          data_autorizacao: guiaData.data_autorizacao || null,
          data_execucao: guiaData.data_execucao || null,
          codigo_item: 'GUIA', // Identificador para a guia principal
          descricao_item: `Guia ${guiaData.numero_guia_prestador}`,
          quantidade_executada: 1,
          valor_unitario: guiaData.valor_total || 0,
          valor_total: guiaData.valor_total || 0,
          status_pagamento: 'pendente',
          // Dados do profissional
          profissional_nome: guiaData.profissional_solicitante?.nome || null,
          profissional_conselho: guiaData.profissional_solicitante?.conselho || null,
          profissional_numero_conselho: guiaData.profissional_solicitante?.numero_conselho || null,
          profissional_uf: guiaData.profissional_solicitante?.uf || null,
          profissional_cbos: guiaData.profissional_solicitante?.cbos || null,
          // Dados clínicos
          indicacao_clinica: guiaData.indicacao_clinica || null,
          tipo_atendimento: guiaData.tipo_atendimento || null,
          carater_atendimento: guiaData.carater_atendimento || null,
          regime_atendimento: guiaData.regime_atendimento || null,
          // Dados do prestador
          cnes: guiaData.cnes || null,
          cnpj_prestador: guiaData.cnpj_prestador || null,
          // Dados adicionais
          senha: guiaData.senha || null,
          data_validade_senha: guiaData.data_validade_senha || null,
          data_solicitacao: guiaData.data_solicitacao || null,
          // Valores por categoria
          valor_procedimentos: guiaData.valor_procedimentos || 0,
          valor_medicamentos: guiaData.valor_medicamentos || 0,
          valor_materiais: guiaData.valor_materiais || 0,
          valor_taxas_alugueis: guiaData.valor_taxas || 0
        });

        console.log('✅ Guia criada com ID:', guiaId);

        // Os dados do profissional solicitante já estão salvos na guia
        // (profissional_nome, profissional_conselho, etc.)

        // Criar procedimentos executados
        if (guiaData.procedimentos && Array.isArray(guiaData.procedimentos)) {
          console.log(`📋 Processando ${guiaData.procedimentos.length} procedimentos para guia ${guiaData.numero_guia_prestador}`);
          for (const procedimento of guiaData.procedimentos) {
            const procedimentoId = await this.createProcedimento({
              lote_id: loteId,
              clinica_id: clinicaId,
              competencia: xmlData.lote?.competencia || null,
              parent_id: guiaId,
              numero_guia_prestador: guiaData.numero_guia_prestador,
              numero_guia_operadora: guiaData.numero_guia_operadora,
              numero_carteira: guiaData.numero_carteira,
              data_autorizacao: guiaData.data_autorizacao,
              data_execucao: procedimento.data_execucao || null,
              codigo_item: procedimento.codigo_procedimento || null,
              descricao_item: procedimento.descricao_procedimento || null,
              quantidade_executada: procedimento.quantidade_executada || 1,
              valor_unitario: procedimento.valor_unitario || 0,
              valor_total: procedimento.valor_total || 0,
              status_pagamento: 'pendente',
              // Campos adicionais importantes
              codigo_tabela: procedimento.codigo_tabela || null,
              sequencial_item: procedimento.sequencial_item || null,
              hora_inicial: procedimento.hora_inicial || null,
              hora_final: procedimento.hora_final || null,
              via_acesso: procedimento.via_acesso || null,
              reducao_acrescimo: procedimento.reducao_acrescimo || 1.0,
              unidade_medida: procedimento.unidade_medida || null,
              // Dados da equipe executante
              grau_participacao: procedimento.equipe?.grau_participacao || null,
              executante_cpf: procedimento.equipe?.cpf_profissional || null,
              executante_nome: procedimento.equipe?.nome_profissional || null,
              executante_conselho: procedimento.equipe?.conselho || null,
              executante_numero_conselho: procedimento.equipe?.numero_conselho || null,
              executante_uf: procedimento.equipe?.uf || null,
              executante_cbos: procedimento.equipe?.cbos || null
            });
            console.log(`✅ Procedimento ${procedimento.codigo_procedimento} criado com ID: ${procedimentoId}`);

            // Os dados da equipe executante já estão salvos no procedimento
            // (executante_nome, executante_cpf, executante_conselho, etc.)
          }
        }

        // Criar despesas (medicamentos, materiais, taxas)
        if (guiaData.medicamentos && Array.isArray(guiaData.medicamentos)) {
          console.log(`📋 Processando ${guiaData.medicamentos.length} medicamentos para guia ${guiaData.numero_guia_prestador}`);
          for (const medicamento of guiaData.medicamentos) {
            const medicamentoId = await this.createDespesa({
              lote_id: loteId,
              clinica_id: clinicaId,
              competencia: xmlData.lote?.competencia || null,
              parent_id: guiaId,
              numero_guia_prestador: guiaData.numero_guia_prestador,
              numero_guia_operadora: guiaData.numero_guia_operadora,
              numero_carteira: guiaData.numero_carteira,
              data_autorizacao: guiaData.data_autorizacao,
              data_execucao: medicamento.data_execucao || null,
              codigo_item: medicamento.codigo_medicamento || null,
              descricao_item: medicamento.descricao || 'Medicamentos',
              quantidade_executada: medicamento.quantidade_executada || 1,
              valor_unitario: medicamento.valor_unitario || 0,
              valor_total: medicamento.valor_total || 0,
              status_pagamento: 'pendente',
              // Campos adicionais de despesas
              codigo_despesa: medicamento.codigo_despesa || '02', // 02 = Medicamento
              codigo_tabela: medicamento.codigo_tabela || null,
              sequencial_item: medicamento.sequencial_item || null,
              hora_inicial: medicamento.hora_inicial || null,
              hora_final: medicamento.hora_final || null,
              unidade_medida: medicamento.unidade_medida || null,
              reducao_acrescimo: medicamento.reducao_acrescimo || 1.0
            });
            console.log(`✅ Medicamento ${medicamento.codigo_medicamento} criado com ID: ${medicamentoId}`);
          }
        }

        if (guiaData.materiais && Array.isArray(guiaData.materiais)) {
          console.log(`📋 Processando ${guiaData.materiais.length} materiais para guia ${guiaData.numero_guia_prestador}`);
          for (const material of guiaData.materiais) {
            const materialId = await this.createDespesa({
              lote_id: loteId,
              clinica_id: clinicaId,
              competencia: xmlData.lote?.competencia || null,
              parent_id: guiaId,
              numero_guia_prestador: guiaData.numero_guia_prestador,
              numero_guia_operadora: guiaData.numero_guia_operadora,
              numero_carteira: guiaData.numero_carteira,
              data_autorizacao: guiaData.data_autorizacao,
              data_execucao: material.data_execucao || null,
              codigo_item: material.codigo_material || null,
              descricao_item: material.descricao || 'Materiais',
              quantidade_executada: material.quantidade_executada || 1,
              valor_unitario: material.valor_unitario || 0,
              valor_total: material.valor_total || 0,
              status_pagamento: 'pendente',
              // Campos adicionais de despesas
              codigo_despesa: material.codigo_despesa || '03', // 03 = Material
              codigo_tabela: material.codigo_tabela || null,
              sequencial_item: material.sequencial_item || null,
              hora_inicial: material.hora_inicial || null,
              hora_final: material.hora_final || null,
              unidade_medida: material.unidade_medida || null,
              reducao_acrescimo: material.reducao_acrescimo || 1.0
            });
            console.log(`✅ Material ${material.codigo_material} criado com ID: ${materialId}`);
          }
        }

        if (guiaData.taxas && Array.isArray(guiaData.taxas)) {
          console.log(`📋 Processando ${guiaData.taxas.length} taxas para guia ${guiaData.numero_guia_prestador}`);
          for (const taxa of guiaData.taxas) {
            const taxaId = await this.createDespesa({
              lote_id: loteId,
              clinica_id: clinicaId,
              competencia: xmlData.lote?.competencia || null,
              parent_id: guiaId,
              numero_guia_prestador: guiaData.numero_guia_prestador,
              numero_guia_operadora: guiaData.numero_guia_operadora,
              numero_carteira: guiaData.numero_carteira,
              data_autorizacao: guiaData.data_autorizacao,
              data_execucao: taxa.data_execucao || null,
              codigo_item: taxa.codigo_taxa || null,
              descricao_item: taxa.descricao || 'Taxas',
              quantidade_executada: taxa.quantidade_executada || 1,
              valor_unitario: taxa.valor_unitario || 0,
              valor_total: taxa.valor_total || 0,
              status_pagamento: 'pendente',
              // Campos adicionais de despesas
              codigo_despesa: taxa.codigo_despesa || '07', // 07 = Taxa/Aluguel
              codigo_tabela: taxa.codigo_tabela || null,
              sequencial_item: taxa.sequencial_item || null,
              hora_inicial: taxa.hora_inicial || null,
              hora_final: taxa.hora_final || null,
              unidade_medida: taxa.unidade_medida || null,
              reducao_acrescimo: taxa.reducao_acrescimo || 1.0
            });
            console.log(`✅ Taxa ${taxa.codigo_taxa} criada com ID: ${taxaId}`);
          }
        }
      }
    }

    console.log('✅ Processamento XML TISS concluído');
    return loteId;
    
    } catch (error) {
      console.error('❌ Erro no processarXMLTISS:', error);
      throw error;
    }
  }
}

export default FinanceiroCompactModel;
