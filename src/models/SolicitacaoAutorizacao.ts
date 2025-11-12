// src/models/SolicitacaoAutorizacao.ts - VERSÃO CORRIGIDA

import { query } from '../config/database';
import { SolicitacaoAutorizacao, SolicitacaoCreateInput, SolicitacaoUpdateInput } from '../types/solicitacao';

export class SolicitacaoAutorizacaoModel {
  
  // Criar nova solicitação
  static async create(dadosSolicitacao: SolicitacaoCreateInput): Promise<SolicitacaoAutorizacao> {
    const insertQuery = `
      INSERT INTO solicitacoes (
        clinica_id, paciente_id, hospital_nome, hospital_codigo,
        cliente_dados, data_solicitacao,
        diagnostico_cid, diagnostico_descricao, local_metastases,
        estadiamento, tratamentos,
        finalidade, performance_status, siglas, ciclos_previstos, ciclo_atual,
        superficie_corporal, peso, altura,
        medicamentos, medico_assinatura_crm, numero_autorizacao, observacoes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Preparar dados do cliente como JSON
    const clienteDados = {
      nome: dadosSolicitacao.cliente_nome,
      codigo: dadosSolicitacao.cliente_codigo,
      sexo: dadosSolicitacao.sexo,
      data_nascimento: dadosSolicitacao.data_nascimento,
      idade: dadosSolicitacao.idade
    };

    // Preparar estadiamento como JSON
    const estadiamento = {
      t: dadosSolicitacao.estagio_t || null,
      n: dadosSolicitacao.estagio_n || null,
      m: dadosSolicitacao.estagio_m || null,
      clinico: dadosSolicitacao.estagio_clinico || null
    };

    // Preparar tratamentos como JSON
    const tratamentos = {
      cirurgia_radio: dadosSolicitacao.tratamento_cirurgia_radio || null,
      quimio_adjuvante: dadosSolicitacao.tratamento_quimio_adjuvante || null,
      quimio_primeira_linha: dadosSolicitacao.tratamento_quimio_primeira_linha || null,
      quimio_segunda_linha: dadosSolicitacao.tratamento_quimio_segunda_linha || null
    };

    // Preparar medicamentos como JSON
    const medicamentos = {
      antineoplasticos: dadosSolicitacao.medicamentos_antineoplasticos,
      dose_por_m2: dadosSolicitacao.dose_por_m2,
      dose_total: dadosSolicitacao.dose_total,
      via_administracao: dadosSolicitacao.via_administracao,
      dias_aplicacao_intervalo: dadosSolicitacao.dias_aplicacao_intervalo,
      medicacoes_associadas: dadosSolicitacao.medicacoes_associadas || null
    };

    const values = [
      dadosSolicitacao.clinica_id,
      dadosSolicitacao.paciente_id || null,
      dadosSolicitacao.hospital_nome,
      dadosSolicitacao.hospital_codigo,
      JSON.stringify(clienteDados),
      dadosSolicitacao.data_solicitacao,
      dadosSolicitacao.diagnostico_cid,
      dadosSolicitacao.diagnostico_descricao,
      dadosSolicitacao.local_metastases || null,
      JSON.stringify(estadiamento),
      JSON.stringify(tratamentos),
      dadosSolicitacao.finalidade,
      dadosSolicitacao.performance_status,
      dadosSolicitacao.siglas || null,
      dadosSolicitacao.ciclos_previstos,
      dadosSolicitacao.ciclo_atual,
      dadosSolicitacao.superficie_corporal,
      dadosSolicitacao.peso,
      dadosSolicitacao.altura,
      JSON.stringify(medicamentos),
      dadosSolicitacao.medico_assinatura_crm,
      dadosSolicitacao.numero_autorizacao || null,
      dadosSolicitacao.observacoes || null,
      'pendente' // status padrão
    ];

    try {
      const result = await query(insertQuery, values);
      const insertId = result.insertId;

      // Notificação: nova solicitação criada
      try {
        await query(
          `INSERT INTO notificacoes (clinica_id, tipo, titulo, mensagem, solicitacao_id)
           VALUES (?, 'auth_created', 'Nova solicitação criada', ?, ?)`,
          [
            dadosSolicitacao.clinica_id,
            `Solicitação #${insertId} criada` + (dadosSolicitacao.cliente_nome ? ` para ${dadosSolicitacao.cliente_nome}` : ''),
            insertId
          ]
        );
      } catch (e) {
        console.warn('⚠️ Falha ao criar notificação auth_created:', (e as any)?.message || e);
      }

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
      SELECT 
        s.*, 
        c.nome as clinica_nome, 
        c.codigo as clinica_codigo,
        p.nome as paciente_nome,
        p.codigo as paciente_codigo
      FROM solicitacoes s
      LEFT JOIN clinicas c ON s.clinica_id = c.id
      LEFT JOIN pacientes p ON s.paciente_id = p.id
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
      SELECT s.*, c.nome as clinica_nome, p.nome as paciente_nome
      FROM solicitacoes s
      LEFT JOIN clinicas c ON s.clinica_id = c.id
      LEFT JOIN pacientes p ON s.paciente_id = p.id
      WHERE s.clinica_id = ?
      ORDER BY s.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM solicitacoes 
      WHERE clinica_id = ?
    `;
    
    try {
      // Executar contagem
      const countResult = await query(countQuery, [clinicaId]);

      // ✅ CORREÇÃO: Executar busca apenas com clinicaId como parâmetro
      const solicitacoes = await query(selectQuery, [clinicaId]);

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);

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
  
  // Buscar solicitações por operadora_id (através das clínicas vinculadas)
  static async findByOperadoraId(operadoraId: number, params: { page?: number; limit?: number } = {}): Promise<{
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
    
    // Buscar solicitações das clínicas que pertencem à operadora
    const selectQuery = `
      SELECT s.*, c.nome as clinica_nome, p.nome as paciente_nome
      FROM solicitacoes s
      INNER JOIN clinicas c ON s.clinica_id = c.id
      LEFT JOIN pacientes p ON s.paciente_id = p.id
      WHERE c.operadora_id = ?
      ORDER BY s.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM solicitacoes s
      INNER JOIN clinicas c ON s.clinica_id = c.id
      WHERE c.operadora_id = ?
    `;
    
    try {
      // Executar contagem
      const countResult = await query(countQuery, [operadoraId]);

      // Executar busca
      const solicitacoes = await query(selectQuery, [operadoraId]);

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);

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
      console.error('❌ Erro ao buscar solicitações da operadora:', error);
      throw new Error('Erro ao buscar solicitações da operadora');
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
      SELECT s.*, c.nome as clinica_nome, p.nome as paciente_nome
      FROM solicitacoes s
      LEFT JOIN clinicas c ON s.clinica_id = c.id
      LEFT JOIN pacientes p ON s.paciente_id = p.id
      ORDER BY s.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM solicitacoes
    `;
    
    try {
      // Executar contagem
      const countResult = await query(countQuery, []);

      // Executar busca
      const solicitacoes = await query(selectQuery, []);

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);

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

    // Obter status anterior
    let statusAntigo: string | null = null;
    try {
      const before = await query('SELECT status FROM solicitacoes WHERE id = ?', [id]);
      statusAntigo = before?.[0]?.status || null;
    } catch {}
    
    const updateQuery = `
      UPDATE solicitacoes 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    values.push(id);
    
    try {
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null; // Solicitação não encontrada
      }

      // Notificação de mudança de status (se status foi alterado)
      const idx = updateFields.findIndex(f => f.startsWith('status'));
      if (idx >= 0) {
        const statusNovo = values[idx];
        try {
          await query(
            `INSERT INTO notificacoes (clinica_id, tipo, titulo, mensagem, solicitacao_id)
             VALUES ((SELECT clinica_id FROM solicitacoes WHERE id = ?), 'auth_status', 'Solicitação atualizada', ?, ?)`,
            [
              id,
              `Solicitação #${id}` + (statusAntigo ? ` alterou de ${statusAntigo} para ${statusNovo}` : ` agora está em ${statusNovo}`),
              id
            ]
          );
        } catch (e) {
          console.warn('⚠️ Falha ao criar notificação auth_status:', (e as any)?.message || e);
        }
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
    const deleteQuery = `DELETE FROM solicitacoes WHERE id = ?`;
    
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
      SELECT s.*, c.nome as clinica_nome, p.nome as paciente_nome
      FROM solicitacoes s
      LEFT JOIN clinicas c ON s.clinica_id = c.id
      LEFT JOIN pacientes p ON s.paciente_id = p.id
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

  // Contar solicitações por data específica
  static async countByDate(date: Date): Promise<number> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await query(
        'SELECT COUNT(*) as count FROM solicitacoes WHERE created_at >= ? AND created_at <= ?',
        [startOfDay, endOfDay]
      );

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar solicitações por data:', error);
      return 0;
    }
  }

  // Contar solicitações por período
  static async countByDateRange(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM solicitacoes WHERE created_at >= ? AND created_at <= ?',
        [startDate, endDate]
      );

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar solicitações por período:', error);
      return 0;
    }
  }

  // Calcular tempo médio de resposta
  static async getTempoMedioResposta(): Promise<number> {
    try {
      const result = await query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as tempo_medio
        FROM solicitacoes 
        WHERE status IN ('aprovada', 'rejeitada') 
        AND created_at IS NOT NULL 
        AND updated_at IS NOT NULL
      `);

      return result[0]?.tempo_medio || 0;
    } catch (error) {
      console.error('Erro ao calcular tempo médio de resposta:', error);
      return 0;
    }
  }

  // Calcular tempo médio de resposta por operadora
  static async getTempoMedioRespostaByOperadora(operadoraId: number): Promise<number> {
    try {
      const result = await query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, s.created_at, s.updated_at)) as tempo_medio
        FROM solicitacoes s
        INNER JOIN clinicas c ON s.clinica_id = c.id
        WHERE c.operadora_id = ? 
        AND s.status IN ('aprovada', 'rejeitada') 
        AND s.created_at IS NOT NULL 
        AND s.updated_at IS NOT NULL
      `, [operadoraId]);

      return result[0]?.tempo_medio || 0;
    } catch (error) {
      console.error('Erro ao calcular tempo médio de resposta por operadora:', error);
      return 0;
    }
  }

  // Calcular tempo médio de resposta por clínica
  static async getTempoMedioRespostaByClinica(clinicaId: number): Promise<number> {
    try {
      const result = await query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as tempo_medio
        FROM solicitacoes 
        WHERE clinica_id = ? 
        AND status IN ('aprovada', 'rejeitada') 
        AND created_at IS NOT NULL 
        AND updated_at IS NOT NULL
      `, [clinicaId]);

      return result[0]?.tempo_medio || 0;
    } catch (error) {
      console.error('Erro ao calcular tempo médio de resposta por clínica:', error);
      return 0;
    }
  }

  // Buscar distribuição de status
  static async getStatusDistribution(): Promise<Array<{name: string, value: number, color: string}>> {
    try {
      const result = await query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM solicitacoes 
        GROUP BY status
      `);

      const colors = {
        'pendente': '#f59e0b',
        'aprovada': '#10b981',
        'rejeitada': '#ef4444',
        'em_analise': '#3b82f6'
      };

      return result.map((row: any) => ({
        name: row.status,
        value: row.count,
        color: colors[row.status as keyof typeof colors] || '#6b7280'
      }));
    } catch (error) {
      console.error('Erro ao buscar distribuição de status:', error);
      return [];
    }
  }

  // Buscar solicitações por mês
  static async getSolicitacoesPorMes(months: number): Promise<Array<{mes: string, solicitacoes: number, aprovacoes: number, rejeicoes: number, pendentes: number}>> {
    try {
      const result = await query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as mes,
          COUNT(*) as solicitacoes,
          SUM(CASE WHEN status = 'aprovada' THEN 1 ELSE 0 END) as aprovacoes,
          SUM(CASE WHEN status = 'rejeitada' THEN 1 ELSE 0 END) as rejeicoes,
          SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes
        FROM solicitacoes 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY mes
      `, [months]);

      return result.map((row: any) => ({
        mes: row.mes,
        solicitacoes: row.solicitacoes,
        aprovacoes: row.aprovacoes,
        rejeicoes: row.rejeicoes,
        pendentes: row.pendentes
      }));
    } catch (error) {
      console.error('Erro ao buscar solicitações por mês:', error);
      return [];
    }
  }

  // Buscar dados de tendência
  static async getTrendData(months: number): Promise<Array<{periodo: string, solicitacoes: number, aprovacoes: number, taxaAprovacao: number}>> {
    try {
      const result = await query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as periodo,
          COUNT(*) as solicitacoes,
          SUM(CASE WHEN status = 'aprovada' THEN 1 ELSE 0 END) as aprovacoes,
          ROUND((SUM(CASE WHEN status = 'aprovada' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as taxaAprovacao
        FROM solicitacoes 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY periodo
      `, [months]);

      return result.map((row: any) => ({
        periodo: row.periodo,
        solicitacoes: row.solicitacoes,
        aprovacoes: row.aprovacoes,
        taxaAprovacao: row.taxaAprovacao || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar dados de tendência:', error);
      return [];
    }
  }

  // Contar solicitações por operadora
  static async countByOperadora(operadoraId: number): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as count
        FROM solicitacoes s
        INNER JOIN clinicas c ON s.clinica_id = c.id
        WHERE c.operadora_id = ?
      `, [operadoraId]);

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar solicitações por operadora:', error);
      return 0;
    }
  }

  // Contar solicitações por operadora e status
  static async countByOperadoraAndStatus(operadoraId: number, status: string): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as count
        FROM solicitacoes s
        INNER JOIN clinicas c ON s.clinica_id = c.id
        WHERE c.operadora_id = ? AND s.status = ?
      `, [operadoraId, status]);

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar solicitações por operadora e status:', error);
      return 0;
    }
  }

  // Contar solicitações por clínica
  static async countByClinica(clinicaId: number): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as count
        FROM solicitacoes
        WHERE clinica_id = ?
      `, [clinicaId]);

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar solicitações por clínica:', error);
      return 0;
    }
  }

  // Contar solicitações por clínica e status
  static async countByClinicaAndStatus(clinicaId: number, status: string): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as count
        FROM solicitacoes
        WHERE clinica_id = ? AND status = ?
      `, [clinicaId, status]);

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar solicitações por clínica e status:', error);
      return 0;
    }
  }

  // Contar solicitações
  static async count(where?: any): Promise<number> {
    try {
      let queryStr = 'SELECT COUNT(*) as count FROM solicitacoes';
      const params: any[] = [];

      if (where) {
        const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        queryStr += ` WHERE ${conditions}`;
        params.push(...Object.values(where));
      }

      const result = await query(queryStr, params);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar solicitações:', error);
      return 0;
    }
  }
}