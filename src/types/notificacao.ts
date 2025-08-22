export type NotificacaoTipo = 'auth_created' | 'auth_status' | 'patient_created' | 'message' | 'system';

export interface Notificacao {
  id?: number;
  clinica_id: number;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at?: string;
  solicitacao_id?: number | null;
  paciente_id?: number | null;
}

export interface NotificacaoCreateInput {
  clinica_id: number;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  solicitacao_id?: number | null;
  paciente_id?: number | null;
} 