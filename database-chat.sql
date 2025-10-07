-- Script para criar as tabelas do sistema de Chat
-- Execute este script no banco de dados principal

-- Tabela de Chats
CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('individual', 'group') NOT NULL DEFAULT 'individual',
    operadora_id INT NULL,
    clinica_id INT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    last_message_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (operadora_id) REFERENCES operadoras(id) ON DELETE CASCADE,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
    FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_chats_operadora (operadora_id),
    INDEX idx_chats_clinica (clinica_id),
    INDEX idx_chats_type (type),
    INDEX idx_chats_updated (updated_at),
    
    -- Constraints
    CONSTRAINT chk_chat_participants CHECK (
        (type = 'individual' AND operadora_id IS NOT NULL AND clinica_id IS NOT NULL) OR
        (type = 'group' AND operadora_id IS NOT NULL)
    )
);

-- Tabela de Participantes dos Chats
CREATE TABLE IF NOT EXISTS chat_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    participant_id INT NOT NULL,
    participant_type ENUM('operadora', 'clinica') NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_message_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Foreign Keys
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_participants_chat (chat_id),
    INDEX idx_participants_user (participant_id, participant_type),
    INDEX idx_participants_active (is_active),
    
    -- Constraint para evitar duplicatas
    UNIQUE KEY unique_participant (chat_id, participant_id, participant_type)
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_type ENUM('operadora', 'clinica') NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file') DEFAULT 'text',
    status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_messages_chat (chat_id),
    INDEX idx_messages_sender (sender_id, sender_type),
    INDEX idx_messages_status (status),
    INDEX idx_messages_created (created_at),
    INDEX idx_messages_chat_created (chat_id, created_at)
);

-- Adicionar foreign key para last_message_id após criar a tabela messages
ALTER TABLE chats 
ADD CONSTRAINT fk_chats_last_message 
FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Adicionar foreign key para last_read_message_id após criar a tabela messages
ALTER TABLE chat_participants 
ADD CONSTRAINT fk_participants_last_read 
FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Inserir dados de exemplo (opcional - para desenvolvimento)
-- Descomente as linhas abaixo se quiser dados de teste

/*
-- Inserir chats de exemplo
INSERT INTO chats (type, operadora_id, clinica_id, name, description) VALUES
('individual', 1, 1, 'Unimed - Clínica OncoLife', 'Chat entre Unimed e Clínica OncoLife'),
('individual', 1, 2, 'Unimed - Centro de Oncologia Avançada', 'Chat entre Unimed e Centro de Oncologia Avançada'),
('group', 1, NULL, 'Grupo Unimed - Todas as Clínicas', 'Chat em grupo da Unimed com todas as clínicas');

-- Inserir participantes
INSERT INTO chat_participants (chat_id, participant_id, participant_type) VALUES
(1, 1, 'operadora'),
(1, 1, 'clinica'),
(2, 1, 'operadora'),
(2, 2, 'clinica'),
(3, 1, 'operadora'),
(3, 1, 'clinica'),
(3, 2, 'clinica');

-- Inserir mensagens de exemplo
INSERT INTO messages (chat_id, sender_id, sender_type, sender_name, content, message_type, status) VALUES
(1, 1, 'operadora', 'Unimed', 'Olá! Temos uma nova atualização no sistema.', 'text', 'sent'),
(1, 1, 'clinica', 'Clínica OncoLife', 'Ok, obrigado pelo aviso. Vamos verificar.', 'text', 'sent'),
(2, 1, 'operadora', 'Unimed', 'Bom dia! Como posso ajudar hoje?', 'text', 'sent'),
(3, 1, 'operadora', 'Unimed', 'Bom dia a todos! Temos uma nova atualização importante.', 'text', 'sent');
*/

-- Views úteis para consultas
CREATE OR REPLACE VIEW chat_summary AS
SELECT 
    c.id,
    c.type,
    c.name,
    c.description,
    c.operadora_id,
    c.clinica_id,
    c.last_message_id,
    m.content as last_message_content,
    m.created_at as last_message_time,
    m.sender_name as last_message_sender,
    c.created_at,
    c.updated_at
FROM chats c
LEFT JOIN messages m ON c.last_message_id = m.id
ORDER BY c.updated_at DESC;

CREATE OR REPLACE VIEW unread_messages_count AS
SELECT 
    cp.chat_id,
    cp.participant_id,
    cp.participant_type,
    COUNT(m.id) as unread_count
FROM chat_participants cp
LEFT JOIN messages m ON cp.chat_id = m.chat_id 
    AND m.sender_id != cp.participant_id 
    AND m.sender_type != cp.participant_type
    AND m.status != 'read'
WHERE cp.is_active = true
GROUP BY cp.chat_id, cp.participant_id, cp.participant_type;

-- Triggers para manter consistência
DELIMITER //

-- Trigger para atualizar updated_at quando uma nova mensagem é inserida
CREATE TRIGGER update_chat_on_new_message
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE chats 
    SET updated_at = CURRENT_TIMESTAMP,
        last_message_id = NEW.id
    WHERE id = NEW.chat_id;
END//

-- Trigger para adicionar automaticamente participantes quando um chat individual é criado
CREATE TRIGGER add_participants_on_individual_chat
AFTER INSERT ON chats
FOR EACH ROW
BEGIN
    IF NEW.type = 'individual' THEN
        -- Adicionar operadora como participante
        INSERT INTO chat_participants (chat_id, participant_id, participant_type)
        VALUES (NEW.id, NEW.operadora_id, 'operadora');
        
        -- Adicionar clínica como participante
        INSERT INTO chat_participants (chat_id, participant_id, participant_type)
        VALUES (NEW.id, NEW.clinica_id, 'clinica');
    END IF;
END//

DELIMITER ;

-- Comentários das tabelas
ALTER TABLE chats COMMENT = 'Tabela de chats entre operadoras e clínicas';
ALTER TABLE chat_participants COMMENT = 'Participantes dos chats';
ALTER TABLE messages COMMENT = 'Mensagens dos chats';

-- Verificar se as tabelas foram criadas corretamente
SHOW TABLES LIKE 'chat%';
SHOW TABLES LIKE 'message%';
