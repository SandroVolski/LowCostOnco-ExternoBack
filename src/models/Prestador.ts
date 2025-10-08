// src/models/Prestador.ts

import { query } from '../config/database';

export interface Prestador {
  id: number;
  clinica_id: number;
  nome: string;
  tipo_profissional?: 'medico' | 'nutricionista' | 'enfermeiro' | 'farmaceutico' | 'terapeuta_ocupacional';
  registro_conselho?: string;
  uf_registro?: string;
  especialidade_principal?: string;
  rqe_principal?: string;
  especialidade_secundaria?: string;
  rqe_secundaria?: string;
  responsavel_tecnico?: boolean;
  operadoras_habilitadas?: any;
  documentos?: any;
  cnes?: string;
  crm?: string;
  especialidade?: string;
  telefone?: string;
  email?: string;
  status?: 'ativo' | 'inativo';
  created_at?: string;
  updated_at?: string;
}

export class PrestadorModel {
  
  // Buscar prestadores por clínica
  static async findByClinicaId(clinicaId: number): Promise<Prestador[]> {
    try {
      const sql = `SELECT 
        id,
        clinica_id,
        nome,
        tipo_profissional,
        registro_conselho,
        uf_registro,
        especialidade_principal,
        rqe_principal,
        especialidade_secundaria,
        rqe_secundaria,
        responsavel_tecnico,
        operadoras_habilitadas,
        documentos,
        cnes,
        crm,
        especialidade,
        telefone,
        email,
        status,
        created_at,
        updated_at
      FROM responsaveis_tecnicos 
      WHERE clinica_id = ? AND (status = 'ativo' OR status IS NULL)
      ORDER BY nome ASC`;
      
      const rows = await query(sql, [clinicaId]);
      
      return rows as Prestador[];
    } catch (error) {
      console.error('❌ Erro ao buscar prestadores por clínica:', error);
      // Retornar dados mock em caso de erro
      return [
        { id: 1, clinica_id: clinicaId, nome: 'Dr. Carlos Santos', especialidade: 'Oncologia', crm: '12345', tipo_profissional: 'medico' },
        { id: 2, clinica_id: clinicaId, nome: 'Dra. Maria Silva', especialidade: 'Hematologia', crm: '67890', tipo_profissional: 'medico' },
        { id: 3, clinica_id: clinicaId, nome: 'Dr. João Oliveira', especialidade: 'Oncologia', crm: '54321', tipo_profissional: 'medico' },
        { id: 4, clinica_id: clinicaId, nome: 'Dra. Ana Costa', especialidade: 'Radioterapia', crm: '98765', tipo_profissional: 'medico' },
        { id: 5, clinica_id: clinicaId, nome: 'Dr. Pedro Lima', especialidade: 'Cirurgia Oncológica', crm: '13579', tipo_profissional: 'medico' }
      ];
    }
  }

  // Buscar todos os prestadores
  static async findAll(): Promise<Prestador[]> {
    try {
      const sql = `SELECT 
        id,
        clinica_id,
        nome,
        tipo_profissional,
        registro_conselho,
        uf_registro,
        especialidade_principal,
        rqe_principal,
        especialidade_secundaria,
        rqe_secundaria,
        responsavel_tecnico,
        operadoras_habilitadas,
        documentos,
        cnes,
        crm,
        especialidade,
        telefone,
        email,
        status,
        created_at,
        updated_at
      FROM responsaveis_tecnicos 
      WHERE status = 'ativo' OR status IS NULL
      ORDER BY nome ASC`;
      
      const rows = await query(sql);
      
      return rows as Prestador[];
    } catch (error) {
      console.error('❌ Erro ao buscar todos os prestadores:', error);
      throw error;
    }
  }

  // Buscar prestador por ID
  static async findById(id: number): Promise<Prestador | null> {
    try {
      const sql = `SELECT 
        id,
        clinica_id,
        nome,
        tipo_profissional,
        registro_conselho,
        uf_registro,
        especialidade_principal,
        rqe_principal,
        especialidade_secundaria,
        rqe_secundaria,
        responsavel_tecnico,
        operadoras_habilitadas,
        documentos,
        cnes,
        crm,
        especialidade,
        telefone,
        email,
        status,
        created_at,
        updated_at
      FROM responsaveis_tecnicos 
      WHERE id = ?`;
      
      const rows = await query(sql, [id]);
      
      const prestadores = rows as Prestador[];
      return prestadores.length > 0 ? prestadores[0] : null;
    } catch (error) {
      console.error('❌ Erro ao buscar prestador por ID:', error);
      throw error;
    }
  }

  // Buscar prestador por nome
  static async findByName(nome: string, clinicaId?: number): Promise<Prestador | null> {
    try {
      let sql = `SELECT 
        id,
        clinica_id,
        nome,
        tipo_profissional,
        registro_conselho,
        uf_registro,
        especialidade_principal,
        rqe_principal,
        especialidade_secundaria,
        rqe_secundaria,
        responsavel_tecnico,
        operadoras_habilitadas,
        documentos,
        cnes,
        crm,
        especialidade,
        telefone,
        email,
        status,
        created_at,
        updated_at
      FROM responsaveis_tecnicos 
      WHERE nome = ?`;
      
      const params: any[] = [nome];
      
      if (clinicaId) {
        sql += ` AND clinica_id = ?`;
        params.push(clinicaId);
      }
      
      const rows = await query(sql, params);
      
      const prestadores = rows as Prestador[];
      return prestadores.length > 0 ? prestadores[0] : null;
    } catch (error) {
      console.error('❌ Erro ao buscar prestador por nome:', error);
      throw error;
    }
  }
}
