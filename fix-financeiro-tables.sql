-- Script para corrigir estrutura das tabelas financeiras
USE bd_onkhos;

-- 1. Adicionar colunas faltantes na tabela financeiro_lotes
ALTER TABLE financeiro_lotes
ADD COLUMN IF NOT EXISTS tipo_transacao VARCHAR(50) AFTER arquivo_xml,
ADD COLUMN IF NOT EXISTS sequencial_transacao VARCHAR(20) AFTER tipo_transacao,
ADD COLUMN IF NOT EXISTS data_registro_transacao DATE AFTER sequencial_transacao,
ADD COLUMN IF NOT EXISTS hora_registro_transacao TIME AFTER data_registro_transacao,
ADD COLUMN IF NOT EXISTS cnpj_prestador VARCHAR(20) AFTER hora_registro_transacao,
ADD COLUMN IF NOT EXISTS nome_prestador VARCHAR(255) AFTER cnpj_prestador,
ADD COLUMN IF NOT EXISTS registro_ans VARCHAR(10) AFTER nome_prestador,
ADD COLUMN IF NOT EXISTS padrao_tiss VARCHAR(10) AFTER registro_ans,
ADD COLUMN IF NOT EXISTS hash_lote VARCHAR(50) AFTER padrao_tiss,
ADD COLUMN IF NOT EXISTS cnes VARCHAR(10) AFTER hash_lote,
ADD COLUMN IF NOT EXISTS data_processamento TIMESTAMP NULL AFTER cnes,
ADD COLUMN IF NOT EXISTS usuario_processamento_id INT NULL AFTER data_processamento,
ADD COLUMN IF NOT EXISTS status_processamento ENUM('processando', 'concluido', 'erro') DEFAULT 'processando' AFTER usuario_processamento_id,
ADD COLUMN IF NOT EXISTS erro_processamento TEXT NULL AFTER status_processamento,
ADD COLUMN IF NOT EXISTS total_procedimentos DECIMAL(12,2) DEFAULT 0.00 AFTER erro_processamento,
ADD COLUMN IF NOT EXISTS total_medicamentos DECIMAL(12,2) DEFAULT 0.00 AFTER total_procedimentos,
ADD COLUMN IF NOT EXISTS total_materiais DECIMAL(12,2) DEFAULT 0.00 AFTER total_medicamentos,
ADD COLUMN IF NOT EXISTS total_taxas DECIMAL(12,2) DEFAULT 0.00 AFTER total_materiais;

-- 2. Criar índices adicionais se não existirem
CREATE INDEX IF NOT EXISTS idx_cnpj_prestador ON financeiro_lotes(cnpj_prestador);
CREATE INDEX IF NOT EXISTS idx_registro_ans ON financeiro_lotes(registro_ans);
CREATE INDEX IF NOT EXISTS idx_data_processamento ON financeiro_lotes(data_processamento);

-- 3. Atualizar status de processamento dos lotes existentes
UPDATE financeiro_lotes
SET status_processamento = 'concluido'
WHERE status_processamento = 'processando'
  AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE);

-- 4. Verificar estrutura final
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'bd_onkhos'
  AND TABLE_NAME = 'financeiro_lotes'
ORDER BY ORDINAL_POSITION;

SELECT 'Estrutura da tabela financeiro_lotes atualizada com sucesso!' AS Status;
