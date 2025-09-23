// src/models/Protocolo.ts

import { query } from '../config/database';
import { Protocolo, ProtocoloCreateInput, ProtocoloUpdateInput, ProtocoloWithMedicamentos, Medicamento } from '../types/protocolo';

const isDevelopmentEnv = (process.env.NODE_ENV || 'development') !== 'production';
const logDev = (...args: any[]) => { if (isDevelopmentEnv) console.log(...args); };

async function fetchMedicamentosByProtocoloIds(protocoloIds: number[]): Promise<Map<number, Medicamento[]>> {
  const map = new Map<number, Medicamento[]>();
  if (protocoloIds.length === 0) return map;

  // Construir placeholders seguros para IN (...)
  const placeholders = protocoloIds.map(() => '?').join(',');
  const sql = `
    SELECT *
    FROM Medicamentos_Protocolo
    WHERE protocolo_id IN (${placeholders})
    ORDER BY protocolo_id ASC, ordem ASC, id ASC
  `;
  const rows = await query(sql, protocoloIds);

  for (const row of rows) {
    const pid = row.protocolo_id as number;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(row as Medicamento);
  }

  return map;
}

export class ProtocoloModel {
  
  // Criar novo protocolo
  static async create(dadosProtocolo: ProtocoloCreateInput): Promise<ProtocoloWithMedicamentos> {
    logDev('🔧 Criando novo protocolo...');
    
    try {
      // Inserir protocolo
      const insertProtocoloQuery = `
        INSERT INTO Protocolos (
          clinica_id, nome, descricao, cid, intervalo_ciclos, 
          ciclos_previstos, linha, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const protocoloValues = [
        dadosProtocolo.clinica_id,
        dadosProtocolo.nome,
        dadosProtocolo.descricao || null,
        dadosProtocolo.cid || null,
        dadosProtocolo.intervalo_ciclos || null,
        dadosProtocolo.ciclos_previstos || null,
        dadosProtocolo.linha || null,
        dadosProtocolo.status || 'ativo'
      ];
      
      const protocoloResult = await query(insertProtocoloQuery, protocoloValues);
      const protocoloId = protocoloResult.insertId;
      
      logDev('✅ Protocolo criado com ID:', protocoloId);
      
      // Inserir medicamentos se fornecidos
      if (dadosProtocolo.medicamentos && dadosProtocolo.medicamentos.length > 0) {
        const insertMedicamentoQuery = `
          INSERT INTO Medicamentos_Protocolo (
            protocolo_id, nome, dose, unidade_medida, via_adm, 
            dias_adm, frequencia, observacoes, ordem
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        for (let i = 0; i < dadosProtocolo.medicamentos.length; i++) {
          const medicamento = dadosProtocolo.medicamentos[i];
          const medicamentoValues = [
            protocoloId,
            medicamento.nome,
            medicamento.dose || null,
            medicamento.unidade_medida || null,
            medicamento.via_adm || null,
            medicamento.dias_adm || null,
            medicamento.frequencia || null,
            medicamento.observacoes || null,
            medicamento.ordem || i + 1
          ];
          
          await query(insertMedicamentoQuery, medicamentoValues);
        }
        
        logDev('✅ Medicamentos inseridos:', dadosProtocolo.medicamentos.length);
      }
      
      // Buscar o protocolo recém-criado com medicamentos
      const novoProtocolo = await this.findById(protocoloId);
      if (!novoProtocolo) {
        throw new Error('Erro ao buscar protocolo recém-criado');
      }
      
      return novoProtocolo;
      
    } catch (error) {
      console.error('❌ Erro ao criar protocolo:', error);
      throw new Error('Erro ao criar protocolo');
    }
  }
  
  // Buscar protocolo por ID
  static async findById(id: number): Promise<ProtocoloWithMedicamentos | null> {
    const selectQuery = `
      SELECT p.*, c.nome as clinica_nome
      FROM Protocolos p
      LEFT JOIN Clinicas c ON p.clinica_id = c.id
      WHERE p.id = ?
    `;
    
    const medicamentosQuery = `
      SELECT * FROM Medicamentos_Protocolo 
      WHERE protocolo_id = ? 
      ORDER BY ordem ASC, id ASC
    `;
    
    try {
      const protocoloResult = await query(selectQuery, [id]);
      if (protocoloResult.length === 0) {
        return null;
      }
      
      const protocolo = protocoloResult[0];
      
      // Buscar medicamentos
      const medicamentosResult = await query(medicamentosQuery, [id]);
      const medicamentos = medicamentosResult;
      
      return {
        ...protocolo,
        medicamentos
      };
    } catch (error) {
      console.error('Erro ao buscar protocolo por ID:', error);
      throw new Error('Erro ao buscar protocolo');
    }
  }
  
  // Listar protocolos por clínica (otimizado sem N+1)
  static async findByClinicaId(clinicaId: number, params: { page?: number; limit?: number } = {}): Promise<{
    data: ProtocoloWithMedicamentos[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));
    
    const selectQuery = `
      SELECT p.*, c.nome as clinica_nome
      FROM Protocolos p
      LEFT JOIN Clinicas c ON p.clinica_id = c.id
      WHERE p.clinica_id = ?
      ORDER BY p.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Protocolos 
      WHERE clinica_id = ?
    `;
    
    try {
      logDev('🔧 Executando queries de protocolos (clinica)...');
      
      // Executar contagem e busca
      const [countResult, protocolosResult] = await Promise.all([
        query(countQuery, [clinicaId]),
        query(selectQuery, [clinicaId])
      ]);
      
      const protocoloIds: number[] = protocolosResult.map((p: any) => p.id);
      const medicamentosMap = await fetchMedicamentosByProtocoloIds(protocoloIds);
      
      const protocolosComMedicamentos = protocolosResult.map((protocolo: any) => ({
        ...protocolo,
        medicamentos: medicamentosMap.get(protocolo.id) || []
      }));
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);
      
      logDev(`✅ Sucesso! ${protocolosComMedicamentos.length} protocolos (clínica).`);
      
      return {
        data: protocolosComMedicamentos,
        pagination: {
          page: Number(page),
          limit: Number(safeLimit),
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar protocolos da clínica:', error);
      throw new Error('Erro ao buscar protocolos');
    }
  }
  
  // Listar todos os protocolos (otimizado sem N+1)
  static async findAll(params: { page?: number; limit?: number } = {}): Promise<{
    data: ProtocoloWithMedicamentos[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));
    
    const selectQuery = `
      SELECT p.*, c.nome as clinica_nome
      FROM Protocolos p
      LEFT JOIN Clinicas c ON p.clinica_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Protocolos
    `;
    
    try {
      logDev('🔧 Executando queries gerais de protocolos...');
      
      // Executar contagem e busca
      const [countResult, protocolosResult] = await Promise.all([
        query(countQuery, []),
        query(selectQuery, [])
      ]);
      
      const protocoloIds: number[] = protocolosResult.map((p: any) => p.id);
      const medicamentosMap = await fetchMedicamentosByProtocoloIds(protocoloIds);
      
      const protocolosComMedicamentos = protocolosResult.map((protocolo: any) => ({
        ...protocolo,
        medicamentos: medicamentosMap.get(protocolo.id) || []
      }));
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);
      
      logDev(`✅ Sucesso! ${protocolosComMedicamentos.length} protocolos (geral).`);
      
      return {
        data: protocolosComMedicamentos,
        pagination: {
          page: Number(page),
          limit: Number(safeLimit),
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar todos os protocolos:', error);
      throw new Error('Erro ao buscar protocolos');
    }
  }
  
  // Buscar protocolos por status (otimizado sem N+1)
  static async findByStatus(status: string): Promise<ProtocoloWithMedicamentos[]> {
    const selectQuery = `
      SELECT p.*, c.nome as clinica_nome
      FROM Protocolos p
      LEFT JOIN Clinicas c ON p.clinica_id = c.id
      WHERE p.status = ?
      ORDER BY p.created_at DESC
    `;
    
    try {
      const protocolosResult = await query(selectQuery, [status]);
      const protocoloIds: number[] = protocolosResult.map((p: any) => p.id);
      const medicamentosMap = await fetchMedicamentosByProtocoloIds(protocoloIds);
      
      const protocolosComMedicamentos = protocolosResult.map((protocolo: any) => ({
        ...protocolo,
        medicamentos: medicamentosMap.get(protocolo.id) || []
      }));
      
      return protocolosComMedicamentos;
    } catch (error) {
      console.error('Erro ao buscar protocolos por status:', error);
      throw new Error('Erro ao buscar protocolos');
    }
  }
  
  // Buscar protocolos por CID (otimizado sem N+1)
  static async findByCID(cid: string): Promise<ProtocoloWithMedicamentos[]> {
    const selectQuery = `
      SELECT p.*, c.nome as clinica_nome
      FROM Protocolos p
      LEFT JOIN Clinicas c ON p.clinica_id = c.id
      WHERE p.cid LIKE ?
      ORDER BY p.created_at DESC
    `;
    
    try {
      const protocolosResult = await query(selectQuery, [`%${cid}%`]);
      const protocoloIds: number[] = protocolosResult.map((p: any) => p.id);
      const medicamentosMap = await fetchMedicamentosByProtocoloIds(protocoloIds);
      
      const protocolosComMedicamentos = protocolosResult.map((protocolo: any) => ({
        ...protocolo,
        medicamentos: medicamentosMap.get(protocolo.id) || []
      }));
      
      return protocolosComMedicamentos;
    } catch (error) {
      console.error('Erro ao buscar protocolos por CID:', error);
      throw new Error('Erro ao buscar protocolos');
    }
  }
  
  // Atualizar protocolo
  static async update(id: number, dadosAtualizacao: ProtocoloUpdateInput): Promise<ProtocoloWithMedicamentos | null> {
    try {
      // Atualizar dados do protocolo
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(dadosAtualizacao).forEach(([key, value]) => {
        if (key !== 'medicamentos' && value !== undefined) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        const updateQuery = `
          UPDATE Protocolos 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `;
        
        const result = await query(updateQuery, values);
        
        if (result.affectedRows === 0) {
          return null; // Protocolo não encontrado
        }
      }
      
      // Atualizar medicamentos se fornecidos
      if (dadosAtualizacao.medicamentos !== undefined) {
        // Deletar medicamentos existentes
        await query('DELETE FROM Medicamentos_Protocolo WHERE protocolo_id = ?', [id]);
        
        // Inserir novos medicamentos
        if (dadosAtualizacao.medicamentos.length > 0) {
          const insertMedicamentoQuery = `
            INSERT INTO Medicamentos_Protocolo (
              protocolo_id, nome, dose, unidade_medida, via_adm, 
              dias_adm, frequencia, observacoes, ordem
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          for (let i = 0; i < dadosAtualizacao.medicamentos.length; i++) {
            const medicamento = dadosAtualizacao.medicamentos[i];
            const medicamentoValues = [
              id,
              medicamento.nome,
              medicamento.dose || null,
              medicamento.unidade_medida || null,
              medicamento.via_adm || null,
              medicamento.dias_adm || null,
              medicamento.frequencia || null,
              medicamento.observacoes || null,
              medicamento.ordem || i + 1
            ];
            
            await query(insertMedicamentoQuery, medicamentoValues);
          }
        }
      }
      
      // Buscar o protocolo atualizado
      return await this.findById(id);
      
    } catch (error) {
      console.error('Erro ao atualizar protocolo:', error);
      throw new Error('Erro ao atualizar protocolo');
    }
  }
  
  // Deletar protocolo
  static async delete(id: number): Promise<boolean> {
    const deleteQuery = `DELETE FROM Protocolos WHERE id = ?`;
    
    try {
      const result = await query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar protocolo:', error);
      throw new Error('Erro ao deletar protocolo');
    }
  }

  // Contar protocolos
  static async count(where?: any): Promise<number> {
    try {
      let queryStr = 'SELECT COUNT(*) as count FROM Protocolos';
      const params: any[] = [];

      if (where) {
        const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        queryStr += ` WHERE ${conditions}`;
        params.push(...Object.values(where));
      }

      const result = await query(queryStr, params);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar protocolos:', error);
      return 0;
    }
  }
} 