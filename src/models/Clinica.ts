// src/models/Clinica.ts

import { query } from '../config/database';
import { 
  Clinica, 
  ClinicaCreateInput, 
  ClinicaUpdateInput,
  ResponsavelTecnico,
  ResponsavelTecnicoCreateInput,
  ResponsavelTecnicoUpdateInput,
  ClinicaProfile
} from '../types/clinic';

export class ClinicaModel {
  
  // Buscar clínica por ID com responsáveis técnicos
  static async findById(id: number): Promise<ClinicaProfile | null> {
    try {
      // Buscar dados da clínica
      const clinicQuery = `
        SELECT * FROM Clinicas WHERE id = ?
      `;
      const clinicResult = await query(clinicQuery, [id]);
      
      if (clinicResult.length === 0) {
        return null;
      }
      
      const clinica = clinicResult[0];
      
      // Buscar responsáveis técnicos
      const responsaveisQuery = `
        SELECT * FROM Responsaveis_Tecnicos 
        WHERE clinica_id = ? AND status = 'ativo'
        ORDER BY created_at ASC
      `;
      const responsaveis = await query(responsaveisQuery, [id]);
      
      return {
        clinica,
        responsaveis_tecnicos: responsaveis
      };
    } catch (error) {
      console.error('Erro ao buscar clínica por ID:', error);
      throw new Error('Erro ao buscar clínica');
    }
  }
  
  // Buscar clínica por código
  static async findByCode(codigo: string): Promise<Clinica | null> {
    try {
      const selectQuery = `SELECT * FROM Clinicas WHERE codigo = ?`;
      const result = await query(selectQuery, [codigo]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar clínica por código:', error);
      throw new Error('Erro ao buscar clínica');
    }
  }
  
  // Buscar clínica por usuário (para login)
  static async findByUser(usuario: string): Promise<Clinica | null> {
    try {
      const selectQuery = `SELECT * FROM Clinicas WHERE usuario = ?`;
      const result = await query(selectQuery, [usuario]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar clínica por usuário:', error);
      throw new Error('Erro ao buscar clínica');
    }
  }
  
  // Criar nova clínica
  static async create(clinicaData: ClinicaCreateInput): Promise<Clinica> {
    try {
      const insertQuery = `
        INSERT INTO Clinicas (
          nome, codigo, cnpj, endereco, cidade, estado, cep, 
          telefone, email, website, logo_url, observacoes, 
          usuario, senha, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        clinicaData.nome,
        clinicaData.codigo,
        clinicaData.cnpj || null,
        clinicaData.endereco || null,
        clinicaData.cidade || null,
        clinicaData.estado || null,
        clinicaData.cep || null,
        clinicaData.telefone || null,
        clinicaData.email || null,
        clinicaData.website || null,
        clinicaData.logo_url || null,
        clinicaData.observacoes || null,
        clinicaData.usuario || null,
        clinicaData.senha || null,
        clinicaData.status || 'ativo'
      ];
      
      const result = await query(insertQuery, values);
      const insertId = result.insertId;
      
      // Buscar a clínica recém-criada
      const newClinica = await this.findByIdSimple(insertId);
      if (!newClinica) {
        throw new Error('Erro ao buscar clínica recém-criada');
      }
      
      return newClinica;
    } catch (error) {
      console.error('Erro ao criar clínica:', error);
      throw new Error('Erro ao criar clínica');
    }
  }
  
  // Atualizar clínica
  static async update(id: number, clinicaData: ClinicaUpdateInput): Promise<Clinica | null> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(clinicaData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }
      
      const updateQuery = `
        UPDATE Clinicas 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      values.push(id);
      
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      // Buscar a clínica atualizada
      return await this.findByIdSimple(id);
    } catch (error) {
      console.error('Erro ao atualizar clínica:', error);
      throw new Error('Erro ao atualizar clínica');
    }
  }
  
  // Buscar clínica por ID (apenas dados da clínica)
  private static async findByIdSimple(id: number): Promise<Clinica | null> {
    try {
      const selectQuery = `SELECT * FROM Clinicas WHERE id = ?`;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar clínica:', error);
      throw new Error('Erro ao buscar clínica');
    }
  }
  
  // Verificar se código já existe
  static async checkCodeExists(codigo: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `SELECT id FROM Clinicas WHERE codigo = ?`;
      let params: any[] = [codigo];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      throw new Error('Erro ao verificar código');
    }
  }
  
  // Verificar se usuário já existe
  static async checkUserExists(usuario: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `SELECT id FROM Clinicas WHERE usuario = ?`;
      let params: any[] = [usuario];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      throw new Error('Erro ao verificar usuário');
    }
  }
}

// Modelo para Responsáveis Técnicos
export class ResponsavelTecnicoModel {
  
  // Criar responsável técnico
  static async create(responsavelData: ResponsavelTecnicoCreateInput): Promise<ResponsavelTecnico> {
    try {
      const insertQuery = `
        INSERT INTO Responsaveis_Tecnicos (
          clinica_id, nome, crm, especialidade, telefone, email, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        responsavelData.clinica_id,
        responsavelData.nome,
        responsavelData.crm,
        responsavelData.especialidade,
        responsavelData.telefone || null,
        responsavelData.email || null,
        responsavelData.status || 'ativo'
      ];
      
      const result = await query(insertQuery, values);
      const insertId = result.insertId;
      
      // Buscar o responsável recém-criado
      const newResponsavel = await this.findById(insertId);
      if (!newResponsavel) {
        throw new Error('Erro ao buscar responsável recém-criado');
      }
      
      return newResponsavel;
    } catch (error) {
      console.error('Erro ao criar responsável técnico:', error);
      throw new Error('Erro ao criar responsável técnico');
    }
  }
  
  // Buscar responsável por ID
  static async findById(id: number): Promise<ResponsavelTecnico | null> {
    try {
      const selectQuery = `SELECT * FROM Responsaveis_Tecnicos WHERE id = ?`;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar responsável por ID:', error);
      throw new Error('Erro ao buscar responsável');
    }
  }
  
  // Buscar responsáveis por clínica
  static async findByClinicaId(clinicaId: number): Promise<ResponsavelTecnico[]> {
    try {
      const selectQuery = `
        SELECT * FROM Responsaveis_Tecnicos 
        WHERE clinica_id = ? AND status = 'ativo'
        ORDER BY created_at ASC
      `;
      const result = await query(selectQuery, [clinicaId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar responsáveis da clínica:', error);
      throw new Error('Erro ao buscar responsáveis');
    }
  }
  
  // Atualizar responsável técnico
  static async update(id: number, responsavelData: ResponsavelTecnicoUpdateInput): Promise<ResponsavelTecnico | null> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(responsavelData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }
      
      const updateQuery = `
        UPDATE Responsaveis_Tecnicos 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      values.push(id);
      
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      // Buscar o responsável atualizado
      return await this.findById(id);
    } catch (error) {
      console.error('Erro ao atualizar responsável:', error);
      throw new Error('Erro ao atualizar responsável');
    }
  }
  
  // Deletar responsável técnico (soft delete)
  static async delete(id: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE Responsaveis_Tecnicos 
        SET status = 'inativo', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = await query(updateQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar responsável:', error);
      throw new Error('Erro ao deletar responsável');
    }
  }
  
  // Verificar se CRM já existe na clínica
  static async checkCrmExists(clinicaId: number, crm: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `
        SELECT id FROM Responsaveis_Tecnicos 
        WHERE clinica_id = ? AND crm = ? AND status = 'ativo'
      `;
      let params: any[] = [clinicaId, crm];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar CRM:', error);
      throw new Error('Erro ao verificar CRM');
    }
  }
}