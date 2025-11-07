-- Adicionar operadora com registro ANS 412589 se não existir
INSERT IGNORE INTO operadoras (nome, codigo, registroANS, status, created_at, updated_at)
VALUES ('Operadora ANS 412589', '412589', '412589', 'ativo', NOW(), NOW());

-- Verificar operadoras cadastradas
SELECT id, nome, registroANS FROM operadoras ORDER BY id;

