// Script para inicializar a tabela de autenticação médica OTP
import { query } from '../config/database';

export async function initMedicoAuthTable(): Promise<void> {
  try {
    // Verificar se a tabela já existe
    const [tables] = await query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'medico_auth_otp'`
    );

    if (Array.isArray(tables) && tables.length > 0) {
      console.log('✅ Tabela medico_auth_otp já existe');
      return;
    }

    // Criar tabela se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS medico_auth_otp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        medico_crm VARCHAR(50) NOT NULL,
        medico_email VARCHAR(255) NOT NULL,
        solicitacao_id INT DEFAULT NULL,
        codigo_otp VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_medico_crm (medico_crm),
        INDEX idx_codigo_otp (codigo_otp),
        INDEX idx_expires_at (expires_at),
        INDEX idx_solicitacao_id (solicitacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tabela medico_auth_otp criada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar tabela medico_auth_otp:', error);
    // Não lançar erro para não impedir o servidor de iniciar
  }
}

