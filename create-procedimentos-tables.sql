-- Script para criar tabelas de Procedimentos
-- Sistema de Gestão de Clínicas Oncológicas
-- Data: 2025-10-13

-- Tabela de Procedimentos da Clínica
CREATE TABLE IF NOT EXISTS procedimentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  categoria ENUM('honorarios', 'taxas_diarias', 'materiais_medicamentos') NOT NULL,
  unidade_pagamento VARCHAR(50) NOT NULL COMMENT 'Ex: por sessão, por dia, por unidade, etc',
  fracionamento BOOLEAN DEFAULT FALSE COMMENT 'Se permite fracionamento de pagamento',
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
  INDEX idx_clinica_codigo (clinica_id, codigo),
  INDEX idx_clinica_categoria (clinica_id, categoria),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Vinculação de Procedimentos com Operadoras (Negociação)
CREATE TABLE IF NOT EXISTS procedimentos_operadora (
  id INT PRIMARY KEY AUTO_INCREMENT,
  procedimento_id INT NOT NULL,
  operadora_id INT NOT NULL,
  clinica_id INT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL COMMENT 'Valor negociado com a operadora',
  credenciado BOOLEAN DEFAULT FALSE COMMENT 'Se está credenciado para essa operadora',
  data_inicio DATE NOT NULL COMMENT 'Início da vigência da negociação',
  data_fim DATE COMMENT 'Fim da vigência da negociação (NULL = sem prazo)',
  status ENUM('ativo', 'inativo', 'vencido') DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (operadora_id) REFERENCES operadoras(id) ON DELETE CASCADE,
  FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
  
  -- Garantir que não haja duplicação de procedimento + operadora na mesma vigência
  UNIQUE KEY unique_procedimento_operadora (procedimento_id, operadora_id, data_inicio),
  
  INDEX idx_procedimento (procedimento_id),
  INDEX idx_operadora (operadora_id),
  INDEX idx_clinica (clinica_id),
  INDEX idx_vigencia (data_inicio, data_fim),
  INDEX idx_status (status),
  INDEX idx_credenciado (credenciado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir alguns dados de exemplo (opcional)
-- INSERT INTO procedimentos (clinica_id, codigo, descricao, categoria, unidade_pagamento, fracionamento)
-- VALUES 
--   (1, 'CONS001', 'Consulta Oncológica Inicial', 'honorarios', 'por consulta', FALSE),
--   (1, 'QUIM001', 'Sessão de Quimioterapia', 'honorarios', 'por sessão', FALSE),
--   (1, 'LEITO001', 'Diária de Leito', 'taxas_diarias', 'por dia', TRUE),
--   (1, 'MED001', 'Medicamento Oncológico Genérico', 'materiais_medicamentos', 'por unidade', TRUE);

-- Comentários adicionais
COMMENT ON TABLE procedimentos IS 'Armazena os procedimentos que cada clínica realiza';
COMMENT ON TABLE procedimentos_operadora IS 'Armazena as negociações de valores entre clínicas e operadoras para cada procedimento, com período de vigência';

