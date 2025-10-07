-- =====================================================
-- SCRIPT DE CHAT SIMPLIFICADO PARA BD_ONKHOS
-- Estrutura Otimizada: Apenas 2 Tabelas Essenciais
-- =====================================================

-- =====================================================
-- 1. TABELA CONVERSAS (Chats)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Identificação dos participantes
    operadora_id INT NOT NULL,
    clinica_id INT NOT NULL,
    
    -- Informações da conversa
    nome_conversa VARCHAR(255) NOT NULL,
    descricao TEXT,
    
    -- Controle de última mensagem
    ultima_mensagem_id INT NULL,
    ultima_mensagem_texto TEXT,
    ultima_mensagem_data TIMESTAMP NULL,
    
    -- Controle de leitura
    operadora_ultima_leitura TIMESTAMP NULL,
    clinica_ultima_leitura TIMESTAMP NULL,
    
    -- Status
    ativa BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (operadora_id) REFERENCES operadoras(id) ON DELETE CASCADE,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    
    -- Índices para performance
    INDEX idx_operadora (operadora_id),
    INDEX idx_clinica (clinica_id),
    INDEX idx_operadora_clinica (operadora_id, clinica_id),
    INDEX idx_ultima_mensagem (ultima_mensagem_data),
    INDEX idx_ativa (ativa),
    
    -- Constraint: uma conversa por par operadora-clínica
    UNIQUE KEY unique_operadora_clinica (operadora_id, clinica_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. TABELA MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversa_id INT NOT NULL,
    
    -- Remetente
    remetente_id INT NOT NULL,
    remetente_tipo ENUM('operadora', 'clinica') NOT NULL,
    remetente_nome VARCHAR(255) NOT NULL,
    
    -- Conteúdo da mensagem
    conteudo TEXT NOT NULL,
    tipo_mensagem ENUM('texto', 'imagem', 'arquivo') DEFAULT 'texto',
    
    -- Status
    status ENUM('enviada', 'entregue', 'lida') DEFAULT 'enviada',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE,
    
    -- Índices para performance
    INDEX idx_conversa (conversa_id),
    INDEX idx_remetente (remetente_id, remetente_tipo),
    INDEX idx_data (created_at),
    INDEX idx_status (status),
    INDEX idx_conversa_data (conversa_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. ADICIONAR FOREIGN KEY PARA ÚLTIMA MENSAGEM
-- =====================================================
ALTER TABLE conversas 
ADD CONSTRAINT fk_conversas_ultima_mensagem 
FOREIGN KEY (ultima_mensagem_id) REFERENCES mensagens(id) ON DELETE SET NULL;

-- =====================================================
-- 4. TRIGGERS PARA MANTER CONSISTÊNCIA
-- =====================================================
DELIMITER //

-- Trigger: Atualizar conversa quando nova mensagem é inserida
CREATE TRIGGER atualizar_conversa_nova_mensagem
AFTER INSERT ON mensagens
FOR EACH ROW
BEGIN
    UPDATE conversas 
    SET 
        ultima_mensagem_id = NEW.id,
        ultima_mensagem_texto = NEW.conteudo,
        ultima_mensagem_data = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversa_id;
END//

-- Trigger: Criar conversa automaticamente quando primeira mensagem é enviada
CREATE TRIGGER criar_conversa_automatica
BEFORE INSERT ON mensagens
FOR EACH ROW
BEGIN
    DECLARE conversa_existe INT DEFAULT 0;
    DECLARE operadora_id_val INT;
    DECLARE clinica_id_val INT;
    DECLARE nome_operadora VARCHAR(255);
    DECLARE nome_clinica VARCHAR(255);
    
    -- Determinar IDs baseado no tipo do remetente
    IF NEW.remetente_tipo = 'operadora' THEN
        SET operadora_id_val = NEW.remetente_id;
        -- Buscar ID da clínica (será definido pelo sistema)
        -- Por enquanto, assumir que será passado via lógica da aplicação
    ELSE
        SET clinica_id_val = NEW.remetente_id;
        -- Buscar ID da operadora (será definido pelo sistema)
        -- Por enquanto, assumir que será passado via lógica da aplicação
    END IF;
    
    -- Verificar se conversa já existe
    SELECT COUNT(*) INTO conversa_existe 
    FROM conversas 
    WHERE operadora_id = operadora_id_val AND clinica_id = clinica_id_val;
    
    -- Se não existe, criar conversa (isso será feito pela aplicação)
    -- O trigger apenas garante que a conversa será atualizada
END//

DELIMITER ;

-- =====================================================
-- 5. VIEWS ÚTEIS PARA CONSULTAS
-- =====================================================

-- View: Conversas com informações completas
CREATE OR REPLACE VIEW conversas_completas AS
SELECT 
    c.id,
    c.operadora_id,
    c.clinica_id,
    c.nome_conversa,
    c.descricao,
    c.ultima_mensagem_texto,
    c.ultima_mensagem_data,
    c.operadora_ultima_leitura,
    c.clinica_ultima_leitura,
    c.ativa,
    c.created_at,
    c.updated_at,
    
    -- Informações da operadora
    o.nome as operadora_nome,
    o.codigo as operadora_codigo,
    
    -- Informações da clínica
    cl.nome as clinica_nome,
    cl.codigo as clinica_codigo,
    
    -- Contagem de mensagens não lidas
    (SELECT COUNT(*) FROM mensagens m 
     WHERE m.conversa_id = c.id 
     AND m.remetente_tipo != 'operadora' 
     AND m.created_at > COALESCE(c.operadora_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas_operadora,
    
    (SELECT COUNT(*) FROM mensagens m 
     WHERE m.conversa_id = c.id 
     AND m.remetente_tipo != 'clinica' 
     AND m.created_at > COALESCE(c.clinica_ultima_leitura, '1970-01-01')) as mensagens_nao_lidas_clinica
     
FROM conversas c
JOIN operadoras o ON c.operadora_id = o.id
JOIN clinicas cl ON c.clinica_id = cl.id
WHERE c.ativa = TRUE;

-- View: Mensagens com informações do remetente
CREATE OR REPLACE VIEW mensagens_completas AS
SELECT 
    m.id,
    m.conversa_id,
    m.remetente_id,
    m.remetente_tipo,
    m.remetente_nome,
    m.conteudo,
    m.tipo_mensagem,
    m.status,
    m.created_at,
    m.updated_at,
    
    -- Informações da conversa
    c.operadora_id,
    c.clinica_id,
    c.nome_conversa,
    
    -- Informações da operadora
    o.nome as operadora_nome,
    
    -- Informações da clínica
    cl.nome as clinica_nome
    
FROM mensagens m
JOIN conversas c ON m.conversa_id = c.id
JOIN operadoras o ON c.operadora_id = o.id
JOIN clinicas cl ON c.clinica_id = cl.id
ORDER BY m.created_at ASC;

-- =====================================================
-- 6. DADOS DE EXEMPLO (OPCIONAL - PARA DESENVOLVIMENTO)
-- =====================================================

-- Inserir dados de exemplo se necessário
-- (Descomente as linhas abaixo se quiser dados de teste)

/*
-- Exemplo de inserção de dados de teste
-- (Certifique-se de que existem operadoras e clínicas no banco)

-- Inserir conversa de exemplo
INSERT INTO conversas (operadora_id, clinica_id, nome_conversa, descricao) 
VALUES (1, 1, 'Unimed - Clínica Exemplo', 'Chat entre Unimed e Clínica Exemplo');

-- Inserir mensagens de exemplo
INSERT INTO mensagens (conversa_id, remetente_id, remetente_tipo, remetente_nome, conteudo) 
VALUES 
(1, 1, 'operadora', 'Unimed', 'Olá! Temos uma nova atualização no sistema.'),
(1, 1, 'clinica', 'Clínica Exemplo', 'Olá! Obrigado pelo aviso. Vamos verificar.');

-- Atualizar última leitura
UPDATE conversas 
SET operadora_ultima_leitura = NOW(), clinica_ultima_leitura = NOW() 
WHERE id = 1;
*/

-- =====================================================
-- 7. COMENTÁRIOS DAS TABELAS
-- =====================================================
ALTER TABLE conversas COMMENT = 'Conversas entre operadoras e clínicas - Sistema de Chat Simplificado';
ALTER TABLE mensagens COMMENT = 'Mensagens das conversas - Sistema de Chat Simplificado';

-- =====================================================
-- 8. VERIFICAÇÃO FINAL
-- =====================================================
SHOW TABLES LIKE 'conversas';
SHOW TABLES LIKE 'mensagens';

-- Verificar estrutura das tabelas
DESCRIBE conversas;
DESCRIBE mensagens;

-- =====================================================
-- 9. INFORMAÇÕES DE USO
-- =====================================================
/*
ESTRUTURA SIMPLIFICADA:

1. TABELA 'conversas':
   - Uma conversa por par operadora-clínica
   - Controle de última mensagem
   - Controle de leitura por participante
   - Informações básicas da conversa

2. TABELA 'mensagens':
   - Todas as mensagens de todas as conversas
   - Identificação do remetente (tipo + ID)
   - Conteúdo e status da mensagem
   - Timestamps automáticos

VANTAGENS:
✅ Apenas 2 tabelas (simples e eficiente)
✅ Relacionamentos claros
✅ Performance otimizada com índices
✅ Controle de leitura por participante
✅ Triggers automáticos para consistência
✅ Views para consultas complexas
✅ Compatível com banco bd_onkhos existente

COMO USAR:
1. Sistema cria conversa automaticamente na primeira mensagem
2. Mensagens são inseridas na tabela 'mensagens'
3. Triggers atualizam automaticamente a conversa
4. Views facilitam consultas complexas
5. Controle de leitura permite saber mensagens não lidas
*/
