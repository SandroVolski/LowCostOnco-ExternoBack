-- Script para atualizar email do usuário para fins de teste
-- IMPORTANTE: O email de login está na tabela 'usuarios' ou 'Usuarios', não em 'clinicas'

-- Verificar qual tabela existe e qual email está cadastrado
SELECT 'Verificando email atual na tabela usuarios:' as info;
SELECT id, nome, email, username, status, clinica_id 
FROM usuarios 
WHERE email LIKE '%sandro%' OR username LIKE '%sandro%'
LIMIT 5;

-- Se a tabela for 'Usuarios' (maiúsculo), use esta query:
-- SELECT id, nome, email, username, status, clinica_id 
-- FROM Usuarios 
-- WHERE email LIKE '%sandro%' OR username LIKE '%sandro%'
-- LIMIT 5;

-- ============================================
-- ATUALIZAR EMAIL DO USUÁRIO
-- ============================================
-- Substitua o ID pelo ID real do usuário encontrado acima
-- Substitua o email pelo email de teste válido

-- Opção 1: Atualizar por ID (mais seguro)
-- UPDATE usuarios 
-- SET email = 'sandroeduardopradovolski@gmail.com',
--     updated_at = NOW()
-- WHERE id = [ID_DO_USUARIO];

-- Opção 2: Atualizar por email antigo
UPDATE usuarios 
SET email = 'sandroeduardopradovolski@gmail.com',
    updated_at = NOW()
WHERE email = 'clinica.sandro.eduardo@onkhos.com';

-- Se a tabela for 'Usuarios' (maiúsculo), use:
-- UPDATE Usuarios 
-- SET email = 'sandroeduardopradovolski@gmail.com',
--     updated_at = NOW()
-- WHERE email = 'clinica.sandro.eduardo@onkhos.com';

-- Verificar se foi atualizado
SELECT 'Email atualizado:' as info;
SELECT id, nome, email, username, status 
FROM usuarios 
WHERE email = 'sandroeduardopradovolski@gmail.com';

-- ============================================
-- OBSERVAÇÃO IMPORTANTE
-- ============================================
-- O sistema de recuperação de senha valida se o email termina com:
-- - @onkhos.com
-- - @onkho.com.br
--
-- Se você usar um email Gmail (@gmail.com), a validação vai FALHAR!
--
-- SOLUÇÃO: Atualizar também a validação para aceitar o email de teste
-- OU usar um email temporário que termine com @onkhos.com ou @onkho.com.br

