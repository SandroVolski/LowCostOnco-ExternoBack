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
      const selectQuery = `SELECT * FROM Operadoras WHERE id = ?`;
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
      const selectQuery = `SELECT * FROM Operadoras WHERE codigo = ?`;
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
        INSERT INTO Operadoras (
          nome, codigo, cnpj, status
        ) VALUES (?, ?, ?, ?)
      `;
      
      const values = [
        operadoraData.nome,
        operadoraData.codigo,
        operadoraData.cnpj || null,
        operadoraData.status || 'ativo'
      ];
      
      console.log('🔧 Criando nova operadora...');
      console.log('📋 Dados preparados:', operadoraData);
      
      const result = await query(insertQuery, values);
      const insertId = result.insertId;
      
      console.log('✅ Operadora criada com ID:', insertId);
      
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
        UPDATE Operadoras 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      console.log('🔧 Atualizando operadora ID:', id);
      console.log('📋 Campos a atualizar:', updateFields);
      console.log('📋 Valores:', values);
      
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null; // Operadora não encontrada
      }
      
      console.log('✅ Operadora atualizada com sucesso');
      
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
      let checkQuery = `SELECT id FROM Operadoras WHERE codigo = ?`;
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
      console.log('🔧 Tentando conectar com banco real...');
      
      const selectQuery = `
        SELECT * FROM Operadoras 
        ORDER BY nome ASC
      `;
      
      console.log('🔧 Executando query:', selectQuery);
      const result = await query(selectQuery);
      
      console.log(`✅ ${result.length} operadoras encontradas no banco real`);
      
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
        UPDATE Operadoras 
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
}
