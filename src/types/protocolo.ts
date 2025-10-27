// src/types/protocolo.ts

export type ProtocoloStatus = 'ativo' | 'inativo';

export interface Medicamento {
  id?: number;
  protocolo_id?: number;
  nome: string;
  dose?: string;
  unidade_medida?: string;
  via_adm?: string;
  dias_adm?: string;
  frequencia?: string;
  observacoes?: string;
  ordem?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Protocolo {
  id?: number;
  clinica_id: number;
  nome: string;
  descricao?: string;
  cid?: string;
  intervalo_ciclos?: number;
  ciclos_previstos?: number;
  linha?: number;
  status?: ProtocoloStatus;
  medicamentos?: Medicamento[];
  created_at?: string;
  updated_at?: string;
}

export interface ProtocoloCreateInput {
  clinica_id: number;
  nome: string;
  descricao?: string;
  cid?: string;
  intervalo_ciclos?: number;
  ciclos_previstos?: number;
  linha?: number;
  status?: ProtocoloStatus;
  medicamentos?: Omit<Medicamento, 'id' | 'protocolo_id' | 'created_at' | 'updated_at'>[];
}

export interface ProtocoloUpdateInput {
  nome?: string;
  descricao?: string;
  cid?: string;
  intervalo_ciclos?: number;
  ciclos_previstos?: number;
  linha?: number;
  status?: ProtocoloStatus;
  medicamentos?: Omit<Medicamento, 'id' | 'protocolo_id' | 'created_at' | 'updated_at'>[];
}

export interface ProtocoloWithMedicamentos extends Protocolo {
  medicamentos: Medicamento[];
} 