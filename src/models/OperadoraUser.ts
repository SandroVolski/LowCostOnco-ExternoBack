// src/models/OperadoraUser.ts

import { query } from '../config/database';
import bcrypt from 'bcryptjs';

export interface OperadoraUser {
  id: number;
  nome: string;
  email: string;
  username?: string;
  password: string;
  operadora_id: number;
  role: 'operadora_admin' | 'operadora_user';
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface OperadoraUserCreateInput {
  nome: string;
  email: string;
  username?: string;
  password: string;
  operadora_id: number;
  role?: 'operadora_admin' | 'operadora_user';
}

export interface OperadoraUserUpdateInput {
  nome?: string;
  email?: string;
  username?: string;
  password?: string;
  role?: 'operadora_admin' | 'operadora_user';
  status?: 'ativo' | 'inativo';
}

export class OperadoraUserModel {
  
  // Buscar usuário por ID
  static async findById(id: number): Promise<OperadoraUser | null> {
    try {
      const selectQuery = `
        SELECT id, nome, email, username, password, operadora_id, role, status, created_at, updated_at, last_login
        FROM OperadoraUsers 
        WHERE id = ?
      `;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar usuário da operadora por ID:', error);
      return null;
    }
  }
  
  // Buscar usuário por email
  static async findByEmail(email: string): Promise<OperadoraUser | null> {
    try {
      const selectQuery = `
        SELECT id, nome, email, username, password, operadora_id, role, status, created_at, updated_at, last_login
        FROM OperadoraUsers 
        WHERE email = ?
      `;
      const result = await query(selectQuery, [email]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar usuário da operadora por email:', error);
      return null;
    }
  }
  
  // Buscar usuário por username
  static async findByUsername(username: string): Promise<OperadoraUser | null> {
    try {
      const selectQuery = `
        SELECT id, nome, email, username, password, operadora_id, role, status, created_at, updated_at, last_login
        FROM OperadoraUsers 
        WHERE username = ?
      `;
      const result = await query(selectQuery, [username]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar usuário da operadora por username:', error);
      return null;
    }
  }
  
  // Criar novo usuário da operadora
  static async create(userData: OperadoraUserCreateInput): Promise<OperadoraUser> {
    try {
      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const insertQuery = `
        INSERT INTO OperadoraUsers (
          nome, email, username, password, operadora_id, role, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        userData.nome,
        userData.email,
        userData.username || null,
        hashedPassword,
        userData.operadora_id,
        userData.role || 'operadora_user',
        'ativo'
      ];
      
      const result = await query(insertQuery, values);
      const insertId = result.insertId;
      
      // Buscar o usuário recém-criado
      const novoUsuario = await this.findById(insertId);
      if (!novoUsuario) {
        throw new Error('Erro ao buscar usuário recém-criado');
      }
      
      return novoUsuario;
    } catch (error) {
      console.error('Erro ao criar usuário da operadora:', error);
      throw error;
    }
  }
  
  // Atualizar usuário
  static async update(id: number, userData: OperadoraUserUpdateInput): Promise<OperadoraUser | null> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          if (key === 'password') {
            // Hash da nova senha
            updateFields.push(`${key} = ?`);
            values.push(bcrypt.hashSync(value, 10));
          } else {
            updateFields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const updateQuery = `
        UPDATE OperadoraUsers 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      const result = await query(updateQuery, values);
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      return await this.findById(id);
    } catch (error) {
      console.error('Erro ao atualizar usuário da operadora:', error);
      throw error;
    }
  }
  
  // Verificar senha
  static async verifyPassword(user: OperadoraUser, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  }
  
  // Atualizar último login
  static async updateLastLogin(id: number): Promise<void> {
    try {
      const updateQuery = `
        UPDATE OperadoraUsers 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      await query(updateQuery, [id]);
    } catch (error) {
      console.error('Erro ao atualizar último login:', error);
    }
  }
  
  // Buscar usuários por operadora
  static async findByOperadora(operadoraId: number): Promise<OperadoraUser[]> {
    try {
      const selectQuery = `
        SELECT id, nome, email, username, operadora_id, role, status, created_at, updated_at, last_login
        FROM OperadoraUsers 
        WHERE operadora_id = ?
        ORDER BY nome ASC
      `;
      const result = await query(selectQuery, [operadoraId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar usuários da operadora:', error);
      return [];
    }
  }
  
  // Verificar se email já existe
  static async checkEmailExists(email: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `SELECT id FROM OperadoraUsers WHERE email = ?`;
      let params: any[] = [email];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar email existente:', error);
      return false;
    }
  }
  
  // Verificar se username já existe
  static async checkUsernameExists(username: string, excludeId?: number): Promise<boolean> {
    try {
      let checkQuery = `SELECT id FROM OperadoraUsers WHERE username = ?`;
      let params: any[] = [username];
      
      if (excludeId) {
        checkQuery += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const result = await query(checkQuery, params);
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar username existente:', error);
      return false;
    }
  }
}
