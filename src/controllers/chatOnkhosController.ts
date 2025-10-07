// src/controllers/chatOnkhosController.ts - Controller Simplificado para BD_ONKHOS

import { Request, Response } from 'express';
import { ChatOnkhosModel } from '../models/ChatOnkhos';
import path from 'path';

export class ChatOnkhosController {
  
  // GET /api/chat/chats - Buscar chats do usuário
  static async getUserChats(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user.id;
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      
      console.log('🔧 Buscando chats para usuário:', { userId, userType });
      
      let chats;
      
      if (userType === 'operadora') {
        // Para operadoras, buscar clínicas credenciadas com conversas
        chats = await ChatOnkhosModel.getClinicasCredenciadas(userId);
      } else {
        chats = await ChatOnkhosModel.getConversasClinica(userId);
      }
      
      console.log('🔧 Chats encontrados:', chats);
      
      res.json({
        success: true,
        data: chats
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
      
      const chat = await ChatOnkhosModel.getConversaById(chatId);
      
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      // Verificar se o usuário tem acesso ao chat
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      const hasAccess = (userType === 'operadora' && chat.operadora_id === user.id) ||
                       (userType === 'clinica' && chat.clinica_id === user.id);
      
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
      const chat = await ChatOnkhosModel.getConversaById(chatId);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      const hasAccess = (userType === 'operadora' && chat.operadora_id === user.id) ||
                       (userType === 'clinica' && chat.clinica_id === user.id);
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      const messages = await ChatOnkhosModel.getMensagensConversa(chatId, limit, offset);
      
      console.log('🔧 [CONTROLLER] Mensagens retornadas:', messages.length);
      if (messages.length > 0) {
        console.log('📨 [CONTROLLER] Primeira mensagem:', JSON.stringify(messages[0], null, 2));
      }
      
      // Marcar chat como lido
      await ChatOnkhosModel.marcarComoLida(chatId, user.id, userType);
      
      const response = {
        success: true,
        data: {
          messages,
          pagination: {
            limit,
            offset,
            total: messages.length
          }
        }
      };
      
      console.log('🔧 [CONTROLLER] Resposta final:', JSON.stringify(response, null, 2));
      
      res.json(response);
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
      const { content, message_type = 'texto' } = req.body;
      
      console.log('🔧 Enviando mensagem:', { chatId, user: user.id, content: content?.substring(0, 50) });
      
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
      const chat = await ChatOnkhosModel.getConversaById(chatId);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      const hasAccess = (userType === 'operadora' && chat.operadora_id === user.id) ||
                       (userType === 'clinica' && chat.clinica_id === user.id);
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      // Buscar nome do remetente
      let senderName = user.nome || user.username || 'Usuário';
      
      // Normalizar tipo de mensagem
      let normalizedMessageType = message_type;
      if (message_type === 'text') {
        normalizedMessageType = 'texto';
      }
      
      const messageData = {
        conversa_id: chatId,
        remetente_id: user.id,
        remetente_tipo: userType as 'operadora' | 'clinica',
        remetente_nome: senderName,
        conteudo: content.trim(),
        tipo_mensagem: normalizedMessageType as 'texto' | 'imagem' | 'arquivo'
      };
      
      console.log('🔧 Dados da mensagem:', messageData);
      console.log('🔧 Chamando ChatOnkhosModel.criarMensagem...');
      
      const message = await ChatOnkhosModel.criarMensagem(messageData);
      console.log('🔧 Mensagem criada:', message);
      
      // Atualizar última mensagem da conversa
      if (message.id) {
        await ChatOnkhosModel.atualizarUltimaMensagem(chatId, message.id, content.trim());
      }
      
      console.log('✅ Mensagem enviada com sucesso:', message.id);
      
      res.status(201).json({
        success: true,
        data: message,
        message: 'Mensagem enviada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
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
      
      const chat = await ChatOnkhosModel.findOrCreateConversa(operadora_id, clinica_id);
      
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
      
      const totalUnread = await ChatOnkhosModel.countMensagensNaoLidas(userId, userType);
      
      res.json({
        success: true,
        data: {
          total_unread: totalUnread,
          unread_by_chat: {} // Simplificado - pode ser expandido se necessário
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
      const chat = await ChatOnkhosModel.getConversaById(chatId);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      const hasAccess = (userType === 'operadora' && chat.operadora_id === user.id) ||
                       (userType === 'clinica' && chat.clinica_id === user.id);
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      const success = await ChatOnkhosModel.marcarComoLida(chatId, user.id, userType);
      
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
  
  // POST /api/chat/chats - Criar novo chat (para compatibilidade)
  static async createChat(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { type, operadora_id, clinica_id, name, description } = req.body;
      
      // Para o sistema simplificado, sempre criar conversa individual
      if (!operadora_id || !clinica_id) {
        res.status(400).json({
          success: false,
          message: 'IDs da operadora e clínica são obrigatórios'
        });
        return;
      }
      
      // Verificar permissões
      if (user.tipo === 'operadora' && user.id !== operadora_id) {
        res.status(403).json({
          success: false,
          message: 'Operadoras só podem criar chats para si mesmas'
        });
        return;
      }
      
      if (user.tipo === 'clinica' && (user.id !== clinica_id || user.operadora_id !== operadora_id)) {
        res.status(403).json({
          success: false,
          message: 'Clínicas só podem criar chats com sua operadora'
        });
        return;
      }
      
      const chat = await ChatOnkhosModel.findOrCreateConversa(operadora_id, clinica_id);
      
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

  // POST /api/chat/chats/find-or-create - Encontrar ou criar conversa
  static async findOrCreateChat(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { targetUserId, targetUserType } = req.body;
      
      console.log('🔧 Procurando/criando conversa:', { 
        userId: user.id, 
        userType: user.tipo,
        targetUserId, 
        targetUserType 
      });
      
      if (!targetUserId || !targetUserType) {
        res.status(400).json({
          success: false,
          message: 'ID do usuário e tipo são obrigatórios'
        });
        return;
      }
      
      let operadoraId: number;
      let clinicaId: number;
      
      // Determinar quem é operadora e quem é clínica
      if (user.tipo === 'operadora') {
        operadoraId = user.id;
        clinicaId = targetUserId;
      } else if (user.tipo === 'clinica') {
        operadoraId = targetUserId;
        clinicaId = user.id;
      } else {
        res.status(400).json({
          success: false,
          message: 'Tipo de usuário inválido'
        });
        return;
      }
      
      const conversa = await ChatOnkhosModel.findOrCreateOperadoraClinicaChat(operadoraId, clinicaId);
      
      res.status(200).json({
        success: true,
        data: conversa,
        message: 'Conversa encontrada/criada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao encontrar/criar conversa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // POST /api/chat/chats/:id/upload - Upload de arquivo
  static async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      const chatId = parseInt(req.params.id);
      const user = (req as any).user;
      const file = req.file;
      
      console.log('🔧 Upload de arquivo:', { chatId, user: user.id, file: file?.originalname });
      
      if (isNaN(chatId)) {
        res.status(400).json({
          success: false,
          message: 'ID do chat inválido'
        });
        return;
      }
      
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
        return;
      }
      
      // Verificar se o usuário tem acesso ao chat
      const chat = await ChatOnkhosModel.getConversaById(chatId);
      if (!chat) {
        res.status(404).json({
          success: false,
          message: 'Chat não encontrado'
        });
        return;
      }
      
      const userType = user.tipo === 'operadora' ? 'operadora' : 'clinica';
      const hasAccess = (userType === 'operadora' && chat.operadora_id === user.id) ||
                       (userType === 'clinica' && chat.clinica_id === user.id);
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado ao chat'
        });
        return;
      }
      
      // Buscar nome do remetente
      let senderName = user.nome || user.username || 'Usuário';
      
      // Determinar tipo de mensagem baseado no tipo do arquivo
      let messageType: 'imagem' | 'arquivo' = 'arquivo';
      if (file.mimetype.startsWith('image/')) {
        messageType = 'imagem';
      }
      
      // Criar URL do arquivo (relativa para funcionar com proxy do Vite)
      const fileUrl = `/uploads/chat/${file.filename}`;
      
      // Criar conteúdo da mensagem com informações do arquivo
      const content = `${file.originalname}|${fileUrl}|${file.mimetype}|${file.size}`;
      
      const messageData = {
        conversa_id: chatId,
        remetente_id: user.id,
        remetente_tipo: userType as 'operadora' | 'clinica',
        remetente_nome: senderName,
        conteudo: content,
        tipo_mensagem: messageType
      };
      
      console.log('🔧 Dados da mensagem com arquivo:', messageData);
      console.log('🔧 Chamando ChatOnkhosModel.criarMensagem...');
      
      const message = await ChatOnkhosModel.criarMensagem(messageData);
      console.log('🔧 Mensagem com arquivo criada:', message);
      
      // Atualizar última mensagem da conversa
      if (message.id) {
        await ChatOnkhosModel.atualizarUltimaMensagem(chatId, message.id, `📎 ${file.originalname}`);
      }
      
      console.log('✅ Arquivo enviado com sucesso:', message.id);
      
      res.status(201).json({
        success: true,
        data: {
          ...message,
          fileInfo: {
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            url: fileUrl
          }
        },
        message: 'Arquivo enviado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao fazer upload do arquivo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
