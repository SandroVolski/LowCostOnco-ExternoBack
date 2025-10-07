// src/controllers/chatController.ts

import { Request, Response } from 'express';
import { ChatModel, MessageModel } from '../models/Chat';
import { ChatCreateInput, MessageCreateInput } from '../types/chat';

export class ChatController {
  
  // GET /api/chat/chats - Buscar chats do usuário
  static async getUserChats(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user.id;
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      
      console.log('🔧 Buscando chats para usuário:', { userId, userType });
      
      let chats;
      
      if (userType === 'operadora') {
        chats = await ChatModel.findByOperadoraId(userId);
      } else {
        chats = await ChatModel.findByClinicaId(userId);
      }
      
      // Adicionar contagem de mensagens não lidas
      const chatsWithUnreadCount = await Promise.all(
        chats.map(async (chat) => {
          const unreadCount = await MessageModel.countUnreadMessages(chat.id!, userId, userType);
          return {
            ...chat,
            unread_count: unreadCount
          };
        })
      );
      
      res.json({
        success: true,
        data: chatsWithUnreadCount
      });
    } catch (error) {
      console.error('❌ Erro ao buscar chats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // GET /api/chat/chats/:id - Buscar chat específico
  static async getChat(req: Request, res: Response): Promise<void> {
    try {
      const chatId = parseInt(req.params.id);
      const user = (req as any).user;
      
      if (isNaN(chatId)) {
        res.status(400).json({
          success: false,
          message: 'ID do chat inválido'
        });
        return;
      }
      
      const chat = await ChatModel.findByIdWithParticipants(chatId);
      
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      // Verificar se o usuário tem acesso ao chat
      const hasAccess = chat.participants.some(
        participant => participant.participant_id === user.id && 
                     participant.participant_type === (user.tipo === 'operadora' ? 'operadora' : 'clinica')
      );
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      res.json({
        success: true,
        data: chat
      });
    } catch (error) {
      console.error('❌ Erro ao buscar chat:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // GET /api/chat/chats/:id/messages - Buscar mensagens de um chat
  static async getChatMessages(req: Request, res: Response): Promise<void> {
    try {
      const chatId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const user = (req as any).user;
      
      if (isNaN(chatId)) {
        res.status(400).json({
          success: false,
          message: 'ID do chat inválido'
        });
        return;
      }
      
      // Verificar se o usuário tem acesso ao chat
      const chat = await ChatModel.findByIdWithParticipants(chatId);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      const hasAccess = chat.participants.some(
        participant => participant.participant_id === user.id && 
                     participant.participant_type === (user.tipo === 'operadora' ? 'operadora' : 'clinica')
      );
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      const messages = await MessageModel.findByChatId(chatId, limit, offset);
      
      // Marcar mensagens como lidas
      await MessageModel.markAsRead(chatId, user.id, user.tipo === 'operadora' ? 'operadora' : 'clinica');
      
      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            limit,
            offset,
            total: messages.length
          }
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // POST /api/chat/chats/:id/messages - Enviar mensagem
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const chatId = parseInt(req.params.id);
      const user = (req as any).user;
      const { content, message_type = 'text' } = req.body;
      
      if (isNaN(chatId)) {
        res.status(400).json({
          success: false,
          message: 'ID do chat inválido'
        });
        return;
      }
      
      if (!content || content.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Conteúdo da mensagem é obrigatório'
        });
        return;
      }
      
      // Verificar se o usuário tem acesso ao chat
      const chat = await ChatModel.findByIdWithParticipants(chatId);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      const hasAccess = chat.participants.some(
        participant => participant.participant_id === user.id && 
                     participant.participant_type === (user.tipo === 'operadora' ? 'operadora' : 'clinica')
      );
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      // Buscar nome do remetente
      let senderName = user.nome || user.username || 'Usuário';
      
      const messageData: MessageCreateInput = {
        chat_id: chatId,
        sender_id: user.id,
        sender_type: user.tipo === 'operadora' ? 'operadora' : 'clinica',
        sender_name: senderName,
        content: content.trim(),
        message_type: message_type
      };
      
      const message = await MessageModel.create(messageData);
      
      res.status(201).json({
        success: true,
        data: message,
        message: 'Mensagem enviada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // POST /api/chat/chats - Criar novo chat
  static async createChat(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { type, operadora_id, clinica_id, name, description } = req.body;
      
      if (!type || !name) {
        res.status(400).json({
          success: false,
          message: 'Tipo e nome do chat são obrigatórios'
        });
        return;
      }
      
      // Validações baseadas no tipo de usuário
      if (user.tipo === 'operadora') {
        // Operadoras podem criar chats com suas clínicas
        if (type === 'individual' && !clinica_id) {
          res.status(400).json({
            success: false,
            message: 'ID da clínica é obrigatório para chat individual'
          });
          return;
        }
        
        if (type === 'group' && operadora_id !== user.id) {
          res.status(403).json({
            success: false,
            message: 'Operadoras só podem criar grupos para si mesmas'
          });
          return;
        }
      } else if (user.tipo === 'clinica') {
        // Clínicas só podem criar chats com sua operadora
        if (operadora_id !== user.operadora_id) {
          res.status(403).json({
            success: false,
            message: 'Clínicas só podem criar chats com sua operadora'
          });
          return;
        }
        
        if (clinica_id !== user.id) {
          res.status(403).json({
            success: false,
            message: 'Clínicas só podem criar chats para si mesmas'
          });
          return;
        }
      }
      
      const chatData: ChatCreateInput = {
        type,
        operadora_id: operadora_id || (user.tipo === 'operadora' ? user.id : undefined),
        clinica_id: clinica_id || (user.tipo === 'clinica' ? user.id : undefined),
        name,
        description
      };
      
      const chat = await ChatModel.create(chatData);
      
      res.status(201).json({
        success: true,
        data: chat,
        message: 'Chat criado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao criar chat:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // POST /api/chat/chats/find-or-create - Buscar ou criar chat entre operadora e clínica
  static async findOrCreateOperadoraClinicaChat(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { operadora_id, clinica_id } = req.body;
      
      if (!operadora_id || !clinica_id) {
        res.status(400).json({
          success: false,
          message: 'IDs da operadora e clínica são obrigatórios'
        });
        return;
      }
      
      // Verificar se o usuário tem permissão para acessar este chat
      if (user.tipo === 'operadora' && user.id !== operadora_id) {
        res.status(403).json({
          success: false,
          message: 'Você só pode acessar chats da sua operadora'
        });
        return;
      }
      
      if (user.tipo === 'clinica' && (user.id !== clinica_id || user.operadora_id !== operadora_id)) {
        res.status(403).json({
          success: false,
          message: 'Você só pode acessar chats com sua operadora'
        });
        return;
      }
      
      const chat = await ChatModel.findOrCreateOperadoraClinicaChat(operadora_id, clinica_id);
      
      res.json({
        success: true,
        data: chat,
        message: 'Chat encontrado/criado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao buscar/criar chat:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // GET /api/chat/unread-count - Contar mensagens não lidas
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user.id;
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      
      const unreadMessages = await MessageModel.findUnreadMessagesByUser(userId, userType);
      
      const totalUnread = unreadMessages.length;
      
      res.json({
        success: true,
        data: {
          total_unread: totalUnread,
          unread_by_chat: unreadMessages.reduce((acc: any, msg) => {
            const chatId = msg.chat_id;
            if (!acc[chatId]) {
              acc[chatId] = 0;
            }
            acc[chatId]++;
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('❌ Erro ao contar mensagens não lidas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
  
  // PUT /api/chat/chats/:id/read - Marcar chat como lido
  static async markChatAsRead(req: Request, res: Response): Promise<void> {
    try {
      const chatId = parseInt(req.params.id);
      const user = (req as any).user;
      
      if (isNaN(chatId)) {
        res.status(400).json({
          success: false,
          message: 'ID do chat inválido'
        });
        return;
      }
      
      // Verificar se o usuário tem acesso ao chat
      const chat = await ChatModel.findByIdWithParticipants(chatId);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      const hasAccess = chat.participants.some(
        participant => participant.participant_id === user.id && 
                     participant.participant_type === (user.tipo === 'operadora' ? 'operadora' : 'clinica')
      );
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      const success = await MessageModel.markAsRead(chatId, user.id, user.tipo === 'operadora' ? 'operadora' : 'clinica');
      
      res.json({
        success,
        message: success ? 'Chat marcado como lido' : 'Erro ao marcar chat como lido'
      });
    } catch (error) {
      console.error('❌ Erro ao marcar chat como lido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
