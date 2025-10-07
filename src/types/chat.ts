// src/types/chat.ts

export type MessageType = 'text' | 'image' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ChatType = 'individual' | 'group';

export interface Message {
  id?: number;
  chat_id: number;
  sender_id: number;
  sender_type: 'operadora' | 'clinica';
  sender_name: string;
  content: string;
  message_type: MessageType;
  status: MessageStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Chat {
  id?: number;
  type: ChatType;
  operadora_id?: number;
  clinica_id?: number;
  name: string;
  description?: string;
  last_message_id?: number;
  last_message?: Message;
  created_at?: string;
  updated_at?: string;
}

export interface ChatParticipant {
  id?: number;
  chat_id: number;
  participant_id: number;
  participant_type: 'operadora' | 'clinica';
  joined_at?: string;
  last_read_message_id?: number;
  is_active: boolean;
}

export interface ChatWithParticipants extends Chat {
  participants: ChatParticipant[];
  unread_count?: number;
}

export interface MessageCreateInput {
  chat_id: number;
  sender_id: number;
  sender_type: 'operadora' | 'clinica';
  sender_name: string;
  content: string;
  message_type?: MessageType;
}

export interface ChatCreateInput {
  type: ChatType;
  operadora_id?: number;
  clinica_id?: number;
  name: string;
  description?: string;
}

export interface MessageWithChat extends Message {
  chat?: Chat;
}
