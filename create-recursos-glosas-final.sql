-- ============================================
-- SISTEMA DE RECURSOS DE GLOSAS - VERSÃO FINAL
-- ============================================
-- Adaptado para usar financeiro_items em vez de financeiro_guias
-- ============================================

-- ===================================
-- Criar view para compatibilidade
-- ===================================
CREATE OR REPLACE VIEW financeiro_guias AS
SELECT
    id,
    lote_id,
    clinica_id,
    numero_guia_prestador,
    numero_guia_operadora,
    numero_carteira,
    data_autorizacao,
    data_execucao,
    valor_total,
    status_pagamento,
    valor_pago,
    data_pagamento,
    created_at,
    updated_at
FROM financeiro_items
WHERE tipo_item = 'guia' OR tipo_item IS NULL;

-- ============================================
-- 1. TABELA DE AUDITORES
-- ============================================
CREATE TABLE IF NOT EXISTS auditores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    registro_profissional VARCHAR(50) COMMENT 'CRM, COREN, etc',
    especialidade VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_cpf (cpf),
    INDEX idx_email (email),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de auditores que emitem pareceres sobre recursos de glosas';

-- ============================================
-- 2. TABELA DE USUÁRIOS AUDITORES (para login)
-- ============================================
CREATE TABLE IF NOT EXISTS auditor_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auditor_id INT NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ultimo_acesso TIMESTAMP NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (auditor_id) REFERENCES auditores(id) ON DELETE CASCADE,
    INDEX idx_username (username),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Usuários de auditores para autenticação';

-- ============================================
-- 3. TABELA PRINCIPAL DE RECURSOS DE GLOSAS
-- ============================================
CREATE TABLE IF NOT EXISTS recursos_glosas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guia_id INT NOT NULL COMMENT 'ID do financeiro_items (guia)',
    lote_id INT NOT NULL,
    clinica_id INT NOT NULL,
    operadora_registro_ans VARCHAR(50) NOT NULL,

    -- Dados do recurso
    justificativa TEXT NOT NULL COMMENT 'Justificativa da clínica para o recurso',
    motivos_glosa TEXT COMMENT 'Motivos alegados pela clínica (JSON)',
    valor_guia DECIMAL(12, 2) NOT NULL COMMENT 'Valor total da guia em recurso',

    -- Status e fluxo
    status_recurso ENUM(
        'pendente',           -- Clínica enviou, aguardando Operadora
        'em_analise_operadora', -- Operadora analisando
        'solicitado_parecer',  -- Operadora solicitou parecer ao Auditor
        'em_analise_auditor',  -- Auditor analisando
        'parecer_emitido',     -- Auditor emitiu parecer, retorna para Operadora
        'deferido',            -- Operadora aprovou/pagou
        'indeferido',          -- Operadora negou
        'devolvido_clinica'    -- Operadora devolveu para clínica com observações
    ) DEFAULT 'pendente',

    -- Datas e controle
    data_envio_clinica TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_recebimento_operadora TIMESTAMP NULL,
    data_solicitacao_parecer TIMESTAMP NULL,
    data_recebimento_auditor TIMESTAMP NULL,
    data_emissao_parecer TIMESTAMP NULL,
    data_decisao_final TIMESTAMP NULL,

    -- IDs de controle
    usuario_clinica_id INT COMMENT 'Usuário da clínica que criou o recurso',
    usuario_operadora_id INT COMMENT 'Usuário da operadora responsável',
    auditor_id INT COMMENT 'Auditor designado para análise',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (guia_id) REFERENCES financeiro_items(id) ON DELETE CASCADE,
    FOREIGN KEY (lote_id) REFERENCES financeiro_lotes(id) ON DELETE CASCADE,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    FOREIGN KEY (auditor_id) REFERENCES auditores(id) ON DELETE SET NULL,

    INDEX idx_guia (guia_id),
    INDEX idx_lote (lote_id),
    INDEX idx_clinica (clinica_id),
    INDEX idx_operadora (operadora_registro_ans),
    INDEX idx_status (status_recurso),
    INDEX idx_auditor (auditor_id),
    INDEX idx_data_envio (data_envio_clinica)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela principal de recursos de glosas';

-- ============================================
-- 4. TABELA DE DOCUMENTOS DO RECURSO
-- ============================================
CREATE TABLE IF NOT EXISTS recursos_glosas_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recurso_glosa_id INT NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL COMMENT 'comprovante, laudo, exame, nota_fiscal, outros',
    nome_original VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL COMMENT 'Nome único do arquivo no servidor',
    caminho_arquivo VARCHAR(500) NOT NULL,
    tamanho_arquivo INT COMMENT 'Tamanho em bytes',
    mime_type VARCHAR(100),
    enviado_por ENUM('clinica', 'operadora', 'auditor') NOT NULL,
    usuario_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
    INDEX idx_recurso (recurso_glosa_id),
    INDEX idx_tipo (tipo_documento),
    INDEX idx_enviado_por (enviado_por)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Documentos anexados aos recursos de glosas';

-- ============================================
-- 5. TABELA DE PARECERES DE AUDITORES
-- ============================================
CREATE TABLE IF NOT EXISTS recursos_glosas_pareceres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recurso_glosa_id INT NOT NULL,
    auditor_id INT NOT NULL,

    -- Parecer
    parecer_tecnico TEXT NOT NULL COMMENT 'Parecer técnico detalhado do auditor',
    recomendacao ENUM('aprovar', 'negar', 'solicitar_documentos', 'parcial') NOT NULL,
    valor_recomendado DECIMAL(12, 2) COMMENT 'Valor recomendado para pagamento (se parcial)',
    justificativa_tecnica TEXT COMMENT 'Justificativa técnica da recomendação',

    -- CID e procedimentos avaliados
    cids_analisados TEXT COMMENT 'CIDs relacionados (JSON)',
    procedimentos_analisados TEXT COMMENT 'Procedimentos analisados (JSON)',

    -- Controle
    data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tempo_analise_minutos INT COMMENT 'Tempo gasto na análise',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
    FOREIGN KEY (auditor_id) REFERENCES auditores(id) ON DELETE CASCADE,
    INDEX idx_recurso (recurso_glosa_id),
    INDEX idx_auditor (auditor_id),
    INDEX idx_recomendacao (recomendacao),
    INDEX idx_data_emissao (data_emissao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pareceres técnicos emitidos por auditores';

-- ============================================
-- 6. TABELA DE HISTÓRICO/TIMELINE DO RECURSO
-- ============================================
CREATE TABLE IF NOT EXISTS recursos_glosas_historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recurso_glosa_id INT NOT NULL,

    -- Ação realizada
    acao VARCHAR(100) NOT NULL COMMENT 'recurso_criado, documento_anexado, status_alterado, parecer_solicitado, parecer_emitido, decisao_final, etc',
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),

    -- Quem realizou
    realizado_por ENUM('clinica', 'operadora', 'auditor', 'sistema') NOT NULL,
    usuario_id INT,
    usuario_nome VARCHAR(255),

    -- Detalhes
    descricao TEXT COMMENT 'Descrição detalhada da ação',
    dados_adicionais TEXT COMMENT 'Dados adicionais em JSON',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
    INDEX idx_recurso (recurso_glosa_id),
    INDEX idx_acao (acao),
    INDEX idx_realizado_por (realizado_por),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Histórico completo de ações nos recursos de glosas';

-- ============================================
-- 7. TABELA DE CHAT OPERADORA-AUDITOR
-- ============================================
CREATE TABLE IF NOT EXISTS recursos_glosas_chat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recurso_glosa_id INT NOT NULL,

    -- Mensagem
    tipo_remetente ENUM('operadora', 'auditor') NOT NULL,
    remetente_id INT NOT NULL COMMENT 'ID do usuário operadora ou auditor',
    remetente_nome VARCHAR(255) NOT NULL,

    mensagem TEXT NOT NULL,
    anexos TEXT COMMENT 'Anexos da mensagem (JSON com paths)',

    -- Controle
    lida BOOLEAN DEFAULT FALSE,
    data_leitura TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
    INDEX idx_recurso (recurso_glosa_id),
    INDEX idx_tipo_remetente (tipo_remetente),
    INDEX idx_lida (lida),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chat exclusivo entre Operadora e Auditor sobre recursos';

-- ============================================
-- 8. TABELA DE NOTIFICAÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS recursos_glosas_notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recurso_glosa_id INT NOT NULL,

    -- Destinatário
    destinatario_tipo ENUM('clinica', 'operadora', 'auditor') NOT NULL,
    destinatario_id INT NOT NULL,

    -- Notificação
    tipo_notificacao VARCHAR(50) NOT NULL COMMENT 'novo_recurso, parecer_solicitado, parecer_emitido, decisao_final, nova_mensagem, etc',
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    link VARCHAR(500) COMMENT 'Link para a página relevante',

    -- Status
    lida BOOLEAN DEFAULT FALSE,
    data_leitura TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
    INDEX idx_recurso (recurso_glosa_id),
    INDEX idx_destinatario (destinatario_tipo, destinatario_id),
    INDEX idx_lida (lida),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Notificações automáticas do sistema de recursos';

-- ============================================
-- 9. VIEWS PARA FACILITAR CONSULTAS
-- ============================================

-- View completa de recursos de glosas
CREATE OR REPLACE VIEW vw_recursos_glosas_completo AS
SELECT
    rg.id,
    rg.guia_id,
    rg.lote_id,
    rg.clinica_id,
    rg.operadora_registro_ans,
    rg.justificativa,
    rg.motivos_glosa,
    rg.valor_guia,
    rg.status_recurso,
    rg.data_envio_clinica,
    rg.data_recebimento_operadora,
    rg.data_solicitacao_parecer,
    rg.data_recebimento_auditor,
    rg.data_emissao_parecer,
    rg.data_decisao_final,
    rg.auditor_id,

    -- Dados da guia
    g.numero_guia_prestador,
    g.numero_guia_operadora,
    g.numero_carteira,
    g.status_pagamento,

    -- Dados do lote
    l.numero_lote,
    l.competencia,
    l.operadora_nome,

    -- Dados da clínica
    c.nome_fantasia as clinica_nome,

    -- Dados do auditor
    a.nome as auditor_nome,
    a.registro_profissional as auditor_registro,

    -- Contadores
    (SELECT COUNT(*) FROM recursos_glosas_documentos WHERE recurso_glosa_id = rg.id) as total_documentos,
    (SELECT COUNT(*) FROM recursos_glosas_historico WHERE recurso_glosa_id = rg.id) as total_historico,
    (SELECT COUNT(*) FROM recursos_glosas_chat WHERE recurso_glosa_id = rg.id AND lida = FALSE) as mensagens_nao_lidas,
    (SELECT COUNT(*) FROM recursos_glosas_pareceres WHERE recurso_glosa_id = rg.id) as total_pareceres,

    rg.created_at,
    rg.updated_at
FROM recursos_glosas rg
LEFT JOIN financeiro_items g ON rg.guia_id = g.id
LEFT JOIN financeiro_lotes l ON rg.lote_id = l.id
LEFT JOIN clinicas c ON rg.clinica_id = c.id
LEFT JOIN auditores a ON rg.auditor_id = a.id;

-- View de estatísticas por clínica
CREATE OR REPLACE VIEW vw_recursos_glosas_stats_clinica AS
SELECT
    clinica_id,
    COUNT(*) as total_recursos,
    SUM(CASE WHEN status_recurso = 'pendente' THEN 1 ELSE 0 END) as pendentes,
    SUM(CASE WHEN status_recurso IN ('em_analise_operadora', 'solicitado_parecer', 'em_analise_auditor', 'parecer_emitido') THEN 1 ELSE 0 END) as em_analise,
    SUM(CASE WHEN status_recurso = 'deferido' THEN 1 ELSE 0 END) as deferidos,
    SUM(CASE WHEN status_recurso = 'indeferido' THEN 1 ELSE 0 END) as indeferidos,
    SUM(valor_guia) as valor_total_recursos,
    SUM(CASE WHEN status_recurso = 'deferido' THEN valor_guia ELSE 0 END) as valor_deferido,
    SUM(CASE WHEN status_recurso = 'indeferido' THEN valor_guia ELSE 0 END) as valor_indeferido
FROM recursos_glosas
GROUP BY clinica_id;

-- View de estatísticas por auditor
CREATE OR REPLACE VIEW vw_recursos_glosas_stats_auditor AS
SELECT
    auditor_id,
    COUNT(*) as total_analises,
    SUM(CASE WHEN status_recurso = 'em_analise_auditor' THEN 1 ELSE 0 END) as pendentes_analise,
    SUM(CASE WHEN status_recurso IN ('parecer_emitido', 'deferido', 'indeferido') THEN 1 ELSE 0 END) as concluidas,
    AVG(TIMESTAMPDIFF(HOUR, data_recebimento_auditor, data_emissao_parecer)) as tempo_medio_horas
FROM recursos_glosas
WHERE auditor_id IS NOT NULL
GROUP BY auditor_id;
