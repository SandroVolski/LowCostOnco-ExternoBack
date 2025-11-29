-- Tabela para armazenar tokens de recuperação de senha
-- Nota: A foreign key será adicionada após verificar se a tabela Usuarios existe
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_email (email),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign key apenas se a tabela Usuarios existir
-- Execute manualmente se necessário:
-- ALTER TABLE password_reset_tokens 
-- ADD CONSTRAINT fk_password_reset_tokens_user 
-- FOREIGN KEY (user_id) REFERENCES Usuarios(id) ON DELETE CASCADE;

