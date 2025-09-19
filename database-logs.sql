-- Tabela de logs do sistema
-- Execute este script no seu banco de dados MySQL

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level ENUM('error', 'warn', 'info', 'debug') NOT NULL DEFAULT 'info',
  category ENUM('system', 'database', 'api', 'auth', 'user', 'performance', 'security') NOT NULL DEFAULT 'system',
  message VARCHAR(500) NOT NULL,
  details TEXT,
  user_id INT NULL,
  user_agent VARCHAR(500),
  ip_address VARCHAR(45),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  response_time INT, -- em milissegundos
  stack_trace TEXT,
  metadata JSON, -- para dados adicionais flexíveis
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level),
  INDEX idx_category (category),
  INDEX idx_user_id (user_id),
  INDEX idx_endpoint (endpoint),
  INDEX idx_status_code (status_code),
  INDEX idx_created_at (created_at),
  
  -- Foreign key para usuários (opcional)
  FOREIGN KEY (user_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela para logs de performance específicos
CREATE TABLE IF NOT EXISTS performance_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  operation VARCHAR(100) NOT NULL, -- 'query', 'api_call', 'file_upload', etc.
  duration_ms INT NOT NULL, -- duração em milissegundos
  resource VARCHAR(255), -- tabela, endpoint, arquivo
  user_id INT NULL,
  details JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_timestamp (timestamp),
  INDEX idx_operation (operation),
  INDEX idx_duration (duration_ms),
  INDEX idx_user_id (user_id),
  
  FOREIGN KEY (user_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela para logs de auditoria de segurança
CREATE TABLE IF NOT EXISTS security_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_type ENUM('login', 'logout', 'failed_login', 'password_change', 'permission_change', 'data_access', 'data_modification') NOT NULL,
  user_id INT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  details TEXT,
  risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_timestamp (timestamp),
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id),
  INDEX idx_risk_level (risk_level),
  
  FOREIGN KEY (user_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Inserir alguns logs de exemplo para teste
INSERT INTO system_logs (level, category, message, details, endpoint, method, status_code, response_time) VALUES
('info', 'system', 'Sistema iniciado com sucesso', 'Servidor Node.js iniciado na porta 3000', '/api/health', 'GET', 200, 15),
('info', 'database', 'Conexão com banco estabelecida', 'Pool de conexões MySQL configurado com 20 conexões', '/api/health', 'GET', 200, 25),
('info', 'api', 'API de autenticação acessada', 'Endpoint de login acessado', '/api/auth/login', 'POST', 200, 150),
('warn', 'performance', 'Consulta lenta detectada', 'Query demorou mais de 1000ms', '/api/pacientes', 'GET', 200, 1200),
('error', 'database', 'Falha na conexão com banco', 'Timeout na conexão MySQL', '/api/protocolos', 'GET', 500, 5000);

-- Inserir logs de performance de exemplo
INSERT INTO performance_logs (operation, duration_ms, resource, details) VALUES
('database_query', 45, 'pacientes', '{"table": "pacientes", "rows_returned": 150, "query_type": "SELECT"}'),
('api_call', 120, '/api/pacientes', '{"endpoint": "/api/pacientes", "method": "GET", "status": 200}'),
('file_upload', 2500, 'documentos', '{"file_size": "2.5MB", "file_type": "application/pdf"}');

-- Inserir logs de segurança de exemplo
INSERT INTO security_logs (event_type, user_id, ip_address, details, risk_level) VALUES
('login', 1, '192.168.1.100', 'Login bem-sucedido para usuário admin', 'low'),
('failed_login', NULL, '192.168.1.101', 'Tentativa de login com credenciais inválidas', 'medium'),
('data_access', 1, '192.168.1.100', 'Acesso aos dados de pacientes', 'low');
