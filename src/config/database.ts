import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuração otimizada da conexão com o banco
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_onkhos',
  port: parseInt(process.env.DB_PORT || '3306'),
  
  // Configurações do pool otimizadas para estabilidade
  waitForConnections: true,
  connectionLimit: 20, // Aumentado para suportar mais requisições simultâneas
  queueLimit: 0, // Desabilitar fila para evitar acúmulo
  
  // Configurações de keep-alive para evitar ECONNRESET
  keepAliveInitialDelay: 10000, // 10 segundos
  enableKeepAlive: true,

  // Timeouts para evitar conexões travadas
  acquireTimeout: 30000, // 30 segundos
  timeout: 60000, // 60 segundos para queries mais lentas
  connectTimeout: 10000, // 10 segundos para conectar

  // Configurações de reconexão automática
  reconnect: true,

  // Configurações MySQL para evitar ECONNRESET
  waitTimeout: 28800, // 8 horas (padrão MySQL)
  maxIdle: 10, // Máximo de conexões ociosas
  idleTimeout: 60000, // 60 segundos antes de fechar conexão ociosa
  
  // Configurações de performance
  multipleStatements: false, // Desabilitar múltiplas statements por segurança
  dateStrings: true, // Retornar datas como strings
  timezone: '-03:00', // Timezone de Brasília (UTC-3)
  
  // Configurações de SSL (se necessário)
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

// Configuração específica para o banco de logs
export const logsDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'bd_onkhos_logs', // Banco específico para logs
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10, // Pool menor para logs
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  multipleStatements: false,
  dateStrings: true,
  timezone: '-03:00', // Timezone de Brasília (UTC-3)
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

// Criar pool de conexões otimizado
export const pool = mysql.createPool(dbConfig);

// Criar pool de conexões para logs
export const logsPool = mysql.createPool(logsDbConfig);

// Helpers para retry/ping
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const TRANSIENT_DB_ERROR_CODES = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'ECONNRESET',
  'ECONNREFUSED',
  'ER_CON_COUNT_ERROR',
  'ETIMEDOUT',
  'EPIPE'
]);

const isTransientDbError = (error: any): boolean => {
  const code = (error && (error as any).code) || '';
  const message = (error && (error as any).message) || '';
  return TRANSIENT_DB_ERROR_CODES.has(code) || /ECONNRESET|server has gone away|Connection lost|read ECONNRESET/i.test(message);
};

const pingPool = async (): Promise<void> => {
  // Faz um ping leve para validar conexões do pool
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
};

const withRetry = async <T>(action: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= maxRetries || !isTransientDbError(error)) {
        throw error;
      }
      attempt++;
      console.warn(`⚠️ Erro transitório no banco (tentativa ${attempt}/${maxRetries}). Retentando...`, (error as any)?.code || (error as any)?.message);
      
      // Para ECONNRESET, tentar recriar o pool
      if ((error as any)?.code === 'ECONNRESET' || /ECONNRESET/i.test((error as any)?.message)) {
        console.log('🔄 Tentando recriar pool devido a ECONNRESET...');
        try {
          await pool.end();
          // Recriar pool com configuração limpa
          const newPool = mysql.createPool(dbConfig);
          Object.assign(pool, newPool);
        } catch (poolErr) {
          console.warn('Erro ao recriar pool:', (poolErr as any)?.message);
        }
      }
      
      try {
        await pingPool();
      } catch (pingErr) {
        console.warn('Ping do pool falhou antes do retry:', (pingErr as any)?.code || (pingErr as any)?.message);
      }
      
      // Backoff exponencial otimizado: 200ms, 600ms, 1800ms
      const delay = 200 * Math.pow(3, attempt - 1);
      await sleep(delay);
    }
  }
};

// Função para limpar conexões órfãs
const cleanupOrphanedConnections = async () => {
  try {
    // Ping todas as conexões do pool para identificar órfãs
    const connections = (pool as any)._allConnections || [];
    const activeConnections = (pool as any)._freeConnections || [];
    
    console.log(`🧹 Limpeza de conexões: ${connections.length} total, ${activeConnections.length} ativas`);
    
    // Se há muitas conexões inativas, forçar limpeza
    if (connections.length > 15) {
      console.log('🧹 Forçando limpeza de conexões órfãs...');
      await pool.end();
      // Recriar pool
      Object.assign(pool, mysql.createPool(dbConfig));
    }
  } catch (error) {
    console.warn('Erro na limpeza de conexões:', (error as any)?.message);
  }
};

// Monitoramento do pool
pool.on('connection', (connection: any) => {
  console.log('🔗 Nova conexão criada no pool');
  
  // Configurar timeouts para cada conexão
  if (connection.config) {
    connection.config.queryTimeout = 15000; // 15 segundos para queries
    connection.config.connectTimeout = 5000; // 5 segundos para conectar
  }
});

pool.on('acquire', (connection: any) => {
  console.log('📥 Conexão adquirida do pool');
});

pool.on('release', (connection: any) => {
  console.log('📤 Conexão liberada para o pool');
});

pool.on('enqueue', () => {
  console.log('⏳ Requisição enfileirada (pool cheio)');
});

// Limpeza periódica de conexões órfãs a cada 5 minutos
setInterval(cleanupOrphanedConnections, 5 * 60 * 1000);

// Heartbeat para manter conexões vivas (prevenir ECONNRESET)
const heartbeat = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1 as heartbeat');
    connection.release();
    console.log('💓 Heartbeat do pool MySQL OK');
  } catch (error) {
    console.warn('💔 Heartbeat do pool falhou:', (error as any)?.message);
    // Tentar recriar o pool
    try {
      await pool.end();
      Object.assign(pool, mysql.createPool(dbConfig));
      console.log('🔄 Pool recriado após falha no heartbeat');
    } catch (recreateError) {
      console.error('❌ Erro ao recriar pool:', (recreateError as any)?.message);
    }
  }
};

// Executar heartbeat a cada 30 segundos
setInterval(heartbeat, 30 * 1000);

// Função para testar a conexão com timeout
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao conectar')), 10000)
      )
    ]);
    
    console.log('✅ Conectado ao banco de dados MySQL');
    // Ping rápido para validar ciclo completo
    try {
      await (connection as any).query('SELECT 1');
    } catch (e) {
      console.warn('⚠️ Ping falhou no testConnection:', (e as any)?.message || e);
    }
    (connection as any).release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    return false;
  }
};

// Função otimizada para executar queries com timeout + retry
export const query = async (sql: string, params?: any[]): Promise<any> => {
  return withRetry(async () => {
    try {
      const [results] = await Promise.race([
        pool.execute(sql, params || []),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na query')), 15000) // Reduzido para 15s
        )
      ]);
      return results;
    } catch (error) {
      console.error('Erro na query:', error);
      throw error;
    }
  });
};

// Função especial para queries com LIMIT (sem prepared statement) + retry
export const queryWithLimit = async (sql: string, params: any[] = [], limit: number, offset: number): Promise<any> => {
  return withRetry(async () => {
    try {
      // Validar limit e offset
      const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
      const safeOffset = Math.max(0, Math.floor(Number(offset)));
      
      // Construir a query final substituindo LIMIT e OFFSET
      const finalSql = sql + ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;
      
      console.log('Executando query com limit:', finalSql);
      console.log('Parâmetros:', params);
      
      const [results] = await Promise.race([
        params.length > 0 
          ? pool.execute(finalSql, params)
          : pool.query(finalSql),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na query com limit')), 15000) // Reduzido para 15s
        )
      ]);
      
      return results;
    } catch (error) {
      console.error('Erro na query com limit:', error);
      throw error;
    }
  });
};

// Função para obter estatísticas do pool
export const getPoolStats = () => {
  return {
    connectionLimit: (pool as any).config.connectionLimit,
    queueLimit: (pool as any).config.queueLimit,
    // Adicionar mais estatísticas se disponíveis
  };
};

// Função para fechar o pool graciosamente
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ Pool de conexões fechado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao fechar pool:', error);
  }
};

export default pool;