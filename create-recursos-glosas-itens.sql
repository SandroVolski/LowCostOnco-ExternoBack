-- Tabela para armazenar itens específicos glosados dentro de um recurso
CREATE TABLE IF NOT EXISTS recursos_glosas_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recurso_glosa_id INT NOT NULL,
  item_id VARCHAR(255) NOT NULL COMMENT 'ID do item glosado (ex: proc-12345, med-67890)',
  tipo_item ENUM('procedimento', 'medicamento', 'material', 'taxa') NOT NULL,
  codigo_item VARCHAR(50) NOT NULL,
  descricao_item TEXT NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
  valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL,
  justificativa_item TEXT COMMENT 'Justificativa específica deste item',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_recursos_glosas_itens_recurso
    FOREIGN KEY (recurso_glosa_id) 
    REFERENCES recursos_glosas(id) 
    ON DELETE CASCADE,
    
  INDEX idx_recurso_glosa_id (recurso_glosa_id),
  INDEX idx_item_id (item_id),
  INDEX idx_tipo_item (tipo_item)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Itens específicos glosados dentro de cada recurso de glosa';

