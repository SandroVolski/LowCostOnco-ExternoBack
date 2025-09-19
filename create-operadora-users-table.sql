-- Script para criar tabela de usuários da operadora
-- Execute este script no seu banco de dados MySQL

CREATE TABLE IF NOT EXISTS OperadoraUsers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    operadora_id INT NOT NULL,
    role ENUM('operadora_admin', 'operadora_user') DEFAULT 'operadora_user',
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    -- Chave estrangeira para a tabela Operadoras
    FOREIGN KEY (operadora_id) REFERENCES Operadoras(id) ON DELETE CASCADE,
    
    -- Índices para melhor performance
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_operadora_id (operadora_id),
    INDEX idx_status (status),
    INDEX idx_role (role)
);

-- Inserir usuário admin de exemplo para a operadora Unimed (ID 1)
-- Senha: admin123 (hash bcrypt)
INSERT INTO OperadoraUsers (nome, email, username, password, operadora_id, role, status) 
VALUES (
    'Admin Unimed', 
    'admin@unimed.com', 
    'admin_unimed', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    1, 
    'operadora_admin', 
    'ativo'
) ON DUPLICATE KEY UPDATE nome = nome;

-- Inserir usuário comum de exemplo para a operadora Amil (ID 2)
-- Senha: user123 (hash bcrypt)
INSERT INTO OperadoraUsers (nome, email, username, password, operadora_id, role, status) 
VALUES (
    'Usuário Amil', 
    'user@amil.com', 
    'user_amil', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    2, 
    'operadora_user', 
    'ativo'
) ON DUPLICATE KEY UPDATE nome = nome;

-- Verificar se as tabelas foram criadas corretamente
SELECT 'OperadoraUsers table created successfully' as message;
SELECT COUNT(*) as total_operadora_users FROM OperadoraUsers;
