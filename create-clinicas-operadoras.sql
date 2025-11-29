CREATE TABLE IF NOT EXISTS clinicas_operadoras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinica_id INT NOT NULL,
  operadora_id INT NOT NULL,
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_clinicas_operadoras_clinica
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_clinicas_operadoras_operadora
    FOREIGN KEY (operadora_id) REFERENCES operadoras(id)
    ON DELETE CASCADE,

  UNIQUE KEY uq_clinica_operadora (clinica_id, operadora_id),
  INDEX idx_clinica (clinica_id),
  INDEX idx_operadora (operadora_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
