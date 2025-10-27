# 📋 Guia de Execução - Múltiplos Telefones e Emails

## 🎯 Passos para Implementar

### **Passo 1: Adicionar as Novas Colunas**

Execute este comando no seu MySQL:

```sql
ALTER TABLE Clinicas 
ADD COLUMN telefones JSON NULL COMMENT 'Array de telefones em formato JSON' AFTER telefone,
ADD COLUMN emails JSON NULL COMMENT 'Array de emails em formato JSON' AFTER email;
```

**Ou execute o arquivo:**
```bash
mysql -u seu_usuario -p seu_banco < database-add-multiple-contacts.sql
```

### **Passo 2: Migrar Dados Existentes**

Execute este comando para migrar os dados existentes:

```sql
-- Migrar telefones existentes
UPDATE Clinicas 
SET telefones = JSON_ARRAY(telefone)
WHERE telefone IS NOT NULL AND telefone != '' AND telefones IS NULL;

-- Migrar emails existentes
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
```

**Ou execute o arquivo:**
```bash
mysql -u seu_usuario -p seu_banco < migrate-existing-contacts.sql
```

### **Passo 3: Verificar a Estrutura**

Execute para verificar se tudo foi criado corretamente:

```sql
DESCRIBE Clinicas;
```

**Resultado esperado:**
```
+------------+--------------+------+-----+---------+----------------+
| Field      | Type         | Null | Key | Default | Extra          |
+------------+--------------+------+-----+---------+----------------+
| id         | int          | NO   | PRI | NULL    | auto_increment |
| nome       | varchar(100) | YES  |     | NULL    |                |
| codigo     | varchar(50)  | YES  |     | NULL    |                |
| cnpj       | varchar(20)  | YES  |     | NULL    |                |
| endereco   | text         | YES  |     | NULL    |                |
| cidade     | varchar(100) | YES  |     | NULL    |                |
| estado     | varchar(2)   | YES  |     | NULL    |                |
| cep        | varchar(10)  | YES  |     | NULL    |                |
| telefone   | varchar(20)  | YES  |     | NULL    |                |
| telefones  | json         | YES  |     | NULL    |                | ← NOVA COLUNA
| email      | varchar(100) | YES  |     | NULL    |                |
| emails     | json         | YES  |     | NULL    |                | ← NOVA COLUNA
| website    | varchar(200) | YES  |     | NULL    |                |
| logo_url   | text         | YES  |     | NULL    |                |
| observacoes| text         | YES  |     | NULL    |                |
| usuario    | varchar(50)  | YES  |     | NULL    |                |
| senha      | varchar(255) | YES  |     | NULL    |                |
| status     | enum(...)    | YES  |     | NULL    |                |
| created_at | timestamp    | YES  |     | NULL    |                |
| updated_at | timestamp    | YES  |     | NULL    |                |
+------------+--------------+------+-----+---------+----------------+
```

### **Passo 4: Verificar Dados Migrados**

Execute para verificar se os dados foram migrados corretamente:

```sql
SELECT 
    id,
    nome,
    telefone as telefone_antigo,
    telefones as telefones_novos,
    email as email_antigo,
    emails as emails_novos
FROM Clinicas 
LIMIT 5;
```

**Exemplo de resultado esperado:**
```
+----+------------------+------------------+------------------------+----------------------+------------------------+
| id | nome             | telefone_antigo  | telefones_novos       | email_antigo         | emails_novos          |
+----+------------------+------------------+------------------------+----------------------+------------------------+
| 1  | Clínica Exemplo | (11) 99999-9999 | ["(11) 99999-9999"]   | contato@clinica.com | ["contato@clinica.com"] |
+----+------------------+------------------+------------------------+----------------------+------------------------+
```

## 🚀 Após Executar os Scripts

### **1. Reiniciar o Servidor**
```bash
npm run dev
```

### **2. Testar a Funcionalidade**
```bash
node test-multiple-contacts.js
```

## ⚠️ Requisitos

- **MySQL 5.7+** (para suporte a JSON)
- **Backup do banco** (recomendado antes de executar)

## 🔍 Troubleshooting

### **Erro: "JSON type not supported"**
- Verifique se seu MySQL é versão 5.7 ou superior
- Execute: `SELECT VERSION();`

### **Erro: "Column already exists"**
- As colunas já foram criadas, pode pular o Passo 1

### **Dados não aparecem migrados**
- Execute novamente o script de migração
- Verifique se há dados nas colunas antigas

## ✅ Verificação Final

Após executar todos os passos, teste com:

```bash
# Teste automatizado
node test-multiple-contacts.js

# Ou teste manual via API
curl http://localhost:3001/api/clinicas/profile
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "clinica": {
      "id": 1,
      "nome": "Sua Clínica",
      "telefones": ["(11) 99999-9999"],
      "emails": ["contato@clinica.com"]
    }
  }
}
``` 