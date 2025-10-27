-- ============================================
-- SISTEMA FINANCEIRO - INTEGRAÇÃO ORGANIZADA
-- ============================================
-- Criação das tabelas financeiras seguindo o padrão
-- das tabelas existentes do sistema
-- ============================================

-- Tabela principal de Lotes Financeiros
CREATE TABLE IF NOT EXISTS financeiro_lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinica_id INT NOT NULL,
    operadora_registro_ans VARCHAR(50) NOT NULL,
    operadora_nome VARCHAR(255),
    numero_lote VARCHAR(50) NOT NULL,
    competencia VARCHAR(7) NOT NULL COMMENT 'Formato: YYYY-MM',
    data_envio DATE NOT NULL,
    quantidade_guias INT DEFAULT 0,
    valor_total DECIMAL(12, 2) DEFAULT 0.00,
    status ENUM('pendente', 'pago', 'glosado', 'parcialmente_pago') DEFAULT 'pendente',
    arquivo_xml VARCHAR(255) COMMENT 'Nome do arquivo XML original',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    INDEX idx_clinica_competencia (clinica_id, competencia),
    INDEX idx_operadora (operadora_registro_ans),
    INDEX idx_numero_lote (numero_lote),
    INDEX idx_status (status),
    UNIQUE KEY uk_lote_clinica (clinica_id, numero_lote, operadora_registro_ans)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Guias Financeiras
CREATE TABLE IF NOT EXISTS financeiro_guias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    clinica_id INT NOT NULL,
    numero_guia_prestador VARCHAR(50) NOT NULL,
    numero_guia_operadora VARCHAR(50),
    numero_carteira VARCHAR(50),
    data_autorizacao DATE,
    data_execucao DATE,
    valor_procedimentos DECIMAL(12, 2) DEFAULT 0.00,
    valor_taxas_alugueis DECIMAL(12, 2) DEFAULT 0.00,
    valor_materiais DECIMAL(12, 2) DEFAULT 0.00,
    valor_medicamentos DECIMAL(12, 2) DEFAULT 0.00,
    valor_total DECIMAL(12, 2) NOT NULL,
    status_pagamento ENUM('pendente', 'pago', 'glosado', 'parcialmente_pago') DEFAULT 'pendente',
    valor_pago DECIMAL(12, 2) DEFAULT 0.00,
    data_pagamento DATE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lote_id) REFERENCES financeiro_lotes(id) ON DELETE CASCADE,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    INDEX idx_lote (lote_id),
    INDEX idx_clinica (clinica_id),
    INDEX idx_numero_guia (numero_guia_prestador),
    INDEX idx_status_pagamento (status_pagamento),
    INDEX idx_data_autorizacao (data_autorizacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Procedimentos das Guias
CREATE TABLE IF NOT EXISTS financeiro_procedimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guia_id INT NOT NULL,
    codigo_procedimento VARCHAR(20) NOT NULL,
    descricao_procedimento TEXT,
    data_execucao DATE NOT NULL,
    quantidade_executada DECIMAL(10, 3) NOT NULL,
    valor_unitario DECIMAL(12, 2) NOT NULL,
    valor_total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (guia_id) REFERENCES financeiro_guias(id) ON DELETE CASCADE,
    INDEX idx_guia (guia_id),
    INDEX idx_codigo_procedimento (codigo_procedimento),
    INDEX idx_data_execucao (data_execucao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Outras Despesas (medicamentos, materiais, etc.)
CREATE TABLE IF NOT EXISTS financeiro_despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guia_id INT NOT NULL,
    codigo_despesa VARCHAR(10) NOT NULL COMMENT '01=Gases, 02=Medicamentos, 03=Materiais, 04=OPME, 07=Taxas',
    tipo_despesa VARCHAR(50),
    codigo_item VARCHAR(20) NOT NULL,
    descricao_item TEXT,
    quantidade_executada DECIMAL(10, 3) NOT NULL,
    valor_unitario DECIMAL(12, 2) NOT NULL,
    valor_total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (guia_id) REFERENCES financeiro_guias(id) ON DELETE CASCADE,
    INDEX idx_guia (guia_id),
    INDEX idx_codigo_despesa (codigo_despesa),
    INDEX idx_codigo_item (codigo_item)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Documentos Anexados
CREATE TABLE IF NOT EXISTS financeiro_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guia_id INT NOT NULL,
    tipo_documento VARCHAR(50) COMMENT 'comprovante_pagamento, laudo_medico, nota_fiscal, etc',
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tamanho_arquivo INT COMMENT 'Tamanho em bytes',
    mime_type VARCHAR(100),
    descricao TEXT,
    uploaded_by INT COMMENT 'ID do usuário que fez upload',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (guia_id) REFERENCES financeiro_guias(id) ON DELETE CASCADE,
    INDEX idx_guia (guia_id),
    INDEX idx_tipo_documento (tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Histórico de Status (audit log)
CREATE TABLE IF NOT EXISTS financeiro_historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT,
    guia_id INT,
    acao VARCHAR(50) NOT NULL COMMENT 'status_change, document_upload, payment_update, etc',
    valor_anterior TEXT,
    valor_novo TEXT,
    usuario_id INT,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lote_id) REFERENCES financeiro_lotes(id) ON DELETE SET NULL,
    FOREIGN KEY (guia_id) REFERENCES financeiro_guias(id) ON DELETE SET NULL,
    INDEX idx_lote (lote_id),
    INDEX idx_guia (guia_id),
    INDEX idx_acao (acao),
    INDEX idx_usuario (usuario_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEWS PARA FACILITAR CONSULTAS
-- ============================================

-- View para resumo financeiro por clínica
CREATE OR REPLACE VIEW vw_financeiro_resumo AS
SELECT 
    l.clinica_id,
    COUNT(DISTINCT l.id) as total_lotes,
    COUNT(DISTINCT g.id) as total_guias,
    SUM(l.valor_total) as valor_total_lotes,
    SUM(CASE WHEN l.status = 'pago' THEN l.valor_total ELSE 0 END) as valor_pago,
    SUM(CASE WHEN l.status = 'pendente' THEN l.valor_total ELSE 0 END) as valor_pendente,
    SUM(CASE WHEN l.status = 'glosado' THEN l.valor_total ELSE 0 END) as valor_glosado,
    MAX(l.created_at) as ultimo_upload
FROM financeiro_lotes l
LEFT JOIN financeiro_guias g ON l.id = g.lote_id
GROUP BY l.clinica_id;

-- View para detalhamento de guias com lotes
CREATE OR REPLACE VIEW vw_financeiro_guias_detalhado AS
SELECT 
    g.id,
    g.lote_id,
    g.clinica_id,
    g.numero_guia_prestador,
    g.numero_guia_operadora,
    g.numero_carteira,
    g.data_autorizacao,
    g.data_execucao,
    g.valor_total,
    g.status_pagamento,
    g.valor_pago,
    g.data_pagamento,
    l.numero_lote,
    l.operadora_nome,
    l.operadora_registro_ans,
    l.competencia,
    l.status as status_lote,
    COUNT(DISTINCT p.id) as qtd_procedimentos,
    COUNT(DISTINCT d.id) as qtd_despesas,
    COUNT(DISTINCT doc.id) as qtd_documentos
FROM financeiro_guias g
LEFT JOIN financeiro_lotes l ON g.lote_id = l.id
LEFT JOIN financeiro_procedimentos p ON g.id = p.guia_id
LEFT JOIN financeiro_despesas d ON g.id = d.guia_id
LEFT JOIN financeiro_documentos doc ON g.id = doc.guia_id
GROUP BY g.id, l.id;

-- ============================================
-- INSERÇÃO DE DADOS INICIAIS (OPCIONAL)
-- ============================================

-- Inserir alguns dados de exemplo para teste (apenas se necessário)
-- INSERT INTO financeiro_lotes (clinica_id, operadora_registro_ans, operadora_nome, numero_lote, competencia, data_envio, quantidade_guias, valor_total, status) 
-- VALUES 
-- (1, '123456', 'Operadora Teste', 'LOTE001', '2024-01', '2024-01-15', 5, 15000.00, 'pendente');

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================

/*
ESTRUTURA ORGANIZADA SEGUINDO O PADRÃO DO SISTEMA:

1. financeiro_lotes - Tabela principal dos lotes
2. financeiro_guias - Guias dentro dos lotes  
3. financeiro_procedimentos - Procedimentos das guias
4. financeiro_despesas - Outras despesas (medicamentos, materiais)
5. financeiro_documentos - Documentos anexados às guias
6. financeiro_historico - Log de auditoria

CARACTERÍSTICAS:
- Nomes consistentes com prefixo 'financeiro_'
- Foreign keys bem definidas
- Índices otimizados para consultas
- Campos created_at/updated_at em todas as tabelas
- Campos de auditoria (uploaded_by, observacoes)
- Views para facilitar consultas complexas
- Compatível com a estrutura existente

INTEGRAÇÃO:
- Usa a tabela 'clinicas' existente
- Segue padrão de nomenclatura do sistema
- Mantém consistência com outras tabelas
- Suporte completo ao padrão TISS XML
*/
