export type PatientStatus = 'Em tratamento' | 'Em remissão' | 'Alta' | 'Óbito' | 'Suspenso';

export interface Paciente {
  id?: number;
  clinica_id: number;
  Paciente_Nome: string;
  Operadora: number;
  Prestador: number;
  Codigo?: string;
  Data_Nascimento: string; // YYYY-MM-DD format
  Sexo: 'Masculino' | 'Feminino';
  Cid_Diagnostico: string;
  stage: string;
  treatment: string;
  Data_Primeira_Solicitacao: string; // YYYY-MM-DD format
  cpf?: string;
  rg?: string;
  telefone?: string;
  endereco?: string;
  email?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  plano_saude?: string;
  abrangencia?: string;
  numero_carteirinha?: string;
  status: PatientStatus;
  observacoes?: string;
  // Contato do prestador
  setor_prestador?: string;
  // Contato de emergência
  contato_emergencia_nome?: string;
  contato_emergencia_telefone?: string;
  // Endereço desmembrado
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string; // UF
  endereco_cep?: string;    // 00000-000
  // Medidas
  peso?: number;   // kg
  altura?: number; // cm
  created_at?: string;
  updated_at?: string;
}

export interface PacienteCreateInput {
  clinica_id: number;
  Paciente_Nome: string;
  Operadora: number | string;
  Prestador: number | string;
  Codigo?: string;
  Data_Nascimento: string;
  Sexo: 'Masculino' | 'Feminino';
  Cid_Diagnostico: string;
  stage: string;
  treatment: string;
  Data_Primeira_Solicitacao?: string;
  // Alias aceito pelo front
  Data_Inicio_Tratamento?: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  endereco?: string;
  email?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  plano_saude?: string;
  abrangencia?: string;
  numero_carteirinha?: string;
  status: PatientStatus;
  observacoes?: string;
  setor_prestador?: string;
  contato_emergencia_nome?: string;
  contato_emergencia_telefone?: string;
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  peso?: number;
  altura?: number;
}

export interface PacienteUpdateInput {
  Paciente_Nome?: string;
  Operadora?: number | string;
  Prestador?: number | string;
  Codigo?: string;
  Data_Nascimento?: string;
  Sexo?: 'Masculino' | 'Feminino';
  Cid_Diagnostico?: string;
  stage?: string;
  treatment?: string;
  Data_Primeira_Solicitacao?: string;
  Data_Inicio_Tratamento?: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  endereco?: string;
  email?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  plano_saude?: string;
  abrangencia?: string;
  numero_carteirinha?: string;
  status?: PatientStatus;
  observacoes?: string;
  setor_prestador?: string;
  contato_emergencia_nome?: string;
  contato_emergencia_telefone?: string;
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  peso?: number;
  altura?: number;
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

// Re-export types from other modules
export * from './clinic';
export * from './solicitacao';
export * from './protocolo';
export * from './notificacao';
export * from './operadora';