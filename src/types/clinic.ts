// src/types/clinic.ts

export type ClinicStatus = 'ativo' | 'inativo';
export type ResponsavelStatus = 'ativo' | 'inativo';

export interface ResponsavelTecnico {
  id?: number;
  clinica_id: number;
  nome: string;
  crm: string;
  especialidade: string;
  telefone?: string;
  email?: string;
  status?: ResponsavelStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ResponsavelTecnicoCreateInput {
  clinica_id: number;
  nome: string;
  crm: string;
  especialidade: string;
  telefone?: string;
  email?: string;
  status?: ResponsavelStatus;
}

export interface ResponsavelTecnicoUpdateInput {
  nome?: string;
  crm?: string;
  especialidade?: string;
  telefone?: string;
  email?: string;
  status?: ResponsavelStatus;
}

export interface Clinica {
  id?: number;
  nome: string;
  codigo: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  operadora_id?: number;
  // Campos antigos (mantidos para compatibilidade)
  telefone?: string;
  email?: string;
  // Novos campos para múltiplos contatos
  telefones?: string[];
  emails?: string[];
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
  codigo: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  // Campos antigos (mantidos para compatibilidade)
  telefone?: string;
  email?: string;
  // Novos campos para múltiplos contatos
  telefones?: string[];
  emails?: string[];
  website?: string;
  logo_url?: string;
  observacoes?: string;
  usuario?: string;
  senha?: string;
  status?: ClinicStatus;
  operadora_id?: number;
}

export interface ClinicaUpdateInput {
  nome?: string;
  codigo?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  // Campos antigos (mantidos para compatibilidade)
  telefone?: string;
  email?: string;
  // Novos campos para múltiplos contatos
  telefones?: string[];
  emails?: string[];
  website?: string;
  logo_url?: string;
  observacoes?: string;
  usuario?: string;
  senha?: string;
  status?: ClinicStatus;
  operadora_id?: number;
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