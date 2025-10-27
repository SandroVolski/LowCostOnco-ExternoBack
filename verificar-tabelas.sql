USE bd_onkhos;

-- Verificar se as tabelas existem
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'bd_onkhos' 
  AND TABLE_NAME LIKE 'procedimentos%';

-- Se as tabelas existirem, mostrar estrutura
SHOW CREATE TABLE procedimentos;
SHOW CREATE TABLE procedimentos_operadora;

