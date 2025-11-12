// src/models/Chat.ts

import { query } from '../config/database';
import { 
  Chat, 
  ChatWithParticipants,
  ChatCreateInput,
  Message,
  MessageCreateInput,
  MessageWithChat,
  ChatParticipant
} from '../types/chat';

export class ChatModel {
  
  // Criar novo chat
  static async create(chatData: ChatCreateInput): Promise<Chat> {
    try {
      const insertQuery = `
        INSERT INTO chats (
          type, operadora_id, clinica_id, name, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        chatData.type,
        chatData.operadora_id || null,
        chatData.clinica_id || null,
        chatData.name,
        chatData.description || null
      ];

      const result = await query(insertQuery, values);
      const chatId = result.insertId;

      // Buscar o chat recém-criado
      const newChat = await this.findById(chatId);
      if (!newChat) {
        throw new Error('Erro ao buscar chat recém-criado');
      }

      return newChat;
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      throw new Error('Erro ao criar chat');
    }
  }
  
  // Buscar chat por ID
  static async findById(id: number): Promise<Chat | null> {
    try {
      const selectQuery = `
        SELECT * FROM chats WHERE id = ?
      `;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar chat por ID:', error);
      return null;
    }
  }
  
  // Buscar chat com participantes
  static async findByIdWithParticipants(id: number): Promise<ChatWithParticipants | null> {
    try {
      const chat = await this.findById(id);
      if (!chat) return null;
      
      const participants = await this.getChatParticipants(id);
      
      return {
        ...chat,
        participants
      };
    } catch (error) {
      console.error('Erro ao buscar chat com participantes:', error);
      return null;
    }
  }
  
  // Buscar ou criar chat entre operadora e clínica
  static async findOrCreateOperadoraClinicaChat(operadoraId: number, clinicaId: number): Promise<Chat> {
    try {
      // Primeiro, tentar encontrar um chat existente
      const existingChatQuery = `
        SELECT * FROM chats 
        WHERE type = 'individual' 
        AND operadora_id = ? 
        AND clinica_id = ?
        LIMIT 1
      `;

      const existingChat = await query(existingChatQuery, [operadoraId, clinicaId]);

      if (existingChat.length > 0) {
        return existingChat[0];
      }

      // Buscar nomes para o chat
      const [operadoraResult, clinicaResult] = await Promise.all([
        query('SELECT nome FROM operadoras WHERE id = ?', [operadoraId]),
        query('SELECT nome FROM clinicas WHERE id = ?', [clinicaId])
      ]);

      const operadoraNome = operadoraResult[0]?.nome || 'Operadora';
      const clinicaNome = clinicaResult[0]?.nome || 'Clínica';

      const chatData: ChatCreateInput = {
        type: 'individual',
        operadora_id: operadoraId,
        clinica_id: clinicaId,
        name: `${operadoraNome} - ${clinicaNome}`,
        description: `Chat entre ${operadoraNome} e ${clinicaNome}`
      };

      return await this.create(chatData);
    } catch (error) {
      console.error('Erro ao buscar/criar chat operadora-clínica:', error);
      throw new Error('Erro ao buscar/criar chat');
    }
  }
  
  // Buscar chats de uma operadora (com todas as suas clínicas)
  static async findByOperadoraId(operadoraId: number): Promise<ChatWithParticipants[]> {
    try {
      const selectQuery = `
        SELECT DISTINCT c.*, 
               COUNT(DISTINCT m.id) as message_count,
               MAX(m.created_at) as last_message_time
        FROM chats c
        LEFT JOIN messages m ON c.id = m.chat_id
        WHERE c.operadora_id = ?
        GROUP BY c.id
        ORDER BY last_message_time DESC, c.created_at DESC
      `;
      
      const chats = await query(selectQuery, [operadoraId]);
      
      // Para cada chat, buscar participantes e última mensagem
      const chatsWithDetails = await Promise.all(
        chats.map(async (chat: any) => {
          const participants = await this.getChatParticipants(chat.id);
          const lastMessage = await MessageModel.getLastMessage(chat.id);
          
          return {
            ...chat,
            participants,
            last_message: lastMessage
          };
        })
      );
      
      return chatsWithDetails;
    } catch (error) {
      console.error('Erro ao buscar chats da operadora:', error);
      return [];
    }
  }
  
  // Buscar chats de uma clínica (apenas com sua operadora)
  static async findByClinicaId(clinicaId: number): Promise<ChatWithParticipants[]> {
    try {
      const selectQuery = `
        SELECT DISTINCT c.*, 
               COUNT(DISTINCT m.id) as message_count,
               MAX(m.created_at) as last_message_time
        FROM chats c
        LEFT JOIN messages m ON c.id = m.chat_id
        WHERE c.clinica_id = ?
        GROUP BY c.id
        ORDER BY last_message_time DESC, c.created_at DESC
      `;
      
      const chats = await query(selectQuery, [clinicaId]);
      
      // Para cada chat, buscar participantes e última mensagem
      const chatsWithDetails = await Promise.all(
        chats.map(async (chat: any) => {
          const participants = await this.getChatParticipants(chat.id);
          const lastMessage = await MessageModel.getLastMessage(chat.id);
          
          return {
            ...chat,
            participants,
            last_message: lastMessage
          };
        })
      );
      
      return chatsWithDetails;
    } catch (error) {
      console.error('Erro ao buscar chats da clínica:', error);
      return [];
    }
  }
  
  // Buscar participantes de um chat
  static async getChatParticipants(chatId: number): Promise<ChatParticipant[]> {
    try {
      const selectQuery = `
        SELECT * FROM chat_participants 
        WHERE chat_id = ? AND is_active = true
        ORDER BY joined_at ASC
      `;
      
      const result = await query(selectQuery, [chatId]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar participantes do chat:', error);
      return [];
    }
  }
  
  // Adicionar participante ao chat
  static async addParticipant(chatId: number, participantId: number, participantType: 'operadora' | 'clinica'): Promise<boolean> {
    try {
      const insertQuery = `
        INSERT INTO chat_participants (
          chat_id, participant_id, participant_type, joined_at, is_active
        ) VALUES (?, ?, ?, NOW(), true)
        ON DUPLICATE KEY UPDATE is_active = true, joined_at = NOW()
      `;
      
      const result = await query(insertQuery, [chatId, participantId, participantType]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao adicionar participante:', error);
      return false;
    }
  }
  
  // Remover participante do chat
  static async removeParticipant(chatId: number, participantId: number): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE chat_participants 
        SET is_active = false 
        WHERE chat_id = ? AND participant_id = ?
      `;
      
      const result = await query(updateQuery, [chatId, participantId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao remover participante:', error);
      return false;
    }
  }
}

export class MessageModel {
  
  // Criar nova mensagem
  static async create(messageData: MessageCreateInput): Promise<Message> {
    try {
      const insertQuery = `
        INSERT INTO messages (
          chat_id, sender_id, sender_type, sender_name, content, 
          message_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'sent', NOW(), NOW())
      `;

      const values = [
        messageData.chat_id,
        messageData.sender_id,
        messageData.sender_type,
        messageData.sender_name,
        messageData.content,
        messageData.message_type || 'text'
      ];

      const result = await query(insertQuery, values);
      const messageId = result.insertId;

      // Atualizar última mensagem do chat
      await this.updateChatLastMessage(messageData.chat_id, messageId);

      // Buscar a mensagem recém-criada
      const newMessage = await this.findById(messageId);
      if (!newMessage) {
        throw new Error('Erro ao buscar mensagem recém-criada');
      }

      return newMessage;
    } catch (error) {
      console.error('Erro ao criar mensagem:', error);
      throw new Error('Erro ao criar mensagem');
    }
  }
  
  // Buscar mensagem por ID
  static async findById(id: number): Promise<Message | null> {
    try {
      const selectQuery = `
        SELECT * FROM messages WHERE id = ?
      `;
      const result = await query(selectQuery, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar mensagem por ID:', error);
      return null;
    }
  }
  
  // Buscar mensagens de um chat
  static async findByChatId(chatId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const selectQuery = `
        SELECT * FROM messages 
        WHERE chat_id = ? 
        ORDER BY created_at ASC 
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(selectQuery, [
        parseInt(chatId.toString()), 
        limit, 
        offset
      ]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar mensagens do chat:', error);
      return [];
    }
  }
  
  // Buscar última mensagem de um chat
  static async getLastMessage(chatId: number): Promise<Message | null> {
    try {
      const selectQuery = `
        SELECT * FROM messages 
        WHERE chat_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await query(selectQuery, [chatId]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar última mensagem:', error);
      return null;
    }
  }
  
  // Marcar mensagens como lidas
  static async markAsRead(chatId: number, readerId: number, readerType: 'operadora' | 'clinica'): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE messages m
        JOIN chats c ON m.chat_id = c.id
        SET m.status = 'read'
        WHERE m.chat_id = ? 
        AND m.sender_id != ? 
        AND m.sender_type != ?
        AND m.status != 'read'
      `;
      
      const result = await query(updateQuery, [chatId, readerId, readerType]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      return false;
    }
  }
  
  // Contar mensagens não lidas
  static async countUnreadMessages(chatId: number, readerId: number, readerType: 'operadora' | 'clinica'): Promise<number> {
    try {
      const selectQuery = `
        SELECT COUNT(*) as count FROM messages 
        WHERE chat_id = ? 
        AND sender_id != ? 
        AND sender_type != ?
        AND status != 'read'
      `;
      
      const result = await query(selectQuery, [chatId, readerId, readerType]);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error);
      return 0;
    }
  }
  
  // Atualizar última mensagem do chat
  private static async updateChatLastMessage(chatId: number, messageId: number): Promise<void> {
    try {
      const updateQuery = `
        UPDATE chats 
        SET last_message_id = ?, updated_at = NOW() 
        WHERE id = ?
      `;
      
      await query(updateQuery, [messageId, chatId]);
    } catch (error) {
      console.error('Erro ao atualizar última mensagem do chat:', error);
    }
  }
  
  // Buscar mensagens não lidas de um usuário
  static async findUnreadMessagesByUser(userId: number, userType: 'operadora' | 'clinica'): Promise<MessageWithChat[]> {
    try {
      const selectQuery = `
        SELECT m.*, c.name as chat_name, c.type as chat_type
        FROM messages m
        JOIN chats c ON m.chat_id = c.id
        WHERE m.chat_id IN (
          SELECT DISTINCT chat_id 
          FROM chat_participants 
          WHERE participant_id = ? AND participant_type = ? AND is_active = true
        )
        AND m.sender_id != ? 
        AND m.sender_type != ?
        AND m.status != 'read'
        ORDER BY m.created_at DESC
      `;
      
      const result = await query(selectQuery, [userId, userType, userId, userType]);
      return result;
    } catch (error) {
      console.error('Erro ao buscar mensagens não lidas:', error);
      return [];
    }
  }
}
