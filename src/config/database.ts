import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuração da conexão com o banco
export const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Criar pool de conexões
export const pool = mysql.createPool(dbConfig);

// Função para testar a conexão
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao banco de dados MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    return false;
  }
};

// Função para executar queries
export const query = async (sql: string, params?: any[]): Promise<any> => {
  try {
    const [results] = await pool.execute(sql, params || []);
    return results;
  } catch (error) {
    console.error('Erro na query:', error);
    throw error;
  }
};

// Função especial para queries com LIMIT (sem prepared statement)
export const queryWithLimit = async (sql: string, params: any[] = [], limit: number, offset: number): Promise<any> => {
  try {
    // Validar limit e offset
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));
    
    // Construir a query final substituindo LIMIT e OFFSET
    const finalSql = sql + ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    
    console.log('Executando query com limit:', finalSql);
    console.log('Parâmetros:', params);
    
    const [results] = params.length > 0 
      ? await pool.execute(finalSql, params)
      : await pool.query(finalSql);
    
    return results;
  } catch (error) {
    console.error('Erro na query com limit:', error);
    throw error;
  }
};

export default pool;