import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import pacienteRoutes from './routes/pacienteRoutes';
import solicitacaoRoutes from './routes/solicitacaoRoutes';
import { optionalAuth } from './middleware/auth';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'], // URLs do frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Aumentar limite para uploads de arquivos maiores (PDFs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de log para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rotas da API
app.use('/api/pacientes', optionalAuth, pacienteRoutes);
app.use('/api/solicitacoes', optionalAuth, solicitacaoRoutes); // ✅ NOVA ROTA ADICIONADA

// Rota de teste para verificar conexão com banco
app.get('/api/test-db', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({
      success: isConnected,
      message: isConnected ? 'Conexão com banco OK' : 'Falha na conexão com banco'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao testar conexão',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota adicional para informações da API
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API do Sistema de Clínicas Oncológicas',
    version: '1.0.0',
    endpoints: {
      pacientes: '/api/pacientes',
      solicitacoes: '/api/solicitacoes',
      health: '/health',
      testDb: '/api/test-db'
    },
    timestamp: new Date().toISOString()
  });
});

// Middleware de tratamento de erros
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
  });
});

// Rota 404 - não encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Testar conexão com banco antes de iniciar
    const isDbConnected = await testConnection();
    
    if (!isDbConnected) {
      console.error('❌ Não foi possível conectar ao banco de dados');
      console.log('⚠️  Continuando sem banco (modo desenvolvimento)...');
    }
    
    app.listen(PORT, () => {
      console.log('\n🚀 Servidor iniciado com sucesso!');
      console.log(`📡 API disponível em: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Test DB: http://localhost:${PORT}/api/test-db`);
      console.log(`👤 Pacientes API: http://localhost:${PORT}/api/pacientes`);
      console.log(`📋 Solicitações API: http://localhost:${PORT}/api/solicitacoes`);
      console.log(`🗄️  Database: ${isDbConnected ? '✅ Conectado' : '❌ Desconectado'}`);
      console.log('\n📚 Endpoints disponíveis:');
      console.log('   GET    /health');
      console.log('   GET    /api');
      console.log('   GET    /api/test-db');
      console.log('   GET    /api/pacientes');
      console.log('   POST   /api/pacientes');
      console.log('   GET    /api/pacientes/:id');
      console.log('   PUT    /api/pacientes/:id');
      console.log('   DELETE /api/pacientes/:id');
      console.log('   GET    /api/solicitacoes');
      console.log('   POST   /api/solicitacoes');
      console.log('   GET    /api/solicitacoes/:id');
      console.log('   GET    /api/solicitacoes/:id/pdf');
      console.log('   PUT    /api/solicitacoes/:id/status');
      console.log('   DELETE /api/solicitacoes/:id');
      console.log('\n🎯 Pronto para receber requisições!\n');
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Recebido SIGINT. Encerrando servidor graciosamente...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido SIGTERM. Encerrando servidor graciosamente...');
  process.exit(0);
});

// Iniciar o servidor
startServer();