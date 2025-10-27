# 🚀 RECOMENDAÇÕES PARA REESTRUTURAÇÃO DO BANCO DE DADOS
## Sistema de Clínicas - Plano de Migração e Otimização

---

## 📋 **RESUMO EXECUTIVO**

Este documento apresenta um plano detalhado para reestruturação do banco de dados do sistema de clínicas, visando melhorar performance, escalabilidade, segurança e manutenibilidade.

---

## 🎯 **OBJETIVOS DA REESTRUTURAÇÃO**

1. **Performance**: Otimizar consultas e reduzir tempo de resposta
2. **Escalabilidade**: Preparar para crescimento de dados
3. **Segurança**: Implementar melhores práticas de segurança
4. **Manutenibilidade**: Facilitar manutenção e evolução
5. **Backup/Recovery**: Estratégia robusta de backup
6. **Monitoramento**: Melhor observabilidade do sistema

---

## 📊 **ANÁLISE ATUAL**

### **Pontos Fortes:**
✅ Estrutura bem definida com relacionamentos claros  
✅ Sistema de logs implementado  
✅ Pool de conexões configurado  
✅ Triggers e views para compatibilidade  
✅ Índices básicos criados  

### **Pontos de Melhoria:**
❌ Falta de particionamento em tabelas grandes  
❌ Nomenclatura inconsistente (snake_case vs camelCase)  
❌ Campos sensíveis sem criptografia  
❌ Ausência de auditoria completa  
❌ Estrutura de endereços denormalizada  

---

## 🏗️ **PLANO DE REESTRUTURAÇÃO**

### **FASE 1: PREPARAÇÃO E BACKUP**

#### 1.1 Backup Completo
```sql
-- Criar backup completo antes da migração
mysqldump --single-transaction --routines --triggers bd_sistema_clinicas > backup_pre_migracao.sql

-- Backup dos dados críticos separadamente
mysqldump --single-transaction bd_sistema_clinicas Pacientes_Clinica > backup_pacientes.sql
mysqldump --single-transaction bd_sistema_clinicas Solicitacoes_Autorizacao > backup_solicitacoes.sql
```

#### 1.2 Análise de Volume de Dados
```sql
-- Verificar tamanho das tabelas
SELECT 
    table_name AS 'Tabela',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Tamanho (MB)',
    table_rows AS 'Registros'
FROM information_schema.tables 
WHERE table_schema = 'bd_sistema_clinicas'
ORDER BY (data_length + index_length) DESC;
```

#### 1.3 Ambiente de Teste
- Criar ambiente de teste idêntico ao produção
- Executar todas as migrações no teste primeiro
- Validar integridade dos dados

---

### **FASE 2: OTIMIZAÇÃO DE ESTRUTURA**

#### 2.1 Padronização de Nomenclatura
```sql
-- Renomear campos para seguir padrão snake_case consistente
ALTER TABLE Pacientes_Clinica 
  CHANGE Paciente_Nome paciente_nome VARCHAR(255),
  CHANGE Data_Nascimento data_nascimento DATE,
  CHANGE Data_Primeira_Solicitacao data_primeira_solicitacao DATE,
  CHANGE Cid_Diagnostico cid_diagnostico VARCHAR(50),
  CHANGE Codigo codigo VARCHAR(50);

-- Aplicar para todas as tabelas inconsistentes
```

#### 2.2 Normalização de Endereços
```sql
-- Criar tabela de endereços normalizada
CREATE TABLE enderecos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado CHAR(2),
  cep VARCHAR(9),
  tipo ENUM('residencial', 'comercial', 'correspondencia') DEFAULT 'residencial',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_cep (cep),
  INDEX idx_cidade_estado (cidade, estado)
);

-- Tabela de relacionamento paciente-endereços
CREATE TABLE paciente_enderecos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  endereco_id INT NOT NULL,
  tipo ENUM('residencial', 'comercial', 'correspondencia') DEFAULT 'residencial',
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (paciente_id) REFERENCES Pacientes_Clinica(id) ON DELETE CASCADE,
  FOREIGN KEY (endereco_id) REFERENCES enderecos(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_paciente_tipo (paciente_id, tipo),
  INDEX idx_paciente_id (paciente_id),
  INDEX idx_endereco_id (endereco_id)
);
```

#### 2.3 Auditoria Completa
```sql
-- Tabela de auditoria genérica
CREATE TABLE auditoria (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tabela VARCHAR(64) NOT NULL,
  registro_id INT NOT NULL,
  operacao ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  dados_anteriores JSON,
  dados_novos JSON,
  usuario_id INT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tabela_registro (tabela, registro_id),
  INDEX idx_usuario_timestamp (usuario_id, timestamp),
  INDEX idx_timestamp (timestamp),
  
  FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);
```

---

### **FASE 3: PARTICIONAMENTO E PERFORMANCE**

#### 3.1 Particionamento de Logs
```sql
-- Particionar system_logs por mês
ALTER TABLE system_logs PARTITION BY RANGE (YEAR(timestamp) * 100 + MONTH(timestamp)) (
    PARTITION p202401 VALUES LESS THAN (202402),
    PARTITION p202402 VALUES LESS THAN (202403),
    PARTITION p202403 VALUES LESS THAN (202404),
    -- ... continuar para 12 meses
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Script para criar partições automaticamente
DELIMITER $$
CREATE PROCEDURE CreateLogPartitions()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE partition_name VARCHAR(20);
    DECLARE partition_value INT;
    DECLARE current_date_val INT;
    
    SET current_date_val = YEAR(NOW()) * 100 + MONTH(NOW());
    
    -- Criar partições para os próximos 6 meses
    SET @i = 0;
    WHILE @i < 6 DO
        SET partition_value = current_date_val + @i;
        IF @i = 0 THEN
            SET partition_value = partition_value + 1;
        END IF;
        
        SET partition_name = CONCAT('p', partition_value);
        
        SET @sql = CONCAT('ALTER TABLE system_logs ADD PARTITION (PARTITION ', 
                         partition_name, ' VALUES LESS THAN (', partition_value + 1, '))');
        
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SET @i = @i + 1;
    END WHILE;
END$$
DELIMITER ;
```

#### 3.2 Índices Compostos Otimizados
```sql
-- Pacientes - consultas frequentes
CREATE INDEX idx_pacientes_clinica_status ON Pacientes_Clinica (clinica_id, status, data_nascimento);
CREATE INDEX idx_pacientes_operadora_data ON Pacientes_Clinica (Operadora, data_primeira_solicitacao);
CREATE INDEX idx_pacientes_nome_codigo ON Pacientes_Clinica (paciente_nome, codigo);

-- Solicitações - relatórios e dashboards
CREATE INDEX idx_solicitacoes_clinica_data_status ON Solicitacoes_Autorizacao (clinica_id, data_solicitacao, status);
CREATE INDEX idx_solicitacoes_paciente_data ON Solicitacoes_Autorizacao (paciente_id, data_solicitacao);
CREATE INDEX idx_solicitacoes_status_data ON Solicitacoes_Autorizacao (status, created_at);

-- Logs - consultas de monitoramento
CREATE INDEX idx_logs_level_timestamp ON system_logs (level, timestamp);
CREATE INDEX idx_logs_category_endpoint ON system_logs (category, endpoint);
CREATE INDEX idx_logs_user_timestamp ON system_logs (user_id, timestamp);
```

#### 3.3 Arquivamento de Dados Históricos
```sql
-- Tabela de arquivo para logs antigos
CREATE TABLE system_logs_archive LIKE system_logs;

-- Procedure para arquivamento automático
DELIMITER $$
CREATE PROCEDURE ArchiveOldLogs(IN days_to_keep INT)
BEGIN
    DECLARE archive_date DATE;
    SET archive_date = DATE_SUB(CURDATE(), INTERVAL days_to_keep DAY);
    
    -- Mover logs antigos para arquivo
    INSERT INTO system_logs_archive 
    SELECT * FROM system_logs 
    WHERE timestamp < archive_date;
    
    -- Remover logs antigos da tabela principal
    DELETE FROM system_logs 
    WHERE timestamp < archive_date;
    
    SELECT ROW_COUNT() as logs_arquivados;
END$$
DELIMITER ;

-- Agendar execução mensal
-- CREATE EVENT ev_archive_logs
-- ON SCHEDULE EVERY 1 MONTH
-- STARTS '2024-02-01 02:00:00'
-- DO CALL ArchiveOldLogs(90);
```

---

### **FASE 4: SEGURANÇA E CRIPTOGRAFIA**

#### 4.1 Criptografia de Dados Sensíveis
```sql
-- Função para criptografar CPF
DELIMITER $$
CREATE FUNCTION encrypt_cpf(cpf_value VARCHAR(14))
RETURNS VARBINARY(255)
READS SQL DATA
DETERMINISTIC
BEGIN
    RETURN AES_ENCRYPT(cpf_value, 'sua_chave_secreta_aqui');
END$$

CREATE FUNCTION decrypt_cpf(encrypted_cpf VARBINARY(255))
RETURNS VARCHAR(14)
READS SQL DATA
DETERMINISTIC
BEGIN
    RETURN AES_DECRYPT(encrypted_cpf, 'sua_chave_secreta_aqui');
END$$
DELIMITER ;

-- Migrar CPFs existentes
ALTER TABLE Pacientes_Clinica ADD COLUMN cpf_encrypted VARBINARY(255);
UPDATE Pacientes_Clinica SET cpf_encrypted = encrypt_cpf(cpf) WHERE cpf IS NOT NULL;
-- Após validação: ALTER TABLE Pacientes_Clinica DROP COLUMN cpf;
-- ALTER TABLE Pacientes_Clinica CHANGE cpf_encrypted cpf VARBINARY(255);
```

#### 4.2 Controle de Acesso Granular
```sql
-- Criar usuários específicos por função
CREATE USER 'app_read'@'%' IDENTIFIED BY 'senha_forte_read';
CREATE USER 'app_write'@'%' IDENTIFIED BY 'senha_forte_write';
CREATE USER 'app_admin'@'%' IDENTIFIED BY 'senha_forte_admin';

-- Permissões granulares
GRANT SELECT ON bd_sistema_clinicas.* TO 'app_read'@'%';

GRANT SELECT, INSERT, UPDATE ON bd_sistema_clinicas.Pacientes_Clinica TO 'app_write'@'%';
GRANT SELECT, INSERT, UPDATE ON bd_sistema_clinicas.Solicitacoes_Autorizacao TO 'app_write'@'%';
GRANT SELECT, INSERT, UPDATE ON bd_sistema_clinicas.notificacoes TO 'app_write'@'%';

GRANT ALL PRIVILEGES ON bd_sistema_clinicas.* TO 'app_admin'@'%';
```

---

### **FASE 5: MONITORAMENTO E OBSERVABILIDADE**

#### 5.1 Métricas de Performance
```sql
-- View para monitoramento de performance
CREATE VIEW v_performance_metrics AS
SELECT 
    DATE(timestamp) as data,
    AVG(response_time) as tempo_resposta_medio,
    MAX(response_time) as tempo_resposta_maximo,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN level = 'error' THEN 1 END) as total_errors,
    COUNT(CASE WHEN response_time > 1000 THEN 1 END) as requests_lentas
FROM system_logs 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(timestamp)
ORDER BY data DESC;

-- View para monitoramento de uso por tabela
CREATE VIEW v_table_usage AS
SELECT 
    table_name as tabela,
    table_rows as registros,
    ROUND((data_length + index_length) / 1024 / 1024, 2) as tamanho_mb,
    ROUND(data_length / 1024 / 1024, 2) as dados_mb,
    ROUND(index_length / 1024 / 1024, 2) as indices_mb
FROM information_schema.tables 
WHERE table_schema = 'bd_sistema_clinicas'
ORDER BY (data_length + index_length) DESC;
```

#### 5.2 Alertas Automáticos
```sql
-- Procedure para verificar saúde do sistema
DELIMITER $$
CREATE PROCEDURE CheckSystemHealth()
BEGIN
    DECLARE error_count INT;
    DECLARE slow_query_count INT;
    DECLARE disk_usage_mb DECIMAL(10,2);
    
    -- Verificar erros nas últimas 24h
    SELECT COUNT(*) INTO error_count
    FROM system_logs 
    WHERE level = 'error' 
    AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    -- Verificar queries lentas
    SELECT COUNT(*) INTO slow_query_count
    FROM system_logs 
    WHERE response_time > 5000 
    AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
    -- Verificar uso de disco
    SELECT SUM(ROUND((data_length + index_length) / 1024 / 1024, 2)) INTO disk_usage_mb
    FROM information_schema.tables 
    WHERE table_schema = 'bd_sistema_clinicas';
    
    -- Gerar alertas se necessário
    IF error_count > 50 THEN
        INSERT INTO system_logs (level, category, message, details)
        VALUES ('warn', 'system', 'Alto número de erros detectado', 
                CONCAT('Erros nas últimas 24h: ', error_count));
    END IF;
    
    IF slow_query_count > 10 THEN
        INSERT INTO system_logs (level, category, message, details)
        VALUES ('warn', 'performance', 'Queries lentas detectadas', 
                CONCAT('Queries >5s na última hora: ', slow_query_count));
    END IF;
    
    IF disk_usage_mb > 10240 THEN -- 10GB
        INSERT INTO system_logs (level, category, message, details)
        VALUES ('warn', 'system', 'Alto uso de disco detectado', 
                CONCAT('Uso atual: ', disk_usage_mb, ' MB'));
    END IF;
    
    SELECT 'Health check completed' as status;
END$$
DELIMITER ;
```

---

### **FASE 6: BACKUP E RECOVERY**

#### 6.1 Estratégia de Backup
```bash
#!/bin/bash
# Script de backup automatizado

DB_NAME="bd_sistema_clinicas"
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup completo diário
mysqldump --single-transaction --routines --triggers \
  --master-data=2 --flush-logs \
  $DB_NAME > $BACKUP_DIR/full_backup_$DATE.sql

# Backup incremental (binlog)
mysqlbinlog --start-datetime="$(date -d '1 day ago' +%Y-%m-%d\ %H:%M:%S)" \
  /var/lib/mysql/mysql-bin.* > $BACKUP_DIR/incremental_$DATE.sql

# Compressão
gzip $BACKUP_DIR/full_backup_$DATE.sql
gzip $BACKUP_DIR/incremental_$DATE.sql

# Limpeza de backups antigos (manter 30 dias)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Verificação de integridade
gunzip -t $BACKUP_DIR/full_backup_$DATE.sql.gz
if [ $? -eq 0 ]; then
    echo "Backup $DATE verificado com sucesso"
else
    echo "ERRO: Backup $DATE corrompido"
    exit 1
fi
```

#### 6.2 Procedimento de Recovery
```sql
-- Procedure para recuperação point-in-time
DELIMITER $$
CREATE PROCEDURE RecoveryPointInTime(IN recovery_date DATETIME)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Log da operação de recovery
    INSERT INTO system_logs (level, category, message, details)
    VALUES ('info', 'system', 'Iniciando recovery point-in-time', 
            CONCAT('Data de recovery: ', recovery_date));
    
    -- Aqui seriam executados os comandos de recovery
    -- (este é um exemplo conceitual)
    
    COMMIT;
    
    INSERT INTO system_logs (level, category, message, details)
    VALUES ('info', 'system', 'Recovery concluído com sucesso', 
            CONCAT('Data de recovery: ', recovery_date));
END$$
DELIMITER ;
```

---

## 📅 **CRONOGRAMA DE IMPLEMENTAÇÃO**

### **Semana 1-2: Preparação**
- [ ] Setup do ambiente de teste
- [ ] Backup completo do sistema atual
- [ ] Análise detalhada de performance atual
- [ ] Documentação dos processos críticos

### **Semana 3-4: Otimização de Estrutura**
- [ ] Padronização de nomenclatura
- [ ] Normalização de endereços
- [ ] Implementação de auditoria
- [ ] Testes de integridade

### **Semana 5-6: Performance e Particionamento**
- [ ] Implementação de particionamento
- [ ] Criação de índices otimizados
- [ ] Setup de arquivamento automático
- [ ] Testes de carga

### **Semana 7-8: Segurança**
- [ ] Implementação de criptografia
- [ ] Configuração de usuários granulares
- [ ] Auditoria de segurança
- [ ] Testes de penetração

### **Semana 9-10: Monitoramento**
- [ ] Setup de métricas de performance
- [ ] Implementação de alertas
- [ ] Dashboard de monitoramento
- [ ] Documentação operacional

### **Semana 11-12: Backup e Produção**
- [ ] Implementação de backup automatizado
- [ ] Testes de recovery
- [ ] Migração para produção
- [ ] Monitoramento pós-migração

---

## 🔍 **VALIDAÇÃO E TESTES**

### **Checklist de Validação:**
- [ ] Integridade referencial mantida
- [ ] Performance melhorou ou manteve-se igual
- [ ] Backups funcionando corretamente
- [ ] Logs de auditoria capturando mudanças
- [ ] Alertas funcionando
- [ ] Aplicação funcionando normalmente
- [ ] Usuários conseguem acessar dados

### **Testes de Carga:**
```sql
-- Script para gerar carga de teste
DELIMITER $$
CREATE PROCEDURE GenerateTestLoad(IN iterations INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE random_clinica_id INT;
    DECLARE random_paciente_name VARCHAR(255);
    
    WHILE i < iterations DO
        SET random_clinica_id = FLOOR(1 + RAND() * 10);
        SET random_paciente_name = CONCAT('Paciente Teste ', i);
        
        INSERT INTO Pacientes_Clinica (clinica_id, paciente_nome, data_nascimento, sexo, cid_diagnostico, stage, treatment, status)
        VALUES (random_clinica_id, random_paciente_name, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365 * 80) DAY), 
                IF(RAND() > 0.5, 'Masculino', 'Feminino'), 'C50.9', 'I', 'Quimioterapia', 'Em tratamento');
        
        SET i = i + 1;
    END WHILE;
    
    SELECT CONCAT(iterations, ' registros de teste inseridos') as resultado;
END$$
DELIMITER ;
```

---

## 💰 **ESTIMATIVA DE RECURSOS**

### **Recursos Humanos:**
- **DBA Sênior**: 60 horas
- **Desenvolvedor Backend**: 40 horas  
- **DevOps**: 20 horas
- **Tester**: 20 horas

### **Recursos de Infraestrutura:**
- **Ambiente de Teste**: Servidor equivalente ao produção
- **Backup Storage**: Espaço adicional para backups
- **Monitoring Tools**: Ferramentas de monitoramento

### **Timeline Total:** 12 semanas
### **Risco:** Médio (com ambiente de teste adequado)

---

## 🚨 **PLANO DE CONTINGÊNCIA**

### **Se algo der errado:**
1. **Rollback imediato** para backup pré-migração
2. **Análise de logs** para identificar problema
3. **Correção em ambiente de teste**
4. **Nova tentativa de migração**

### **Pontos de Verificação:**
- ✅ Após cada fase, validar funcionamento
- ✅ Manter backups de cada etapa
- ✅ Documentar todos os problemas encontrados
- ✅ Ter equipe de plantão durante migração

---

## 📞 **CONTATOS DE EMERGÊNCIA**

Durante a migração, manter equipe disponível:
- **DBA Principal**: Para questões de banco
- **Dev Lead**: Para questões de aplicação  
- **DevOps**: Para questões de infraestrutura
- **Product Owner**: Para decisões de negócio

---

## ✅ **CONCLUSÃO**

Esta reestruturação transformará o banco de dados atual em uma solução mais robusta, segura e escalável. O investimento em tempo e recursos será compensado pela melhoria significativa em performance, segurança e manutenibilidade do sistema.

**Próximos passos:**
1. Aprovação do plano pela equipe técnica
2. Alocação de recursos necessários
3. Setup do ambiente de teste
4. Início da implementação conforme cronograma
