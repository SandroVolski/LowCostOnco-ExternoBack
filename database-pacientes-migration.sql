-- Migração de campos para Pacientes_Clinica
-- Requisitos: MySQL 8+

START TRANSACTION;

-- 1) Novas colunas (aditivas e compatíveis)
ALTER TABLE Pacientes_Clinica
  ADD COLUMN IF NOT EXISTS plano_saude VARCHAR(120) NULL AFTER telefone_responsavel,
  ADD COLUMN IF NOT EXISTS abrangencia VARCHAR(50) NULL AFTER plano_saude,
  ADD COLUMN IF NOT EXISTS numero_carteirinha VARCHAR(50) NULL AFTER abrangencia,
  ADD COLUMN IF NOT EXISTS stage VARCHAR(20) NULL AFTER Cid_Diagnostico,
  ADD COLUMN IF NOT EXISTS treatment VARCHAR(120) NULL AFTER stage,
  ADD COLUMN IF NOT EXISTS peso DECIMAL(5,2) NULL AFTER treatment,
  ADD COLUMN IF NOT EXISTS altura DECIMAL(5,2) NULL AFTER peso,
  ADD COLUMN IF NOT EXISTS setor_prestador VARCHAR(50) NULL AFTER altura,
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome VARCHAR(120) NULL AFTER setor_prestador,
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone VARCHAR(20) NULL AFTER contato_emergencia_nome,
  ADD COLUMN IF NOT EXISTS endereco_rua VARCHAR(255) NULL AFTER endereco,
  ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20) NULL AFTER endereco_rua,
  ADD COLUMN IF NOT EXISTS endereco_complemento VARCHAR(100) NULL AFTER endereco_numero,
  ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(100) NULL AFTER endereco_complemento,
  ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(100) NULL AFTER endereco_bairro,
  ADD COLUMN IF NOT EXISTS endereco_estado CHAR(2) NULL AFTER endereco_cidade,
  ADD COLUMN IF NOT EXISTS endereco_cep VARCHAR(9) NULL AFTER endereco_estado;

-- 2) Ajustar tipo de Data_Primeira_Solicitacao para DATE (se já não for)
ALTER TABLE Pacientes_Clinica
  MODIFY COLUMN Data_Primeira_Solicitacao DATE;

-- 3) Padronizar STATUS para novos valores usando ENUM (mantendo dados existentes)
-- Primeiro, garantir que valores atuais sejam compatíveis (feito no backfill)
-- Depois, ajustar o tipo da coluna (assumindo que a coluna já existe)
ALTER TABLE Pacientes_Clinica
  MODIFY COLUMN status ENUM('Em tratamento','Em remissão','Alta','Óbito') NOT NULL DEFAULT 'Em tratamento';

-- 4) Índices úteis (opcional)
CREATE INDEX IF NOT EXISTS idx_pacientes_codigo ON Pacientes_Clinica (Codigo);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON Pacientes_Clinica (cpf);
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON Pacientes_Clinica (Paciente_Nome);

COMMIT;

-- 5) Opcional: VIEW de compatibilidade para endereço composto
-- Esta view expõe um campo calculado `endereco_composto` a partir das partes, caindo em `endereco` legado se necessário
DROP VIEW IF EXISTS Pacientes_Clinica_View;
CREATE VIEW Pacientes_Clinica_View AS
SELECT 
  p.*,
  COALESCE(
    NULLIF(p.endereco, ''),
    TRIM(
      CONCAT_WS(', ',
        NULLIF(TRIM(p.endereco_rua), ''),
        CASE WHEN NULLIF(TRIM(p.endereco_numero), '') IS NOT NULL THEN CONCAT('Nº ', TRIM(p.endereco_numero)) END,
        NULLIF(TRIM(p.endereco_complemento), ''),
        NULLIF(TRIM(p.endereco_bairro), ''),
        CASE 
          WHEN NULLIF(TRIM(p.endereco_cidade), '') IS NOT NULL OR NULLIF(TRIM(p.endereco_estado), '') IS NOT NULL
          THEN CONCAT(TRIM(COALESCE(p.endereco_cidade, '')), CASE WHEN NULLIF(TRIM(p.endereco_estado), '') IS NOT NULL THEN CONCAT(' - ', TRIM(p.endereco_estado)) END)
        END,
        NULLIF(TRIM(p.endereco_cep), '')
      )
    )
  ) AS endereco_composto
FROM Pacientes_Clinica p;

-- 6) Opcional: triggers para manter `endereco` legado sincronizado quando não for enviado
-- Observação: Necessita permissão para criar TRIGGER
DELIMITER $$
DROP TRIGGER IF EXISTS trg_pacientes_endereco_ins $$
CREATE TRIGGER trg_pacientes_endereco_ins
BEFORE INSERT ON Pacientes_Clinica
FOR EACH ROW
BEGIN
  IF (NEW.endereco IS NULL OR TRIM(NEW.endereco) = '') THEN
    SET NEW.endereco = TRIM(
      CONCAT_WS(', ',
        NULLIF(TRIM(NEW.endereco_rua), ''),
        CASE WHEN NULLIF(TRIM(NEW.endereco_numero), '') IS NOT NULL THEN CONCAT('Nº ', TRIM(NEW.endereco_numero)) END,
        NULLIF(TRIM(NEW.endereco_complemento), ''),
        NULLIF(TRIM(NEW.endereco_bairro), ''),
        CASE 
          WHEN NULLIF(TRIM(NEW.endereco_cidade), '') IS NOT NULL OR NULLIF(TRIM(NEW.endereco_estado), '') IS NOT NULL
          THEN CONCAT(TRIM(COALESCE(NEW.endereco_cidade, '')), CASE WHEN NULLIF(TRIM(NEW.endereco_estado), '') IS NOT NULL THEN CONCAT(' - ', TRIM(NEW.endereco_estado)) END)
        END,
        NULLIF(TRIM(NEW.endereco_cep), '')
      )
    );
  END IF;
END $$

DROP TRIGGER IF EXISTS trg_pacientes_endereco_upd $$
CREATE TRIGGER trg_pacientes_endereco_upd
BEFORE UPDATE ON Pacientes_Clinica
FOR EACH ROW
BEGIN
  IF (NEW.endereco IS NULL OR TRIM(NEW.endereco) = '') THEN
    SET NEW.endereco = TRIM(
      CONCAT_WS(', ',
        NULLIF(TRIM(NEW.endereco_rua), ''),
        CASE WHEN NULLIF(TRIM(NEW.endereco_numero), '') IS NOT NULL THEN CONCAT('Nº ', TRIM(NEW.endereco_numero)) END,
        NULLIF(TRIM(NEW.endereco_complemento), ''),
        NULLIF(TRIM(NEW.endereco_bairro), ''),
        CASE 
          WHEN NULLIF(TRIM(NEW.endereco_cidade), '') IS NOT NULL OR NULLIF(TRIM(NEW.endereco_estado), '') IS NOT NULL
          THEN CONCAT(TRIM(COALESCE(NEW.endereco_cidade, '')), CASE WHEN NULLIF(TRIM(NEW.endereco_estado), '') IS NOT NULL THEN CONCAT(' - ', TRIM(NEW.endereco_estado)) END)
        END,
        NULLIF(TRIM(NEW.endereco_cep), '')
      )
    );
  END IF;
END $$
DELIMITER ; 