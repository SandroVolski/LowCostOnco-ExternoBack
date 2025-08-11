// src/models/SolicitacaoAutorizacao.ts - VERSÃO CORRIGIDA

import { query } from '../config/database';
import { SolicitacaoAutorizacao, SolicitacaoCreateInput, SolicitacaoUpdateInput } from '../types/solicitacao';

export class SolicitacaoAutorizacaoModel {
  
  // Criar nova solicitação
  static async create(dadosSolicitacao: SolicitacaoCreateInput): Promise<SolicitacaoAutorizacao> {
    console.log('🔧 Criando nova solicitação de autorização...');
    console.log('📋 Dados recebidos no modelo:', {
      paciente_id: dadosSolicitacao.paciente_id,
      tipo_paciente_id: typeof dadosSolicitacao.paciente_id,
      clinica_id: dadosSolicitacao.clinica_id,
      cliente_nome: dadosSolicitacao.cliente_nome
    });
    
    const insertQuery = `
      INSERT INTO Solicitacoes_Autorizacao (
        clinica_id, paciente_id, hospital_nome, hospital_codigo,
        cliente_nome, cliente_codigo, sexo, data_nascimento, idade, data_solicitacao,
        diagnostico_cid, diagnostico_descricao, local_metastases,
        estagio_t, estagio_n, estagio_m, estagio_clinico,
        tratamento_cirurgia_radio, tratamento_quimio_adjuvante,
        tratamento_quimio_primeira_linha, tratamento_quimio_segunda_linha,
        finalidade, performance_status, siglas, ciclos_previstos, ciclo_atual,
        superficie_corporal, peso, altura,
        medicamentos_antineoplasticos, dose_por_m2, dose_total, via_administracao,
        dias_aplicacao_intervalo, medicacoes_associadas,
        medico_assinatura_crm, numero_autorizacao, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      dadosSolicitacao.clinica_id,
      dadosSolicitacao.paciente_id || null,
      dadosSolicitacao.hospital_nome,
      dadosSolicitacao.hospital_codigo,
      dadosSolicitacao.cliente_nome,
      dadosSolicitacao.cliente_codigo,
      dadosSolicitacao.sexo,
      dadosSolicitacao.data_nascimento,
      dadosSolicitacao.idade,
      dadosSolicitacao.data_solicitacao,
      dadosSolicitacao.diagnostico_cid,
      dadosSolicitacao.diagnostico_descricao,
      dadosSolicitacao.local_metastases || null,
      dadosSolicitacao.estagio_t || null,
      dadosSolicitacao.estagio_n || null,
      dadosSolicitacao.estagio_m || null,
      dadosSolicitacao.estagio_clinico || null,
      dadosSolicitacao.tratamento_cirurgia_radio || null,
      dadosSolicitacao.tratamento_quimio_adjuvante || null,
      dadosSolicitacao.tratamento_quimio_primeira_linha || null,
      dadosSolicitacao.tratamento_quimio_segunda_linha || null,
      dadosSolicitacao.finalidade,
      dadosSolicitacao.performance_status,
      dadosSolicitacao.siglas || null,
      dadosSolicitacao.ciclos_previstos,
      dadosSolicitacao.ciclo_atual,
      dadosSolicitacao.superficie_corporal,
      dadosSolicitacao.peso,
      dadosSolicitacao.altura,
      dadosSolicitacao.medicamentos_antineoplasticos,
      dadosSolicitacao.dose_por_m2,
      dadosSolicitacao.dose_total,
      dadosSolicitacao.via_administracao,
      dadosSolicitacao.dias_aplicacao_intervalo,
      dadosSolicitacao.medicacoes_associadas || null,
      dadosSolicitacao.medico_assinatura_crm,
      dadosSolicitacao.numero_autorizacao || null,
      dadosSolicitacao.observacoes || null
    ];
    
    try {
      console.log('🔧 Executando query de inserção...');
      console.log('📋 Valores a serem inseridos:', values);
      
      const result = await query(insertQuery, values);
      const insertId = result.insertId;
      
      console.log('✅ Solicitação criada com ID:', insertId);
      
      // Buscar a solicitação recém-criada
      const novaSolicitacao = await this.findById(insertId);
      if (!novaSolicitacao) {
        throw new Error('Erro ao buscar solicitação recém-criada');
      }
      
      return novaSolicitacao;
    } catch (error) {
      console.error('❌ Erro ao criar solicitação:', error);
      throw new Error('Erro ao criar solicitação de autorização');
    }
  }
  
  // Buscar solicitação por ID
  static async findById(id: number): Promise<SolicitacaoAutorizacao | null> {
    const selectQuery = `
      SELECT s.*, c.nome as clinica_nome, p.Paciente_Nome as paciente_nome
      FROM Solicitacoes_Autorizacao s
      LEFT JOIN Clinicas c ON s.clinica_id = c.id
      LEFT JOIN Pacientes_Clinica p ON s.paciente_id = p.id
      WHERE s.id = ?
    `;
    
    try {
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar solicitação por ID:', error);
      throw new Error('Erro ao buscar solicitação');
    }
  }
  
  // ✅ MÉTODO CORRIGIDO - Listar solicitações por clínica
  static async findByClinicaId(clinicaId: number, params: { page?: number; limit?: number } = {}): Promise<{
    data: SolicitacaoAutorizacao[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    // ✅ CORREÇÃO: Validar e garantir que limit e offset sejam números inteiros
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));
    
    // ✅ CORREÇÃO: Construir query com LIMIT/OFFSET direto na string (não como parâmetros)
    const selectQuery = `
      SELECT s.*, c.nome as clinica_nome, p.Paciente_Nome as paciente_nome
      FROM Solicitacoes_Autorizacao s
      LEFT JOIN Clinicas c ON s.clinica_id = c.id
      LEFT JOIN Pacientes_Clinica p ON s.paciente_id = p.id
      WHERE s.clinica_id = ?
      ORDER BY s.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Solicitacoes_Autorizacao 
      WHERE clinica_id = ?
    `;
    
    try {
      console.log('🔧 Executando queries da clínica...');
      console.log('Query de busca:', selectQuery);
      console.log('Parâmetros:', [clinicaId]);
      
      // Executar contagem
      const countResult = await query(countQuery, [clinicaId]);
      
      // ✅ CORREÇÃO: Executar busca apenas com clinicaId como parâmetro
      const solicitacoes = await query(selectQuery, [clinicaId]);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);
      
      console.log(`✅ Sucesso! ${solicitacoes.length} solicitações encontradas de um total de ${total}`);
      
      return {
        data: solicitacoes,
        pagination: {
          page: Number(page),
          limit: Number(safeLimit),
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar solicitações da clínica:', error);
      throw new Error('Erro ao buscar solicitações');
    }
  }
  
  // ✅ NOVO MÉTODO - Listar todas as solicitações (para o endpoint geral)
  static async findAll(params: { page?: number; limit?: number } = {}): Promise<{
    data: SolicitacaoAutorizacao[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    // Validar e garantir que limit e offset sejam números inteiros
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));
    
    // Construir query com LIMIT/OFFSET direto na string
    const selectQuery = `
      SELECT s.*, c.nome as clinica_nome, p.Paciente_Nome as paciente_nome
      FROM Solicitacoes_Autorizacao s
      LEFT JOIN Clinicas c ON s.clinica_id = c.id
      LEFT JOIN Pacientes_Clinica p ON s.paciente_id = p.id
      ORDER BY s.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Solicitacoes_Autorizacao
    `;
    
    try {
      console.log('🔧 Executando queries gerais...');
      
      // Executar contagem
      const countResult = await query(countQuery, []);
      
      // Executar busca
      const solicitacoes = await query(selectQuery, []);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);
      
      console.log(`✅ Sucesso! ${solicitacoes.length} solicitações encontradas de um total de ${total}`);
      
      return {
        data: solicitacoes,
        pagination: {
          page: Number(page),
          limit: Number(safeLimit),
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar todas as solicitações:', error);
      throw new Error('Erro ao buscar solicitações');
    }
  }
  
  // Atualizar status da solicitação
  static async updateStatus(id: number, dadosAtualizacao: SolicitacaoUpdateInput): Promise<SolicitacaoAutorizacao | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.entries(dadosAtualizacao).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }
    
    const updateQuery = `
      UPDATE Solicitacoes_Autorizacao 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    values.push(id);
    
    try {
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null; // Solicitação não encontrada
      }
      
      // Buscar a solicitação atualizada
      return await this.findById(id);
    } catch (error) {
      console.error('Erro ao atualizar solicitação:', error);
      throw new Error('Erro ao atualizar solicitação');
    }
  }
  
  // Deletar solicitação
  static async delete(id: number): Promise<boolean> {
    const deleteQuery = `DELETE FROM Solicitacoes_Autorizacao WHERE id = ?`;
    
    try {
      const result = await query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar solicitação:', error);
      throw new Error('Erro ao deletar solicitação');
    }
  }
  
  // Buscar solicitações por status
  static async findByStatus(status: string): Promise<SolicitacaoAutorizacao[]> {
    const selectQuery = `
      SELECT s.*, c.nome as clinica_nome, p.Paciente_Nome as paciente_nome
      FROM Solicitacoes_Autorizacao s
      LEFT JOIN Clinicas c ON s.clinica_id = c.id
      LEFT JOIN Pacientes_Clinica p ON s.paciente_id = p.id
      WHERE s.status = ?
      ORDER BY s.created_at DESC
    `;
    
    try {
      const result = await query(selectQuery, [status]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar solicitações por status:', error);
      throw new Error('Erro ao buscar solicitações');
    }
  }
}