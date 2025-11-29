-- Tabela para armazenar códigos OTP de autenticação médica
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

