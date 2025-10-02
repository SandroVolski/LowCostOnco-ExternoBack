import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, closePool } from './config/database';
import pacienteRoutes from './routes/pacienteRoutes';
import solicitacaoRoutes from './routes/solicitacaoRoutes';
import clinicaRoutes from './routes/clinicaRoutes';
import protocoloRoutes from './routes/protocoloRoutes';
import notificacaoRoutes from './routes/notificacaoRoutes';
import authRoutes from './routes/authRoutes';
import { optionalAuth, authenticateToken } from './middleware/auth';
import { cacheMiddleware, cacheHeaders, getCacheStats } from './middleware/cache';
import { rateLimit, getRateLimitStats } from './middleware/rateLimit';
import { performanceMonitor, getPerformanceStats, diagnosePerformanceIssues } from './utils/performance';
import { enhancedPerformanceMonitor } from './utils/performance-enhanced';
import { loggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import performanceRoutes from './routes/performanceRoutes';
import catalogRoutes from './routes/catalogRoutes';
import documentoRoutes from './routes/documentoRoutes';
import ajusteRoutes from './routes/ajusteRoutes';
import operadoraRoutes from './routes/operadoraRoutes';
import operadoraAuthRoutes from './routes/operadoraAuthRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import logRoutes from './routes/logRoutes';
import mobileRoutes from './routes/mobileRoutes';
import analysisRoutes from './routes/analysisRoutes';
import adminRoutes from './routes/adminRoutes';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080', 'http://localhost:5050'];

const corsConfig = {
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] as string[],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret', 'x-admin-secret'] as string[],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsConfig));
// Responder preflight globalmente antes de qualquer auth
app.options('*', cors(corsConfig));

// ✅ MIDDLEWARE ESPECÍFICO PARA RESOLVER CSP EM PDFs
app.use('/api/solicitacoes/:id/pdf', (req, res, next) => {
  // Remover headers CSP que podem interferir com visualização
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Content-Type-Options');
  
  // Adicionar headers específicos para PDF
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  console.log('🔧 Headers CSP removidos para visualização de PDF');
  next();
});

// Aumentar limite para uploads de arquivos maiores (PDFs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de monitoramento de performance (avançado)
app.use(enhancedPerformanceMonitor);

// Middleware de logging automático
app.use(loggingMiddleware);

// Middleware de rate limiting global
app.use(rateLimit());

// Middleware de cache headers
app.use(cacheHeaders);

// Middleware de log para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Servir uploads estaticamente
app.use('/uploads', express.static('uploads'));

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota de health check para compatibilidade com frontend
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota para estatísticas do sistema
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    cache: getCacheStats(),
    rateLimit: getRateLimitStats(),
    performance: getPerformanceStats(),
    timestamp: new Date().toISOString()
  });
});

// Rota para diagnóstico de performance
app.get('/api/performance/diagnose', (req, res) => {
  const diagnosis = diagnosePerformanceIssues();
  res.json({
    success: true,
    diagnosis,
    timestamp: new Date().toISOString()
  });
});

// Rotas da API com cache para GET requests
// Garanta que preflight de /api/mobile não passe pelo auth
app.use('/api/mobile', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}, authenticateToken, cacheMiddleware(), mobileRoutes);

app.use('/api/pacientes', authenticateToken, cacheMiddleware(), pacienteRoutes);
app.use('/api/solicitacoes', authenticateToken, cacheMiddleware(), solicitacaoRoutes);
// Documentos deve vir antes de /api/clinicas para evitar colisão
app.use('/api/clinicas/documentos', authenticateToken, cacheMiddleware(), documentoRoutes);
// Rotas de clinicas têm proteção por rota (login/register públicas; profile e demais autenticadas)
app.use('/api/clinicas', cacheMiddleware(), clinicaRoutes);
app.use('/api/protocolos', authenticateToken, cacheMiddleware(), protocoloRoutes);
app.use('/api/notificacoes', authenticateToken, cacheMiddleware(), notificacaoRoutes);
app.use('/api/auth', cacheMiddleware(), authRoutes);
app.use('/api/catalog', optionalAuth, cacheMiddleware(), catalogRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/ajustes', authenticateToken, ajusteRoutes);
app.use('/api/operadoras', cacheMiddleware(), operadoraRoutes);
app.use('/api/operadora-auth', cacheMiddleware(), operadoraAuthRoutes);
app.use('/api/dashboard', authenticateToken, cacheMiddleware(), dashboardRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/analysis', authenticateToken, cacheMiddleware(), analysisRoutes);
app.use('/api/admin', authenticateToken, cacheMiddleware(), adminRoutes);

// 🆕 Compatibilidade com frontend: lista de especialidades (placeholder)
app.get('/api/especialidades', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'OK', data: [] });
});

// Rota de teste para verificar conexão com banco
app.get('/api/test-db', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
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

// Alias raiz para teste de DB
app.get('/test-db', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({ success: isConnected });
  } catch (error) {
    res.status(500).json({ success: false });
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
      clinicas: '/api/clinicas',
      protocolos: '/api/protocolos',
      health: '/health',
      stats: '/api/stats',
      performance: '/api/performance/diagnose',
      testDb: '/api/test-db'
    },
    timestamp: new Date().toISOString()
  });
});

// Middleware de tratamento de erros
app.use(errorLoggingMiddleware);
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
      console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
      console.log(`🔍 Performance: http://localhost:${PORT}/api/performance/diagnose`);
      console.log(`🔧 Test DB: http://localhost:${PORT}/api/test-db`);
      console.log(`👤 Pacientes API: http://localhost:${PORT}/api/pacientes`);
      console.log(`📋 Solicitações API: http://localhost:${PORT}/api/solicitacoes`);
      console.log(`🗄️  Database: ${isDbConnected ? '✅ Conectado' : '❌ Desconectado'}`);
      console.log('\n📚 Endpoints disponíveis:');
      console.log('   GET    /health');
      console.log('   GET    /api');
      console.log('   GET    /api/stats');
      console.log('   GET    /api/performance/diagnose');
      console.log('   GET    /api/test-db');
      console.log('   GET    /test-db');
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
      console.log('   GET    /api/protocolos');
      console.log('   POST   /api/protocolos');
      console.log('   GET    /api/protocolos/:id');
      console.log('   PUT    /api/protocolos/:id');
      console.log('   DELETE /api/protocolos/:id');
      console.log('   GET    /api/notificacoes');
      console.log('   GET    /api/mobile/pacientes/medico/:medicoId');
      console.log('   POST   /api/notificacoes/:id/lida');
      console.log('   POST   /api/notificacoes/lidas');
      console.log('   POST   /api/notificacoes');
      console.log('   POST   /api/auth/forgot-password');
      console.log('   GET    /api/catalog/principios-ativos');
      console.log('   GET    /api/catalog/cid10');
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
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT. Encerrando servidor graciosamente...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM. Encerrando servidor graciosamente...');
  await closePool();
  process.exit(0);
});

// Iniciar o servidor
startServer();