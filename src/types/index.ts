export type PatientStatus = 'ativo' | 'inativo' | 'alta' | 'obito';

export interface Paciente {
  id?: number;
  clinica_id: number;
  Paciente_Nome: string;
  Operadora: number;
  Prestador: number;
  Codigo: string;
  Data_Nascimento: string; // YYYY-MM-DD format
  Sexo: string;
  Cid_Diagnostico: string;
  Data_Primeira_Solicitacao: string; // YYYY-MM-DD format
  cpf?: string;
  rg?: string;
  telefone?: string;
  endereco?: string;
  email?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  plano_saude?: string;
  numero_carteirinha?: string;
  status: PatientStatus;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PacienteCreateInput {
  clinica_id: number;
  Paciente_Nome: string;
  Operadora: number;
  Prestador: number;
  Codigo: string;
  Data_Nascimento: string;
  Sexo: string;
  Cid_Diagnostico: string;
  Data_Primeira_Solicitacao: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  endereco?: string;
  email?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  plano_saude?: string;
  numero_carteirinha?: string;
  status?: PatientStatus;
  observacoes?: string;
}

export interface PacienteUpdateInput {
  Paciente_Nome?: string;
  Operadora?: number;
  Prestador?: number;
  Codigo?: string;
  Data_Nascimento?: string;
  Sexo?: string;
  Cid_Diagnostico?: string;
  Data_Primeira_Solicitacao?: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  endereco?: string;
  email?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  plano_saude?: string;
  numero_carteirinha?: string;
  status?: PatientStatus;
  observacoes?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}