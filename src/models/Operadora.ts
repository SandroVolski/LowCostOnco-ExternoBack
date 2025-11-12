// src/models/Operadora.ts

import { query } from '../config/database';
import { 
  Operadora, 
  OperadoraCreateInput, 
  OperadoraUpdateInput
} from '../types/operadora';

// 🆕 DADOS MOCK PARA DESENVOLVIMENTO (quando banco não estiver disponível)
const mockOperadoras: Operadora[] = [
  {
    id: 1,
    nome: 'Unimed',
    codigo: 'UNI001',
    cnpj: '12.345.678/0001-90',
    status: 'ativo',
    created_at: '2024-01-15'
  },
  {
    id: 2,
    nome: 'Amil',
    codigo: 'AMI002',
    cnpj: '98.765.432/0001-10',
    status: 'ativo',
    created_at: '2024-02-20'
  },
  {
    id: 3,
    nome: 'SulAmérica',
    codigo: 'SUL003',
    cnpj: '11.222.333/0001-44',
    status: 'ativo',
    created_at: '2024-03-10'
  }
];

export class OperadoraModel {
  
  // Buscar operadora por ID
  static async findById(id: number): Promise<Operadora | null> {
    try {
      const selectQuery = `SELECT * FROM operadoras WHERE id = ?`;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockOperadoras.find(o => o.id === id) || null;
    }
  }
  
  // Buscar operadora por código
  static async findByCode(codigo: string): Promise<Operadora | null> {
    try {
      const selectQuery = `SELECT * FROM operadoras WHERE codigo = ?`;
      const result = await query(selectQuery, [codigo]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockOperadoras.find(o => o.codigo === codigo) || null;
    }
  }
  
  // Criar nova operadora
  static async create(operadoraData: OperadoraCreateInput): Promise<Operadora> {
    try {
      const insertQuery = `
        INSERT INTO operadoras (
          nome, codigo, cnpj, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        operadoraData.nome,
        operadoraData.codigo,
        operadoraData.cnpj || null,
        operadoraData.status || 'ativo'
      ];

      const result = await query(insertQuery, values);
      const insertId = result.insertId;

      // Buscar a operadora recém-criada
      const novaOperadora = await this.findById(insertId);
      if (!novaOperadora) {
        throw new Error('Erro ao buscar operadora recém-criada');
      }

      return novaOperadora;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      
      // Fallback para dados mock
      const novaOperadora: Operadora = {
        ...operadoraData,
        id: Date.now(),
        created_at: new Date().toISOString().split('T')[0],
        status: operadoraData.status || 'ativo'
      };
      
      // Adicionar à lista mock
      mockOperadoras.push(novaOperadora);
      
      return novaOperadora;
    }
  }
  
  // Atualizar operadora
  static async update(id: number, operadoraData: OperadoraUpdateInput): Promise<Operadora | null> {
    try {
      // Construir query dinâmica baseada nos campos fornecidos
      const updateFields: string[] = [];
      const values: any[] = [];

      Object.entries(operadoraData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      // Não incluir updated_at se a coluna não existir
      // updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const updateQuery = `
        UPDATE operadoras 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      const result = await query(updateQuery, values);

      if (result.affectedRows === 0) {
        return null; // Operadora não encontrada
      }

      // Buscar a operadora atualizada
      return await this.findById(id);
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      
      // Fallback para dados mock
      const operadoraIndex = mockOperadoras.findIndex(o => o.id === id);
      if (operadoraIndex === -1) return null;
      
      const operadoraAtualizada = {
        ...mockOperadoras[operadoraIndex],
        ...operadoraData,
        updated_at: new Date().toISOString().split('T')[0]
      };
      
      mockOperadoras[operadoraIndex] = operadoraAtualizada;
      return operadoraAtualizada;
    }
  }
  
  // Verificar se código já existe
  static async checkCodeExists(codigo: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `SELECT id FROM operadoras WHERE codigo = ?`;
      let params: any[] = [codigo];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      return mockOperadoras.some(o => o.codigo === codigo && o.id !== excludeId);
    }
  }

  // 🆕 MÉTODOS ADMINISTRATIVOS

  // Buscar todas as operadoras
  static async findAll(): Promise<Operadora[]> {
    try {
      const selectQuery = `
        SELECT * FROM operadoras 
        ORDER BY nome ASC
      `;

      const result = await query(selectQuery);

      return result;
    } catch (error) {
      console.error('❌ ERRO DETALHADO ao conectar com banco:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        code: (error as any)?.code,
        errno: (error as any)?.errno,
        sqlState: (error as any)?.sqlState,
        sqlMessage: (error as any)?.sqlMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      console.warn('⚠️ Usando dados mock como fallback');
      return [...mockOperadoras];
    }
  }

  // Deletar operadora (soft delete)
  static async delete(id: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE operadoras 
        SET status = 'inativo', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = await query(updateQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.warn('⚠️ Erro ao conectar com banco, usando dados mock:', error instanceof Error ? error.message : String(error));
      
      // Fallback para dados mock
      const operadoraIndex = mockOperadoras.findIndex(o => o.id === id);
      if (operadoraIndex === -1) return false;
      
      mockOperadoras[operadoraIndex].status = 'inativo';
      mockOperadoras[operadoraIndex].updated_at = new Date().toISOString().split('T')[0];
      return true;
    }
  }

  // Buscar dados de performance das operadoras
  static async getPerformanceData(): Promise<Array<{name: string, solicitacoes: number, aprovacoes: number, taxaAprovacao: number, tempoMedio: number}>> {
    try {
      const result = await query(`
        SELECT 
          o.nome as name,
          COUNT(s.id) as solicitacoes,
          SUM(CASE WHEN s.status = 'aprovada' THEN 1 ELSE 0 END) as aprovacoes,
          ROUND((SUM(CASE WHEN s.status = 'aprovada' THEN 1 ELSE 0 END) / COUNT(s.id)) * 100, 2) as taxaAprovacao,
          ROUND(AVG(TIMESTAMPDIFF(HOUR, s.created_at, s.updated_at)), 2) as tempoMedio
        FROM operadoras o
        LEFT JOIN clinicas c ON o.id = c.operadora_id
        LEFT JOIN solicitacoes s ON c.id = s.clinica_id
        WHERE o.status = 'ativo'
        GROUP BY o.id, o.nome
        ORDER BY solicitacoes DESC
      `);

      return result.map((row: any) => ({
        name: row.name,
        solicitacoes: row.solicitacoes || 0,
        aprovacoes: row.aprovacoes || 0,
        taxaAprovacao: row.taxaAprovacao || 0,
        tempoMedio: row.tempoMedio || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar dados de performance das operadoras:', error);
      return [];
    }
  }

  // Contar operadoras
  static async count(where?: any): Promise<number> {
    try {
      let queryStr = 'SELECT COUNT(*) as count FROM operadoras';
      const params: any[] = [];

      if (where) {
        const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        queryStr += ` WHERE ${conditions}`;
        params.push(...Object.values(where));
      }

      const result = await query(queryStr, params);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar operadoras:', error);
      return 0;
    }
  }
}
