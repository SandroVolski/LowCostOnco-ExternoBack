-- Script para adicionar suporte a múltiplos telefones e emails na tabela Clinicas
-- Execute este script no seu banco de dados MySQL

-- Adicionar colunas para múltiplos telefones e emails
ALTER TABLE Clinicas 
ADD COLUMN telefones JSON NULL COMMENT 'Array de telefones em formato JSON' AFTER telefone,
ADD COLUMN emails JSON NULL COMMENT 'Array de emails em formato JSON' AFTER email;

-- Verificar se as colunas foram criadas
DESCRIBE Clinicas;

-- Exemplo de como os dados ficarão armazenados:
-- telefones: ["(11) 99999-9999", "(11) 88888-8888"]
-- emails: ["contato@clinica.com", "admin@clinica.com"]

-- Comentário: As colunas antigas 'telefone' e 'email' foram mantidas para compatibilidade
-- O sistema irá migrar automaticamente os dados antigos para o novo formato 