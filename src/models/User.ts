import { query } from '../config/database';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'clinica' | 'operadora';
export interface User {
  id: number;
  clinica_id: number | null;
  operadora_id?: number | null;
  nome: string;
  email: string;
  username: string | null;
  password_hash: string;
  role: UserRole | 'operadora_admin' | 'operadora_user' | 'operator';
  status: 'ativo' | 'inativo';
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  clinica_id?: number | null;
  operadora_id?: number | null;
  nome: string;
  email: string;
  username?: string | null;
  password: string;
  role?: UserRole | 'operadora_admin' | 'operadora_user' | 'operator';
  status?: 'ativo' | 'inativo';
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    console.log(`🔍 [UserModel.findByEmail] Buscando usuário com email: "${email}"`);
    // Tentar com minúsculo primeiro (padrão do sistema)
    let rows = await query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
    // Se não encontrar, tentar com maiúsculo (caso a tabela tenha nome diferente)
    if (rows.length === 0) {
      console.log(`🔍 [UserModel.findByEmail] Tentando com nome de tabela alternativo...`);
      rows = await query('SELECT * FROM Usuarios WHERE email = ? LIMIT 1', [email]);
    }
    
    // Se não encontrou na tabela usuarios, buscar na tabela clinicas (campo usuario)
    if (rows.length === 0) {
      console.log(`🔍 [UserModel.findByEmail] Tentando buscar na tabela clinicas (campo usuario)...`);
      const clinicaRows = await query(
        `SELECT id, usuario as email, usuario as username, nome, senha as password_hash, 
         'clinica' as role, status, NULL as clinica_id, NULL as operadora_id,
         NULL as last_login, created_at, updated_at
         FROM clinicas WHERE usuario = ? AND status = 'ativo' LIMIT 1`,
        [email]
      );
      
      if (clinicaRows.length > 0) {
        console.log(`✅ [UserModel.findByEmail] Clínica encontrada na tabela clinicas`);
        // Converter para formato User
        const clinica = clinicaRows[0];
        rows = [{
          id: clinica.id,
          email: clinica.email,
          username: clinica.username,
          nome: clinica.nome,
          password_hash: clinica.password_hash,
          role: 'clinica',
          status: clinica.status,
          clinica_id: clinica.id, // O próprio ID da clínica
          operadora_id: null,
          last_login: null,
          created_at: clinica.created_at,
          updated_at: clinica.updated_at
        }];
      }
    }
    
    console.log(`📊 [UserModel.findByEmail] Resultado: ${rows.length} usuário(s) encontrado(s)`);
    if (rows.length > 0) {
      console.log(`✅ [UserModel.findByEmail] Usuário encontrado:`, {
        id: rows[0].id,
        email: rows[0].email,
        status: rows[0].status,
        role: rows[0].role
      });
    } else {
      console.log(`⚠️ [UserModel.findByEmail] Nenhum usuário encontrado com email: "${email}"`);
    }
    return rows.length > 0 ? rows[0] : null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    let rows = await query('SELECT * FROM usuarios WHERE username = ? LIMIT 1', [username]);
    if (rows.length === 0) {
      rows = await query('SELECT * FROM Usuarios WHERE username = ? LIMIT 1', [username]);
    }
    return rows.length > 0 ? rows[0] : null;
  }

  static async findById(id: number): Promise<User | null> {
    let rows = await query('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      rows = await query('SELECT * FROM Usuarios WHERE id = ? LIMIT 1', [id]);
    }
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(data: CreateUserInput): Promise<User> {
    const password_hash = await bcrypt.hash(data.password, 10);
    const values = [
      data.clinica_id ?? null,
      data.operadora_id ?? null,
      data.nome,
      data.email,
      data.username ?? null,
      password_hash,
      data.role || 'clinica',
      data.status || 'ativo'
    ];
    const result = await query(
      `INSERT INTO usuarios (clinica_id, operadora_id, nome, email, username, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );
    const inserted = await this.findById(result.insertId);
    if (!inserted) throw new Error('Falha ao criar usuário');
    return inserted as User;
  }

  static async updateLastLogin(id: number): Promise<void> {
    await query('UPDATE Usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }
}


