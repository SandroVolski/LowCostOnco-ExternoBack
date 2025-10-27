-- Script para criar as tabelas de Protocolos e Medicamentos
-- Execute este script no seu banco de dados MySQL

-- Tabela de Protocolos
CREATE TABLE IF NOT EXISTS Protocolos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinica_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cid VARCHAR(50),
  intervalo_ciclos INT,
  ciclos_previstos INT,
  linha INT,
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (clinica_id) REFERENCES Clinicas(id) ON DELETE CASCADE,
  INDEX idx_clinica_id (clinica_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Tabela de Medicamentos dos Protocolos
CREATE TABLE IF NOT EXISTS Medicamentos_Protocolo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  protocolo_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  dose VARCHAR(100),
  unidade_medida VARCHAR(50),
  via_adm VARCHAR(50),
  dias_adm VARCHAR(255),
  frequencia VARCHAR(50),
  observacoes TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (protocolo_id) REFERENCES Protocolos(id) ON DELETE CASCADE,
  INDEX idx_protocolo_id (protocolo_id),
  INDEX idx_ordem (ordem)
);

-- Inserir alguns protocolos de exemplo
INSERT INTO Protocolos (clinica_id, nome, descricao, cid, intervalo_ciclos, ciclos_previstos, linha) VALUES
(1, 'Protocolo AC-T', 'Protocolo padrão para câncer de mama - Doxorrubicina + Ciclofosfamida seguido de Paclitaxel', 'C50', 21, 6, 1),
(1, 'Protocolo FOLFOX', 'Protocolo para câncer colorretal - Oxaliplatina + Leucovorina + 5-FU', 'C18', 14, 12, 1),
(1, 'Protocolo Carboplatina + Paclitaxel', 'Protocolo para câncer de ovário - Carboplatina + Paclitaxel', 'C56', 21, 6, 1);

-- Inserir medicamentos para o protocolo AC-T
INSERT INTO Medicamentos_Protocolo (protocolo_id, nome, dose, unidade_medida, via_adm, dias_adm, frequencia, ordem) VALUES
(1, 'Doxorrubicina', '60', 'mg/m²', 'EV', 'D1', 'único', 1),
(1, 'Ciclofosfamida', '600', 'mg/m²', 'EV', 'D1', 'único', 2),
(1, 'Paclitaxel', '175', 'mg/m²', 'EV', 'D1', 'único', 3);

-- Inserir medicamentos para o protocolo FOLFOX
INSERT INTO Medicamentos_Protocolo (protocolo_id, nome, dose, unidade_medida, via_adm, dias_adm, frequencia, ordem) VALUES
(2, 'Oxaliplatina', '85', 'mg/m²', 'EV', 'D1', 'único', 1),
(2, 'Leucovorina', '400', 'mg/m²', 'EV', 'D1,D2', '1x', 2),
(2, '5-Fluorouracil', '400', 'mg/m²', 'EV', 'D1,D2', '1x', 3),
(2, '5-Fluorouracil', '2400', 'mg/m²', 'EV', 'D1,D2', 'infusão contínua', 4);

-- Inserir medicamentos para o protocolo Carboplatina + Paclitaxel
INSERT INTO Medicamentos_Protocolo (protocolo_id, nome, dose, unidade_medida, via_adm, dias_adm, frequencia, ordem) VALUES
(3, 'Carboplatina', 'AUC 6', 'AUC', 'EV', 'D1', 'único', 1),
(3, 'Paclitaxel', '175', 'mg/m²', 'EV', 'D1', 'único', 2); 