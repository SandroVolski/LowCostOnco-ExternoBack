-- Script para migrar dados existentes de telefone e email para os novos campos
-- Execute este script APÓS executar o database-add-multiple-contacts.sql

-- Migrar telefones existentes para o novo formato
UPDATE Clinicas 
SET telefones = JSON_ARRAY(telefone)
WHERE telefone IS NOT NULL AND telefone != '' AND telefones IS NULL;

-- Migrar emails existentes para o novo formato
UPDATE Clinicas 
SET emails = JSON_ARRAY(email)
WHERE email IS NOT NULL AND email != '' AND emails IS NULL;

-- Para clínicas sem telefone, criar array vazio
UPDATE Clinicas 
SET telefones = JSON_ARRAY()
WHERE telefones IS NULL;

-- Para clínicas sem email, criar array vazio
UPDATE Clinicas 
SET emails = JSON_ARRAY()
WHERE emails IS NULL;

-- Verificar os dados migrados
SELECT 
    id,
    nome,
    telefone as telefone_antigo,
    telefones as telefones_novos,
    email as email_antigo,
    emails as emails_novos
FROM Clinicas 
LIMIT 5;

-- Exemplo de resultado esperado:
-- telefone_antigo: "(11) 99999-9999"
-- telefones_novos: ["(11) 99999-9999"]
-- email_antigo: "contato@clinica.com"
-- emails_novos: ["contato@clinica.com"] 