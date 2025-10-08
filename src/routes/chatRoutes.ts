// src/routes/chatRoutes.ts

import { Router } from 'express';
import { ChatOnkhosController } from '../controllers/chatOnkhosController';
import { authenticateToken, requireRole } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configurar multer para upload de arquivos do chat
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/chat');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, extension);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Permitir todos os tipos de arquivo
    cb(null, true);
  }
});

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Aplicar autorização para operadoras e clínicas
router.use(requireRole(['operadora', 'clinica', 'operator', 'clinic', 'operadora_admin', 'operadora_user']));

// GET /api/chat/chats - Buscar chats do usuário
router.get('/chats', ChatOnkhosController.getUserChats);

// GET /api/chat/chats/:id - Buscar chat específico
router.get('/chats/:id', ChatOnkhosController.getChat);

// GET /api/chat/chats/:id/messages - Buscar mensagens de um chat
router.get('/chats/:id/messages', ChatOnkhosController.getChatMessages);

// POST /api/chat/chats/:id/messages - Enviar mensagem
router.post('/chats/:id/messages', ChatOnkhosController.sendMessage);

// POST /api/chat/chats/:id/upload - Upload de arquivo
router.post('/chats/:id/upload', upload.single('file'), ChatOnkhosController.uploadFile);

// POST /api/chat/chats - Criar novo chat
router.post('/chats', ChatOnkhosController.createChat);

// POST /api/chat/chats/find-or-create - Buscar ou criar chat entre operadora e clínica
router.post('/chats/find-or-create', ChatOnkhosController.findOrCreateChat);

// GET /api/chat/unread-count - Contar mensagens não lidas
router.get('/unread-count', ChatOnkhosController.getUnreadCount);

// PUT /api/chat/chats/:id/read - Marcar chat como lido
router.put('/chats/:id/read', ChatOnkhosController.markChatAsRead);

export default router;
