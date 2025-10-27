-- Backfill de dados para novos campos de Pacientes_Clinica

START TRANSACTION;

-- 1) Data_Primeira_Solicitacao: se nula, usa a menor data de solicitação associada, senão fallback hoje
UPDATE Pacientes_Clinica p
LEFT JOIN (
  SELECT paciente_id, MIN(data_solicitacao) AS primeira
  FROM Solicitacoes_Autorizacao
  WHERE paciente_id IS NOT NULL
  GROUP BY paciente_id
) s ON s.paciente_id = p.id
SET p.Data_Primeira_Solicitacao = COALESCE(s.primeira, CURDATE())
WHERE (p.Data_Primeira_Solicitacao IS NULL OR p.Data_Primeira_Solicitacao = '0000-00-00');

-- 2) Normalização de status (mapeia valores antigos para novos)
UPDATE Pacientes_Clinica
SET status = 'Em tratamento'
WHERE status IS NULL OR status = '' OR status IN ('ativo','ATIVO','tratamento','em_tratamento');

UPDATE Pacientes_Clinica
SET status = 'Alta'
WHERE status IN ('alta','ALTA');

UPDATE Pacientes_Clinica
SET status = 'Óbito'
WHERE status IN ('obito','óbito','OBITO','OBITO');

UPDATE Pacientes_Clinica
SET status = 'Em remissão'
WHERE status IN ('remissao','REMISSAO','em_remissao','remissão');

-- 3) Tentativa simples de extrair CEP do endereço legado se endereco_cep vazio
UPDATE Pacientes_Clinica
SET endereco_cep = REGEXP_SUBSTR(endereco, '[0-9]{5}-[0-9]{3}')
WHERE (endereco_cep IS NULL OR endereco_cep = '') AND endereco REGEXP '[0-9]{5}-[0-9]{3}';

COMMIT; 