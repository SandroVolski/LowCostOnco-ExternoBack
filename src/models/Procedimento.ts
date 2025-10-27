// src/models/Procedimento.ts

import { query } from '../config/database';

export type CategoriaProcedimento = 'honorarios' | 'taxas_diarias' | 'materiais_medicamentos';
export type StatusProcedimento = 'ativo' | 'inativo';
export type StatusNegociacao = 'ativo' | 'inativo' | 'vencido';

export interface Procedimento {
  id?: number;
  clinica_id: number;
  codigo: string;
  descricao: string;
  categoria: CategoriaProcedimento;
  unidade_pagamento: string;
  fracionamento: boolean;
  status: StatusProcedimento;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProcedimentoOperadora {
  id?: number;
  procedimento_id: number;
  operadora_id: number;
  clinica_id: number;
  valor: number;
  credenciado: boolean;
  data_inicio: string; // formato: YYYY-MM-DD
  data_fim?: string | null; // formato: YYYY-MM-DD ou null
  status: StatusNegociacao;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Campos extras para joins
  procedimento_codigo?: string;
  procedimento_descricao?: string;
  operadora_nome?: string;
  operadora_codigo?: string;
}

export interface ProcedimentoComNegociacoes extends Procedimento {
  negociacoes?: ProcedimentoOperadora[];
}

export interface ProcedimentoCreateInput {
  clinica_id: number;
  codigo: string;
  descricao: string;
  categoria: CategoriaProcedimento;
  unidade_pagamento: string;
  fracionamento: boolean;
  status?: StatusProcedimento;
  observacoes?: string;
}

export interface ProcedimentoUpdateInput {
  codigo?: string;
  descricao?: string;
  categoria?: CategoriaProcedimento;
  unidade_pagamento?: string;
  fracionamento?: boolean;
  status?: StatusProcedimento;
  observacoes?: string;
}

export interface NegociacaoCreateInput {
  procedimento_id: number;
  operadora_id: number;
  clinica_id: number;
  valor: number;
  credenciado: boolean;
  data_inicio: string;
  data_fim?: string | null;
  status?: StatusNegociacao;
  observacoes?: string;
}

export interface NegociacaoUpdateInput {
  valor?: number;
  credenciado?: boolean;
  data_inicio?: string;
  data_fim?: string | null;
  status?: StatusNegociacao;
  observacoes?: string;
}

export class ProcedimentoModel {
  
  // ==================== PROCEDIMENTOS ====================
  
  /**
   * Buscar todos os procedimentos de uma clínica
   */
  static async findByClinicaId(clinicaId: number): Promise<Procedimento[]> {
    try {
      const sql = `
        SELECT * FROM procedimentos 
        WHERE clinica_id = ?
        ORDER BY categoria, codigo
      `;
      const result = await query(sql, [clinicaId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
      throw new Error('Erro ao buscar procedimentos');
    }
  }
  
  /**
   * Buscar procedimento por ID
   */
  static async findById(id: number): Promise<Procedimento | null> {
    try {
      const sql = `SELECT * FROM procedimentos WHERE id = ?`;
      const result = await query(sql, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar procedimento:', error);
      throw new Error('Erro ao buscar procedimento');
    }
  }
  
  /**
   * Buscar procedimento com suas negociações
   */
  static async findByIdWithNegociacoes(id: number): Promise<ProcedimentoComNegociacoes | null> {
    try {
      const procedimento = await this.findById(id);
      if (!procedimento) return null;
      
      const negociacoes = await this.getNegociacoesByProcedimento(id);
      
      return {
        ...procedimento,
        negociacoes
      };
    } catch (error) {
      console.error('Erro ao buscar procedimento com negociações:', error);
      throw new Error('Erro ao buscar procedimento com negociações');
    }
  }
  
  /**
   * Criar novo procedimento
   */
  static async create(data: ProcedimentoCreateInput): Promise<Procedimento> {
    try {
      const sql = `
        INSERT INTO procedimentos (
          clinica_id, codigo, descricao, categoria, 
          unidade_pagamento, fracionamento, status, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        data.clinica_id,
        data.codigo,
        data.descricao,
        data.categoria,
        data.unidade_pagamento,
        data.fracionamento ? 1 : 0,
        data.status || 'ativo',
        data.observacoes || null
      ];
      
      const result = await query(sql, values);
      const newProcedimento = await this.findById(result.insertId);
      
      if (!newProcedimento) {
        throw new Error('Erro ao recuperar procedimento criado');
      }
      
      return newProcedimento;
    } catch (error) {
      console.error('Erro ao criar procedimento:', error);
      throw new Error('Erro ao criar procedimento');
    }
  }
  
  /**
   * Atualizar procedimento
   */
  static async update(id: number, data: ProcedimentoUpdateInput): Promise<Procedimento> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      
      if (data.codigo !== undefined) {
        fields.push('codigo = ?');
        values.push(data.codigo);
      }
      if (data.descricao !== undefined) {
        fields.push('descricao = ?');
        values.push(data.descricao);
      }
      if (data.categoria !== undefined) {
        fields.push('categoria = ?');
        values.push(data.categoria);
      }
      if (data.unidade_pagamento !== undefined) {
        fields.push('unidade_pagamento = ?');
        values.push(data.unidade_pagamento);
      }
      if (data.fracionamento !== undefined) {
        fields.push('fracionamento = ?');
        values.push(data.fracionamento ? 1 : 0);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        values.push(data.status);
      }
      if (data.observacoes !== undefined) {
        fields.push('observacoes = ?');
        values.push(data.observacoes);
      }
      
      if (fields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }
      
      values.push(id);
      
      const sql = `UPDATE procedimentos SET ${fields.join(', ')} WHERE id = ?`;
      await query(sql, values);
      
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Erro ao recuperar procedimento atualizado');
      }
      
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error);
      throw new Error('Erro ao atualizar procedimento');
    }
  }
  
  /**
   * Deletar procedimento
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const sql = `DELETE FROM procedimentos WHERE id = ?`;
      const result = await query(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar procedimento:', error);
      throw new Error('Erro ao deletar procedimento');
    }
  }
  
  // ==================== NEGOCIAÇÕES ====================
  
  /**
   * Buscar todas as negociações de um procedimento
   */
  static async getNegociacoesByProcedimento(procedimentoId: number): Promise<ProcedimentoOperadora[]> {
    try {
      const sql = `
        SELECT 
          po.*,
          p.codigo as procedimento_codigo,
          p.descricao as procedimento_descricao,
          o.nome as operadora_nome,
          o.codigo as operadora_codigo
        FROM procedimentos_operadora po
        INNER JOIN procedimentos p ON po.procedimento_id = p.id
        INNER JOIN operadoras o ON po.operadora_id = o.id
        WHERE po.procedimento_id = ?
        ORDER BY po.data_inicio DESC
      `;
      const result = await query(sql, [procedimentoId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar negociações do procedimento:', error);
      throw new Error('Erro ao buscar negociações do procedimento');
    }
  }
  
  /**
   * Buscar todas as negociações de uma clínica
   */
  static async getNegociacoesByClinica(clinicaId: number): Promise<ProcedimentoOperadora[]> {
    try {
      const sql = `
        SELECT 
          po.*,
          p.codigo as procedimento_codigo,
          p.descricao as procedimento_descricao,
          o.nome as operadora_nome,
          o.codigo as operadora_codigo
        FROM procedimentos_operadora po
        INNER JOIN procedimentos p ON po.procedimento_id = p.id
        INNER JOIN operadoras o ON po.operadora_id = o.id
        WHERE po.clinica_id = ?
        ORDER BY po.data_inicio DESC
      `;
      const result = await query(sql, [clinicaId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar negociações da clínica:', error);
      throw new Error('Erro ao buscar negociações da clínica');
    }
  }
  
  /**
   * Buscar negociação por ID
   */
  static async findNegociacaoById(id: number): Promise<ProcedimentoOperadora | null> {
    try {
      const sql = `
        SELECT 
          po.*,
          p.codigo as procedimento_codigo,
          p.descricao as procedimento_descricao,
          o.nome as operadora_nome,
          o.codigo as operadora_codigo
        FROM procedimentos_operadora po
        INNER JOIN procedimentos p ON po.procedimento_id = p.id
        INNER JOIN operadoras o ON po.operadora_id = o.id
        WHERE po.id = ?
      `;
      const result = await query(sql, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar negociação:', error);
      throw new Error('Erro ao buscar negociação');
    }
  }
  
  /**
   * Criar nova negociação
   */
  static async createNegociacao(data: NegociacaoCreateInput): Promise<ProcedimentoOperadora> {
    try {
      // Atualizar status de negociações vencidas
      await this.updateVencidas();
      
      const sql = `
        INSERT INTO procedimentos_operadora (
          procedimento_id, operadora_id, clinica_id, valor, 
          credenciado, data_inicio, data_fim, status, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        data.procedimento_id,
        data.operadora_id,
        data.clinica_id,
        data.valor,
        data.credenciado ? 1 : 0,
        data.data_inicio,
        data.data_fim || null,
        data.status || 'ativo',
        data.observacoes || null
      ];
      
      const result = await query(sql, values);
      const newNegociacao = await this.findNegociacaoById(result.insertId);
      
      if (!newNegociacao) {
        throw new Error('Erro ao recuperar negociação criada');
      }
      
      return newNegociacao;
    } catch (error) {
      console.error('Erro ao criar negociação:', error);
      throw new Error('Erro ao criar negociação');
    }
  }
  
  /**
   * Atualizar negociação
   */
  static async updateNegociacao(id: number, data: NegociacaoUpdateInput): Promise<ProcedimentoOperadora> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      
      if (data.valor !== undefined) {
        fields.push('valor = ?');
        values.push(data.valor);
      }
      if (data.credenciado !== undefined) {
        fields.push('credenciado = ?');
        values.push(data.credenciado ? 1 : 0);
      }
      if (data.data_inicio !== undefined) {
        fields.push('data_inicio = ?');
        values.push(data.data_inicio);
      }
      if (data.data_fim !== undefined) {
        fields.push('data_fim = ?');
        values.push(data.data_fim);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        values.push(data.status);
      }
      if (data.observacoes !== undefined) {
        fields.push('observacoes = ?');
        values.push(data.observacoes);
      }
      
      if (fields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }
      
      values.push(id);
      
      const sql = `UPDATE procedimentos_operadora SET ${fields.join(', ')} WHERE id = ?`;
      await query(sql, values);
      
      const updated = await this.findNegociacaoById(id);
      if (!updated) {
        throw new Error('Erro ao recuperar negociação atualizada');
      }
      
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar negociação:', error);
      throw new Error('Erro ao atualizar negociação');
    }
  }
  
  /**
   * Deletar negociação
   */
  static async deleteNegociacao(id: number): Promise<boolean> {
    try {
      const sql = `DELETE FROM procedimentos_operadora WHERE id = ?`;
      const result = await query(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar negociação:', error);
      throw new Error('Erro ao deletar negociação');
    }
  }
  
  /**
   * Atualizar status de negociações vencidas
   */
  static async updateVencidas(): Promise<void> {
    try {
      const sql = `
        UPDATE procedimentos_operadora 
        SET status = 'vencido' 
        WHERE data_fim IS NOT NULL 
          AND data_fim < CURDATE() 
          AND status = 'ativo'
      `;
      await query(sql, []);
    } catch (error) {
      console.error('Erro ao atualizar negociações vencidas:', error);
      // Não lançar erro, apenas logar
    }
  }
  
  /**
   * Buscar negociações vigentes de uma clínica com uma operadora
   */
  static async getNegociacoesVigentes(
    clinicaId: number, 
    operadoraId: number
  ): Promise<ProcedimentoOperadora[]> {
    try {
      await this.updateVencidas();
      
      const sql = `
        SELECT 
          po.*,
          p.codigo as procedimento_codigo,
          p.descricao as procedimento_descricao,
          o.nome as operadora_nome,
          o.codigo as operadora_codigo
        FROM procedimentos_operadora po
        INNER JOIN procedimentos p ON po.procedimento_id = p.id
        INNER JOIN operadoras o ON po.operadora_id = o.id
        WHERE po.clinica_id = ?
          AND po.operadora_id = ?
          AND po.status = 'ativo'
          AND (po.data_fim IS NULL OR po.data_fim >= CURDATE())
        ORDER BY p.categoria, p.codigo
      `;
      const result = await query(sql, [clinicaId, operadoraId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar negociações vigentes:', error);
      throw new Error('Erro ao buscar negociações vigentes');
    }
  }
}

