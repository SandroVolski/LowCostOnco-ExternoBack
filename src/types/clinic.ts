// src/types/clinic.ts

import { Operadora } from './operadora';

export type ClinicStatus = 'ativo' | 'inativo';
export type ResponsavelStatus = 'ativo' | 'inativo';

export interface ResponsavelTecnico {
  id?: number;
  clinica_id: number;
  nome: string;
  tipo_profissional: 'medico' | 'nutricionista' | 'enfermeiro' | 'farmaceutico' | 'terapeuta_ocupacional';
  registro_conselho: string; // Substitui CRM
  uf_registro: string;
  especialidade_principal: string;
  rqe_principal?: string;
  especialidade_secundaria?: string;
  rqe_secundaria?: string;
  cnes: string;
  telefone?: string;
  email?: string;
  responsavel_tecnico: boolean;
  operadoras_habilitadas?: number[]; // IDs das operadoras
  documentos?: {
    carteira_conselho?: string;
    diploma?: string;
    comprovante_especializacao?: string;
  };
  status: ResponsavelStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ResponsavelTecnicoCreateInput {
  clinica_id: number;
  nome: string;
  tipo_profissional: 'medico' | 'nutricionista' | 'enfermeiro' | 'farmaceutico' | 'terapeuta_ocupacional';
  registro_conselho: string;
  uf_registro: string;
  especialidade_principal: string;
  rqe_principal?: string;
  especialidade_secundaria?: string;
  rqe_secundaria?: string;
  cnes: string;
  telefone?: string;
  email?: string;
  responsavel_tecnico: boolean;
  operadoras_habilitadas?: number[];
  documentos?: {
    carteira_conselho?: string;
    diploma?: string;
    comprovante_especializacao?: string;
  };
  status?: ResponsavelStatus;
}

export interface ResponsavelTecnicoUpdateInput {
  nome?: string;
  tipo_profissional?: 'medico' | 'nutricionista' | 'enfermeiro' | 'farmaceutico' | 'terapeuta_ocupacional';
  registro_conselho?: string;
  uf_registro?: string;
  especialidade_principal?: string;
  rqe_principal?: string;
  especialidade_secundaria?: string;
  rqe_secundaria?: string;
  cnes?: string;
  telefone?: string;
  email?: string;
  responsavel_tecnico?: boolean;
  operadoras_habilitadas?: number[];
  documentos?: {
    carteira_conselho?: string;
    diploma?: string;
    comprovante_especializacao?: string;
  };
  status?: ResponsavelStatus;
}

export interface Clinica {
  id?: number;
  nome: string;
  razao_social?: string;
  codigo: string;
  cnpj?: string;
  // Endereço (campo legado, mantido para compatibilidade)
  endereco?: string;
  // Novos campos de endereço desmembrados
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_complemento?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  operadora_id?: number;
  operadora_ids?: number[];
  operadoras?: Operadora[];
  // Campos antigos (mantidos para compatibilidade)
  telefone?: string;
  email?: string;
  // Novos campos para múltiplos contatos
  telefones?: string[];
  emails?: string[];
  // Contatos organizados por setor
  contatos_pacientes?: { telefones?: string[]; emails?: string[] };
  contatos_administrativos?: { telefones?: string[]; emails?: string[] };
  contatos_legais?: { telefones?: string[]; emails?: string[] };
  contatos_faturamento?: { telefones?: string[]; emails?: string[] };
  contatos_financeiro?: { telefones?: string[]; emails?: string[] };
  website?: string;
  logo_url?: string;
  observacoes?: string;
  usuario?: string;
  senha?: string;
  status: ClinicStatus;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  responsaveis_tecnicos?: ResponsavelTecnico[];
}

export interface ClinicaCreateInput {
  nome: string;
  razao_social?: string;
  codigo: string;
  cnpj?: string;
  // Endereço (campo legado)
  endereco?: string;
  // Novos campos de endereço desmembrados
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_complemento?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  // Campos antigos (mantidos para compatibilidade)
  telefone?: string;
  email?: string;
  // Novos campos para múltiplos contatos
  telefones?: string[];
  emails?: string[];
  // Contatos organizados por setor
  contatos_pacientes?: { telefones?: string[]; emails?: string[] };
  contatos_administrativos?: { telefones?: string[]; emails?: string[] };
  contatos_legais?: { telefones?: string[]; emails?: string[] };
  contatos_faturamento?: { telefones?: string[]; emails?: string[] };
  contatos_financeiro?: { telefones?: string[]; emails?: string[] };
  website?: string;
  logo_url?: string;
  observacoes?: string;
  usuario?: string;
  senha?: string;
  status?: ClinicStatus;
  operadora_id?: number;
  operadora_ids?: number[];
}

export interface ClinicaUpdateInput {
  nome?: string;
  razao_social?: string;
  codigo?: string;
  cnpj?: string;
  // Endereço (campo legado)
  endereco?: string;
  // Novos campos de endereço desmembrados
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_complemento?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  // Campos antigos (mantidos para compatibilidade)
  telefone?: string;
  email?: string;
  // Novos campos para múltiplos contatos
  telefones?: string[];
  emails?: string[];
  // Contatos organizados por setor
  contatos_pacientes?: { telefones?: string[]; emails?: string[] };
  contatos_administrativos?: { telefones?: string[]; emails?: string[] };
  contatos_legais?: { telefones?: string[]; emails?: string[] };
  contatos_faturamento?: { telefones?: string[]; emails?: string[] };
  contatos_financeiro?: { telefones?: string[]; emails?: string[] };
  website?: string;
  logo_url?: string;
  observacoes?: string;
  usuario?: string;
  senha?: string;
  status?: ClinicStatus;
  operadora_id?: number;
  operadora_ids?: number[];
}

export interface ClinicaProfile {
  clinica: Clinica;
  responsaveis_tecnicos: ResponsavelTecnico[];
}

// Interfaces para requests da API
export interface UpdateClinicProfileRequest {
  clinica: ClinicaUpdateInput;
  responsaveis_tecnicos?: {
    create?: ResponsavelTecnicoCreateInput[];
    update?: Array<{ id: number; data: ResponsavelTecnicoUpdateInput }>;
    delete?: number[];
  };
}

export interface ClinicLoginRequest {
  usuario: string;
  senha: string;
}

export interface ClinicLoginResponse {
  success: boolean;
  message: string;
  data?: {
    clinic: Clinica;
    token: string;
  };
  error?: string;
}