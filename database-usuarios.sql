-- Tabela de usuários do sistema
-- Execute em seu MySQL antes de habilitar o login/registro

CREATE TABLE IF NOT EXISTS Usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinica_id INT NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  username VARCHAR(100) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'clinica', 'operadora') NOT NULL DEFAULT 'clinica',
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT uq_usuarios_username UNIQUE (username),
  CONSTRAINT fk_usuarios_clinica FOREIGN KEY (clinica_id) REFERENCES Clinicas(id) ON DELETE SET NULL
);

-- Índices auxiliares
-- Alguns MySQL não suportam IF NOT EXISTS em CREATE INDEX
-- Crie manualmente se necessário: verifique com SHOW INDEX FROM Usuarios;
CREATE INDEX idx_usuarios_clinica ON Usuarios (clinica_id);
CREATE INDEX idx_usuarios_role ON Usuarios (role);

-- Usuário admin opcional (com senha gerada externamente). Para usar, comente e preencha manualmente.
-- INSERT INTO Usuarios (nome, email, username, password_hash, role, status)
-- VALUES ('Administrador', 'admin@exemplo.com', 'admin', '$2a$10$HASH_BCRYPT_AQUI', 'admin', 'ativo');
