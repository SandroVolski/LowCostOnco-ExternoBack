-- ============================================
-- SISTEMA FINANCEIRO - LOTES E GUIAS TISS
-- ============================================
-- Criação das tabelas para gestão financeira
-- Suporta upload e processamento de XML TISS
-- ============================================

-- Tabela de Lotes Financeiros
CREATE TABLE IF NOT EXISTS lotes_financeiros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinica_id INT NOT NULL,
    operadora_registro_ans VARCHAR(50) NOT NULL,
    operadora_nome VARCHAR(255),
    numero_lote VARCHAR(50) NOT NULL,
    competencia VARCHAR(7) NOT NULL COMMENT 'Formato: YYYY-MM',
    data_envio DATE NOT NULL,
    data_registro_transacao DATETIME,
    hora_registro_transacao TIME,
    tipo_transacao VARCHAR(50) DEFAULT 'ENVIO_LOTE_GUIAS',
    sequencial_transacao VARCHAR(50),
    padrao_tiss VARCHAR(20),
    quantidade_guias INT DEFAULT 0,
    valor_total DECIMAL(12, 2) DEFAULT 0.00,
    status ENUM('pendente', 'pago', 'glosado', 'parcialmente_pago') DEFAULT 'pendente',
    arquivo_xml TEXT COMMENT 'Nome do arquivo XML original',
    caminho_arquivo VARCHAR(500) COMMENT 'Caminho completo do arquivo no servidor',
    hash_xml VARCHAR(64) COMMENT 'Hash MD5 ou SHA256 do XML para verificação',
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

-- Tabela de Guias Financeiras (SP-SADT)
CREATE TABLE IF NOT EXISTS guias_financeiras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    clinica_id INT NOT NULL,
    
    -- Cabeçalho da Guia
    registro_ans VARCHAR(50),
    numero_guia_prestador VARCHAR(50) NOT NULL,
    numero_guia_operadora VARCHAR(50),
    guia_principal VARCHAR(50),
    
    -- Dados de Autorização
    data_autorizacao DATE,
    senha VARCHAR(50),
    data_validade_senha DATE,
    
    -- Dados do Beneficiário
    numero_carteira VARCHAR(50),
    atendimento_rn CHAR(1) DEFAULT 'N',
    
    -- Dados do Solicitante
    cnpj_contratado_solicitante VARCHAR(20),
    nome_contratado_solicitante VARCHAR(255),
    nome_profissional_solicitante VARCHAR(255),
    conselho_profissional_solicitante VARCHAR(10),
    numero_conselho_solicitante VARCHAR(20),
    uf_solicitante VARCHAR(2),
    cbos_solicitante VARCHAR(10),
    
    -- Dados da Solicitação
    data_solicitacao DATE,
    carater_atendimento VARCHAR(2),
    indicacao_clinica TEXT,
    
    -- Dados do Executante
    cnpj_contratado_executante VARCHAR(20),
    cnes_executante VARCHAR(20),
    
    -- Dados de Atendimento
    tipo_atendimento VARCHAR(2),
    indicacao_acidente VARCHAR(2),
    regime_atendimento VARCHAR(2),
    data_execucao DATE,
    
    -- Valores
    valor_procedimentos DECIMAL(12, 2) DEFAULT 0.00,
    valor_taxas_alugueis DECIMAL(12, 2) DEFAULT 0.00,
    valor_materiais DECIMAL(12, 2) DEFAULT 0.00,
    valor_medicamentos DECIMAL(12, 2) DEFAULT 0.00,
    valor_gases_medicinais DECIMAL(12, 2) DEFAULT 0.00,
    valor_total DECIMAL(12, 2) NOT NULL,
    
    -- Controle de Pagamento
    status_pagamento ENUM('pendente', 'pago', 'glosado', 'parcialmente_pago') DEFAULT 'pendente',
    valor_pago DECIMAL(12, 2) DEFAULT 0.00,
    valor_glosado DECIMAL(12, 2) DEFAULT 0.00,
    data_pagamento DATE,
    motivo_glosa TEXT,
    
    -- Documentos Anexos
    documentos_anexos TEXT COMMENT 'JSON com lista de documentos anexados',
    
    -- Observações
    observacoes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lote_id) REFERENCES lotes_financeiros(id) ON DELETE CASCADE,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    INDEX idx_lote (lote_id),
    INDEX idx_clinica (clinica_id),
    INDEX idx_numero_guia_prestador (numero_guia_prestador),
    INDEX idx_numero_guia_operadora (numero_guia_operadora),
    INDEX idx_numero_carteira (numero_carteira),
    INDEX idx_data_execucao (data_execucao),
    INDEX idx_status_pagamento (status_pagamento),
    UNIQUE KEY uk_guia_lote (lote_id, numero_guia_prestador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Procedimentos Executados (detalhamento das guias)
CREATE TABLE IF NOT EXISTS guias_procedimentos_executados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guia_id INT NOT NULL,
    sequencial_item INT NOT NULL,
    data_execucao DATE NOT NULL,
    hora_inicial TIME,
    hora_final TIME,
    codigo_tabela VARCHAR(10),
    codigo_procedimento VARCHAR(20) NOT NULL,
    descricao_procedimento TEXT,
    quantidade_executada DECIMAL(10, 3) NOT NULL,
    via_acesso VARCHAR(2),
    tecnica_utilizada VARCHAR(2),
    reducao_acrescimo DECIMAL(5, 2) DEFAULT 1.00,
    valor_unitario DECIMAL(12, 2) NOT NULL,
    valor_total DECIMAL(12, 2) NOT NULL,
    unidade_medida VARCHAR(10),
    
    -- Equipe SADT (se aplicável)
    grau_participacao VARCHAR(2),
    cpf_profissional VARCHAR(14),
    nome_profissional VARCHAR(255),
    conselho_profissional VARCHAR(10),
    numero_conselho VARCHAR(20),
    uf_profissional VARCHAR(2),
    cbos_profissional VARCHAR(10),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (guia_id) REFERENCES guias_financeiras(id) ON DELETE CASCADE,
    INDEX idx_guia (guia_id),
    INDEX idx_codigo_procedimento (codigo_procedimento),
    INDEX idx_data_execucao (data_execucao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Outras Despesas (taxas, medicamentos, materiais)
CREATE TABLE IF NOT EXISTS guias_outras_despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guia_id INT NOT NULL,
    sequencial_item INT NOT NULL,
    codigo_despesa VARCHAR(10) NOT NULL COMMENT '01=Gases, 02=Medicamentos, 03=Materiais, 04=OPME, 07=Taxas',
    tipo_despesa VARCHAR(50),
    data_execucao DATE NOT NULL,
    hora_inicial TIME,
    hora_final TIME,
    codigo_tabela VARCHAR(10),
    codigo_item VARCHAR(20) NOT NULL,
    descricao_item TEXT,
    quantidade_executada DECIMAL(10, 3) NOT NULL,
    unidade_medida VARCHAR(10),
    reducao_acrescimo DECIMAL(5, 2) DEFAULT 1.00,
    valor_unitario DECIMAL(12, 2) NOT NULL,
    valor_total DECIMAL(12, 2) NOT NULL,
    
    -- Dados específicos de medicamentos
    registro_anvisa VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (guia_id) REFERENCES guias_financeiras(id) ON DELETE CASCADE,
    INDEX idx_guia (guia_id),
    INDEX idx_codigo_despesa (codigo_despesa),
    INDEX idx_codigo_item (codigo_item),
    INDEX idx_data_execucao (data_execucao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Documentos Anexados às Guias
CREATE TABLE IF NOT EXISTS guias_documentos (
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
    
    FOREIGN KEY (guia_id) REFERENCES guias_financeiras(id) ON DELETE CASCADE,
    INDEX idx_guia (guia_id),
    INDEX idx_tipo_documento (tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Histórico de Status (audit log)
CREATE TABLE IF NOT EXISTS lotes_historico_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT,
    guia_id INT,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    observacao TEXT,
    alterado_por INT COMMENT 'ID do usuário que alterou',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lote_id) REFERENCES lotes_financeiros(id) ON DELETE CASCADE,
    FOREIGN KEY (guia_id) REFERENCES guias_financeiras(id) ON DELETE CASCADE,
    INDEX idx_lote (lote_id),
    INDEX idx_guia (guia_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEWS PARA RELATÓRIOS
-- ============================================

-- View de Resumo por Competência
CREATE OR REPLACE VIEW vw_financeiro_por_competencia AS
SELECT 
    l.clinica_id,
    l.competencia,
    l.operadora_registro_ans,
    l.operadora_nome,
    COUNT(DISTINCT l.id) as total_lotes,
    COUNT(DISTINCT g.id) as total_guias,
    SUM(l.valor_total) as valor_total_lotes,
    SUM(CASE WHEN l.status = 'pago' THEN l.valor_total ELSE 0 END) as valor_pago,
    SUM(CASE WHEN l.status = 'pendente' THEN l.valor_total ELSE 0 END) as valor_pendente,
    SUM(CASE WHEN l.status = 'glosado' THEN l.valor_total ELSE 0 END) as valor_glosado
FROM lotes_financeiros l
LEFT JOIN guias_financeiras g ON g.lote_id = l.id
GROUP BY l.clinica_id, l.competencia, l.operadora_registro_ans, l.operadora_nome;

-- View de Resumo por Operadora
CREATE OR REPLACE VIEW vw_financeiro_por_operadora AS
SELECT 
    l.clinica_id,
    l.operadora_registro_ans,
    l.operadora_nome,
    COUNT(DISTINCT l.id) as total_lotes,
    COUNT(DISTINCT g.id) as total_guias,
    SUM(l.valor_total) as valor_total,
    SUM(CASE WHEN l.status = 'pago' THEN l.valor_total ELSE 0 END) as valor_pago,
    SUM(CASE WHEN l.status = 'pendente' THEN l.valor_total ELSE 0 END) as valor_pendente,
    SUM(CASE WHEN l.status = 'glosado' THEN l.valor_total ELSE 0 END) as valor_glosado,
    MIN(l.data_envio) as primeira_fatura,
    MAX(l.data_envio) as ultima_fatura
FROM lotes_financeiros l
LEFT JOIN guias_financeiras g ON g.lote_id = l.id
GROUP BY l.clinica_id, l.operadora_registro_ans, l.operadora_nome;

-- ============================================
-- DADOS INICIAIS / COMENTÁRIOS
-- ============================================

-- Códigos de Despesa (conforme TISS):
-- 01 - Gases medicinais
-- 02 - Medicamentos
-- 03 - Materiais
-- 04 - OPME (Órteses, Próteses e Materiais Especiais)
-- 05 - Taxas e aluguéis (diárias, taxas)
-- 06 - Diárias de acompanhante
-- 07 - Taxas diversas (sala, equipamentos)

-- Status de Pagamento:
-- pendente - Aguardando pagamento
-- pago - Totalmente pago
-- glosado - Totalmente glosado (não pago)
-- parcialmente_pago - Pago parcialmente (com glosas)

-- ============================================
-- FIM DO SCRIPT
-- ============================================

