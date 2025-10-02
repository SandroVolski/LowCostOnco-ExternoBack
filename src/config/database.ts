import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuração otimizada da conexão com o banco
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_sistema_clinicas',
  port: parseInt(process.env.DB_PORT || '3306'),
  
  // Configurações do pool otimizadas
  waitForConnections: true,
  connectionLimit: 20, // Aumentado de 10 para 20
  queueLimit: 10, // Adicionado limite de fila
  acquireTimeout: 60000, // 60 segundos para adquirir conexão
  timeout: 60000, // 60 segundos timeout geral
  reconnect: true, // Reconectar automaticamente
  
  // Configurações de performance
  multipleStatements: false, // Desabilitar múltiplas statements por segurança
  dateStrings: true, // Retornar datas como strings
  timezone: 'local', // Usar timezone local
  
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
  connectionLimit: 5, // Pool menor para logs
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  multipleStatements: false,
  dateStrings: true,
  timezone: 'local',
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

const withRetry = async <T>(action: () => Promise<T>, maxRetries: number = 2): Promise<T> => {
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
      try {
        await pingPool();
      } catch (pingErr) {
        console.warn('Ping do pool falhou antes do retry:', (pingErr as any)?.code || (pingErr as any)?.message);
      }
      // Backoff exponencial curto: 100ms, 300ms, 900ms...
      await sleep(100 * Math.pow(3, attempt - 1));
    }
  }
};

// Monitoramento do pool
pool.on('connection', (connection: any) => {
  console.log('🔗 Nova conexão criada no pool');
  
  // Configurar timeouts para cada conexão
  if (connection.config) {
    connection.config.queryTimeout = 30000; // 30 segundos para queries
    connection.config.connectTimeout = 10000; // 10 segundos para conectar
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
          setTimeout(() => reject(new Error('Timeout na query')), 30000)
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
          setTimeout(() => reject(new Error('Timeout na query com limit')), 30000)
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