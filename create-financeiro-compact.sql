-- ============================================
-- SISTEMA FINANCEIRO - ESTRUTURA COMPACTA
-- ============================================
-- Apenas 3 tabelas principais para máxima organização
-- Seguindo o padrão enxuto do sistema existente
-- ============================================

-- 1. TABELA PRINCIPAL: financeiro_lotes (lotes + guias + procedimentos)
CREATE TABLE IF NOT EXISTS financeiro_lotes (
    -- Identificação do lote
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinica_id INT NOT NULL,
    operadora_registro_ans VARCHAR(50) NOT NULL,
    operadora_nome VARCHAR(255),
    numero_lote VARCHAR(50) NOT NULL,
    competencia VARCHAR(7) NOT NULL COMMENT 'Formato: YYYY-MM',
    data_envio DATE NOT NULL,
    
    -- Controle do lote
    quantidade_guias INT DEFAULT 0,
    valor_total DECIMAL(12, 2) DEFAULT 0.00,
    status ENUM('pendente', 'pago', 'glosado', 'parcialmente_pago') DEFAULT 'pendente',
    
    -- Arquivo XML
    arquivo_xml VARCHAR(255) COMMENT 'Nome do arquivo XML original',
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys e Índices
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    INDEX idx_clinica_competencia (clinica_id, competencia),
    INDEX idx_operadora (operadora_registro_ans),
    INDEX idx_numero_lote (numero_lote),
    INDEX idx_status (status),
    UNIQUE KEY uk_lote_clinica (clinica_id, numero_lote, operadora_registro_ans)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA UNIFICADA: financeiro_items (guias + procedimentos + despesas)
CREATE TABLE IF NOT EXISTS financeiro_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    clinica_id INT NOT NULL,
    
    -- Tipo do item (guia, procedimento, despesa)
    tipo_item ENUM('guia', 'procedimento', 'despesa') NOT NULL,
    
    -- Dados da guia (quando tipo_item = 'guia')
    numero_guia_prestador VARCHAR(50),
    numero_guia_operadora VARCHAR(50),
    numero_carteira VARCHAR(50),
    data_autorizacao DATE,
    data_execucao DATE,
    
    -- Dados do procedimento/despesa (quando tipo_item != 'guia')
    codigo_item VARCHAR(20),
    descricao_item TEXT,
    quantidade_executada DECIMAL(10, 3) DEFAULT 1.00,
    valor_unitario DECIMAL(12, 2) DEFAULT 0.00,
    valor_total DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Controle de pagamento
    status_pagamento ENUM('pendente', 'pago', 'glosado', 'parcialmente_pago') DEFAULT 'pendente',
    valor_pago DECIMAL(12, 2) DEFAULT 0.00,
    data_pagamento DATE,
    
    -- Hierarquia (para procedimentos/despesas vinculados a guias)
    parent_id INT NULL COMMENT 'ID da guia pai (quando é procedimento ou despesa)',
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys e Índices
    FOREIGN KEY (lote_id) REFERENCES financeiro_lotes(id) ON DELETE CASCADE,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES financeiro_items(id) ON DELETE CASCADE,
    
    INDEX idx_lote (lote_id),
    INDEX idx_clinica (clinica_id),
    INDEX idx_tipo_item (tipo_item),
    INDEX idx_parent (parent_id),
    INDEX idx_status_pagamento (status_pagamento),
    INDEX idx_numero_guia (numero_guia_prestador),
    INDEX idx_codigo_item (codigo_item),
    INDEX idx_data_execucao (data_execucao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA DE ANEXOS: financeiro_anexos (documentos + histórico)
CREATE TABLE IF NOT EXISTS financeiro_anexos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NULL,
    item_id INT NULL,
    clinica_id INT NOT NULL,
    
    -- Tipo do anexo
    tipo_anexo ENUM('documento', 'historico') NOT NULL,
    
    -- Para documentos
    tipo_documento VARCHAR(50) COMMENT 'comprovante_pagamento, laudo_medico, nota_fiscal, etc',
    nome_arquivo VARCHAR(255),
    caminho_arquivo VARCHAR(500),
    tamanho_arquivo INT COMMENT 'Tamanho em bytes',
    mime_type VARCHAR(100),
    
    -- Para histórico
    acao VARCHAR(50) COMMENT 'status_change, document_upload, payment_update, etc',
    valor_anterior TEXT,
    valor_novo TEXT,
    
    -- Descrição e usuário
    descricao TEXT,
    usuario_id INT,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys e Índices
    FOREIGN KEY (lote_id) REFERENCES financeiro_lotes(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES financeiro_items(id) ON DELETE CASCADE,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    
    INDEX idx_lote (lote_id),
    INDEX idx_item (item_id),
    INDEX idx_clinica (clinica_id),
    INDEX idx_tipo_anexo (tipo_anexo),
    INDEX idx_tipo_documento (tipo_documento),
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
    COUNT(DISTINCT CASE WHEN i.tipo_item = 'guia' THEN i.id END) as total_guias,
    COUNT(DISTINCT CASE WHEN i.tipo_item = 'procedimento' THEN i.id END) as total_procedimentos,
    COUNT(DISTINCT CASE WHEN i.tipo_item = 'despesa' THEN i.id END) as total_despesas,
    SUM(l.valor_total) as valor_total_lotes,
    SUM(CASE WHEN l.status = 'pago' THEN l.valor_total ELSE 0 END) as valor_pago,
    SUM(CASE WHEN l.status = 'pendente' THEN l.valor_total ELSE 0 END) as valor_pendente,
    SUM(CASE WHEN l.status = 'glosado' THEN l.valor_total ELSE 0 END) as valor_glosado,
    MAX(l.created_at) as ultimo_upload
FROM financeiro_lotes l
LEFT JOIN financeiro_items i ON l.id = i.lote_id
GROUP BY l.clinica_id;

-- View para detalhamento de guias
CREATE OR REPLACE VIEW vw_financeiro_guias_detalhado AS
SELECT 
    i.id,
    i.lote_id,
    i.clinica_id,
    i.numero_guia_prestador,
    i.numero_guia_operadora,
    i.numero_carteira,
    i.data_autorizacao,
    i.data_execucao,
    i.valor_total,
    i.status_pagamento,
    i.valor_pago,
    i.data_pagamento,
    l.numero_lote,
    l.operadora_nome,
    l.operadora_registro_ans,
    l.competencia,
    l.status as status_lote,
    COUNT(DISTINCT p.id) as qtd_procedimentos,
    COUNT(DISTINCT d.id) as qtd_despesas,
    COUNT(DISTINCT a.id) as qtd_documentos
FROM financeiro_items i
LEFT JOIN financeiro_lotes l ON i.lote_id = l.id
LEFT JOIN financeiro_items p ON i.id = p.parent_id AND p.tipo_item = 'procedimento'
LEFT JOIN financeiro_items d ON i.id = d.parent_id AND d.tipo_item = 'despesa'
LEFT JOIN financeiro_anexos a ON i.id = a.item_id AND a.tipo_anexo = 'documento'
WHERE i.tipo_item = 'guia'
GROUP BY i.id, l.id;

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Inserir dados de exemplo para teste
-- INSERT INTO financeiro_lotes (clinica_id, operadora_registro_ans, operadora_nome, numero_lote, competencia, data_envio, quantidade_guias, valor_total, status) 
-- VALUES 
-- (1, '123456', 'Operadora Teste', 'LOTE001', '2024-01', '2024-01-15', 5, 15000.00, 'pendente');

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================

/*
ESTRUTURA ULTRA-COMPACTA (APENAS 3 TABELAS):

1. financeiro_lotes - Lotes principais
2. financeiro_items - Guias, procedimentos e despesas (UNIFICADO)
3. financeiro_anexos - Documentos e histórico (UNIFICADO)

VANTAGENS:
✅ Apenas 3 tabelas vs 6 anteriores
✅ Mantém todas as funcionalidades
✅ Estrutura hierárquica clara
✅ Views para facilitar consultas
✅ Segue padrão enxuto do sistema
✅ Fácil manutenção e evolução

FUNCIONALIDADES MANTIDAS:
✅ Upload e processamento XML TISS
✅ Gestão de lotes e guias
✅ Controle de procedimentos e despesas
✅ Anexação de documentos
✅ Histórico de alterações
✅ Relatórios e estatísticas
✅ Integração com sistema existente

PADRÃO HIERÁRQUICO:
Lote → Guias → Procedimentos/Despesas
  ↓       ↓           ↓
Anexos → Anexos → Anexos
*/
