// src/types/solicitacao.ts

export type SolicitacaoStatus = 'pendente' | 'aprovada' | 'rejeitada' | 'em_analise';
export type SexoType = 'M' | 'F';
export type FinalidadeType = 'neoadjuvante' | 'adjuvante' | 'curativo' | 'controle' | 'radioterapia' | 'paliativo';

export interface SolicitacaoAutorizacao {
  id?: number;
  clinica_id: number;
  paciente_id?: number | null;
  
  // Dados da Clínica
  hospital_nome: string;
  hospital_codigo: string;
  
  // Dados do Paciente
  cliente_nome: string;
  cliente_codigo: string;
  sexo: SexoType;
  data_nascimento: string; // YYYY-MM-DD
  idade: number;
  data_solicitacao: string; // YYYY-MM-DD
  
  // Diagnóstico e Estadiamento
  diagnostico_cid: string;
  diagnostico_descricao: string;
  local_metastases?: string;
  estagio_t?: string;
  estagio_n?: string;
  estagio_m?: string;
  estagio_clinico?: string;
  
  // Tratamentos Anteriores
  tratamento_cirurgia_radio?: string;
  tratamento_quimio_adjuvante?: string;
  tratamento_quimio_primeira_linha?: string;
  tratamento_quimio_segunda_linha?: string;
  
  // Esquema Terapêutico
  finalidade: FinalidadeType;
  performance_status: string;
  siglas?: string;
  ciclos_previstos: number;
  ciclo_atual: number;
  superficie_corporal: number;
  peso: number;
  altura: number;
  
  // Medicamentos
  medicamentos_antineoplasticos: string;
  dose_por_m2: string;
  dose_total: string;
  via_administracao: string;
  dias_aplicacao_intervalo: string;
  medicacoes_associadas?: string;
  
  // Assinatura e Autorização
  medico_assinatura_crm: string;
  numero_autorizacao?: string;
  
  // Dados do Protocolo
  protocolo_id?: number;
  protocolo_nome?: string;
  protocolo_descricao?: string;
  protocolo_cid?: string;
  protocolo_intervalo_ciclos?: number;
  protocolo_linha?: number;
  protocolo_medicamentos_json?: string;
  
  // Status e Controle
  status: SolicitacaoStatus;
  observacoes?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface SolicitacaoCreateInput {
  clinica_id: number;
  paciente_id?: number | null;
  hospital_nome: string;
  hospital_codigo: string;
  cliente_nome: string;
  cliente_codigo: string;
  sexo: SexoType;
  data_nascimento: string;
  idade: number;
  data_solicitacao: string;
  diagnostico_cid: string;
  diagnostico_descricao: string;
  local_metastases?: string;
  estagio_t?: string;
  estagio_n?: string;
  estagio_m?: string;
  estagio_clinico?: string;
  tratamento_cirurgia_radio?: string;
  tratamento_quimio_adjuvante?: string;
  tratamento_quimio_primeira_linha?: string;
  tratamento_quimio_segunda_linha?: string;
  finalidade: FinalidadeType;
  performance_status: string;
  siglas?: string;
  ciclos_previstos: number;
  ciclo_atual: number;
  superficie_corporal: number;
  peso: number;
  altura: number;
  medicamentos_antineoplasticos: string;
  dose_por_m2: string;
  dose_total: string;
  via_administracao: string;
  dias_aplicacao_intervalo: string;
  medicacoes_associadas?: string;
  medico_assinatura_crm: string;
  numero_autorizacao?: string;
  observacoes?: string;
  // Dados do Protocolo
  protocolo_id?: number;
  protocolo_nome?: string;
  protocolo_descricao?: string;
  protocolo_cid?: string;
  protocolo_intervalo_ciclos?: number;
  protocolo_linha?: number;
  protocolo_medicamentos_json?: string;
}

export interface SolicitacaoUpdateInput {
  status?: SolicitacaoStatus;
  numero_autorizacao?: string;
  observacoes?: string;
}