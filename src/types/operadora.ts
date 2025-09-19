// src/types/operadora.ts

export type OperadoraStatus = 'ativo' | 'inativo';

export interface Operadora {
  id?: number;
  nome: string;
  codigo: string;
  cnpj?: string;
  status: OperadoraStatus;
  created_at?: string;
  updated_at?: string;
}

export interface OperadoraCreateInput {
  nome: string;
  codigo: string;
  cnpj?: string;
  status?: OperadoraStatus;
  email?: string;
  senha?: string;
}

export interface OperadoraUpdateInput {
  nome?: string;
  codigo?: string;
  cnpj?: string;
  status?: OperadoraStatus;
}

// Interface para resposta da API
export interface OperadoraApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
