import { query } from '../config/database';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'clinica' | 'operadora';
export interface User {
  id: number;
  clinica_id: number | null;
  nome: string;
  email: string;
  username: string | null;
  password_hash: string;
  role: UserRole;
  status: 'ativo' | 'inativo';
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  clinica_id?: number | null;
  nome: string;
  email: string;
  username?: string | null;
  password: string;
  role?: UserRole;
  status?: 'ativo' | 'inativo';
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const rows = await query('SELECT * FROM Usuarios WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const rows = await query('SELECT * FROM Usuarios WHERE username = ? LIMIT 1', [username]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findById(id: number): Promise<User | null> {
    const rows = await query('SELECT * FROM Usuarios WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(data: CreateUserInput): Promise<User> {
    const password_hash = await bcrypt.hash(data.password, 10);
    const values = [
      data.clinica_id ?? null,
      data.nome,
      data.email,
      data.username ?? null,
      password_hash,
      data.role || 'clinica',
      data.status || 'ativo'
    ];
    const result = await query(
      `INSERT INTO Usuarios (clinica_id, nome, email, username, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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


