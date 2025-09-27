# 🏥 ANÁLISE DETALHADA: CIDs E VÍNCULOS OPERADORAS-CLÍNICAS
## Sistema de Clínicas - Mapeamento Médico e Relacionamentos

---

## 🧬 **SISTEMA DE CIDs (CLASSIFICAÇÃO INTERNACIONAL DE DOENÇAS)**

### **📊 Estrutura Atual dos CIDs**

#### **1. Banco de Dados Externo**
- **Banco:** `bd_servico` (configurável via `EXT_DB_NAME`)
- **Tabela:** `bd_cid10_subcategoria`
- **Campos:**
  - `SUBCAT` → Código do CID (ex: C50.9)
  - `DESCRICAO` → Descrição da doença

#### **2. Integração no Sistema Principal**
```sql
-- Consulta aos CIDs no banco externo
SELECT SUBCAT as codigo, DESCRICAO as descricao 
FROM bd_servico.bd_cid10_subcategoria 
WHERE SUBCAT LIKE ? OR DESCRICAO LIKE ?
```

#### **3. Uso dos CIDs no Sistema**

##### **A. Pacientes (`Pacientes_Clinica`)**
- **Campo:** `Cid_Diagnostico` (VARCHAR(50))
- **Função:** Diagnóstico principal do paciente
- **Exemplo:** "C50.9" (Câncer de mama não especificado)

##### **B. Protocolos (`Protocolos`)**
- **Campo:** `cid` (VARCHAR(50))
- **Função:** CID associado ao protocolo de tratamento
- **Exemplo:** "C50" (Protocolos para câncer de mama)

##### **C. Solicitações (`Solicitacoes_Autorizacao`)**
- **Campo:** `diagnostico_cid` (VARCHAR(50))
- **Função:** CID da solicitação de autorização
- **Exemplo:** "C34.9" (Câncer de pulmão)

---

### **🗺️ MAPEAMENTO CID → ÓRGÃOS DO CORPO HUMANO**

O sistema possui um **mapeamento inteligente** que converte códigos CID em órgãos específicos:

#### **Sistema Nervoso Central**
```javascript
const CID_TO_ORGAN_MAP = {
  // Cérebro
  'C71.0': 'brain', 'C71.1': 'brain', 'C71.9': 'brain',
  'C70.0': 'brain', 'C70.1': 'brain', 'C70.9': 'brain',
  'C72.0': 'brain', 'C72.1': 'brain', 'C72.2': 'brain',
  // ... mais códigos
};
```

#### **Sistema Respiratório**
```javascript
// Pulmões
'C78.0': 'lungs', 'C34.0': 'lungs', 'C34.1': 'lungs',
'C34.2': 'lungs', 'C34.3': 'lungs', 'C34.8': 'lungs',
'C34.9': 'lungs', 'C78.1': 'lungs', 'C78.2': 'lungs',
// ... mais códigos
```

#### **Sistema Digestivo**
```javascript
// Fígado
'C22.0': 'liver', 'C22.1': 'liver', 'C22.2': 'liver',
'C22.3': 'liver', 'C22.4': 'liver', 'C22.7': 'liver',

// Estômago
'C16.0': 'stomach', 'C16.1': 'stomach', 'C16.2': 'stomach',
'C16.3': 'stomach', 'C16.4': 'stomach', 'C16.5': 'stomach',
```

#### **Sistema Urinário**
```javascript
// Rins
'C64': 'kidneys', 'C65': 'kidneys', 'C66': 'kidneys',

// Bexiga
'C67.0': 'bladder', 'C67.1': 'bladder', 'C67.2': 'bladder',
'C67.3': 'bladder', 'C67.4': 'bladder', 'C67.5': 'bladder',
```

#### **Sistema Reprodutor**
```javascript
// Próstata
'C61': 'prostate', 'C77.5': 'prostate',

// Mama
'C50.0': 'breast', 'C50.1': 'breast', 'C50.2': 'breast',
'C50.3': 'breast', 'C50.4': 'breast', 'C50.5': 'breast',
'C50.6': 'breast', 'C50.8': 'breast', 'C50.9': 'breast',
```

---

### **📈 ANÁLISE POR ÓRGÃOS**

#### **Funcionalidade Implementada:**
1. **Agrupamento Automático:** CIDs são automaticamente agrupados por órgão
2. **Contagem de Pacientes:** Por órgão afetado
3. **Protocolos Associados:** Tratamentos mais comuns por órgão
4. **Estatísticas:** Distribuição de casos por sistema corporal

#### **Exemplo de Saída:**
```json
{
  "organId": "breast",
  "organName": "Mama",
  "color": "medical-pink",
  "description": "Carcinomas mamários",
  "patients": 45,
  "cids": [
    { "cid": "C50.9", "count": 30 },
    { "cid": "C50.1", "count": 15 }
  ],
  "protocols": [
    { "protocol": "Adjuvante - Doxorrubicina", "count": 20 },
    { "protocol": "Neoadjuvante - Paclitaxel", "count": 15 }
  ]
}
```

---

## 🏢 **VÍNCULOS OPERADORAS ↔ CLÍNICAS**

### **📋 Estrutura do Relacionamento**

#### **1. Relacionamento Principal**
```sql
-- Tabela Clinicas
CREATE TABLE Clinicas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operadora_id INT,  -- ← FK para Operadoras
  nome VARCHAR(255),
  codigo VARCHAR(50),
  -- ... outros campos
  FOREIGN KEY (operadora_id) REFERENCES Operadoras(id)
);
```

#### **2. Cardinalidade**
- **Operadora (1) ←→ (N) Clínicas**
- Uma operadora pode ter várias clínicas
- Uma clínica pertence a uma operadora (ou nenhuma)

---

### **🔗 IMPLEMENTAÇÃO DO VÍNCULO**

#### **A. Criação de Clínicas**
```typescript
// src/models/Clinica.ts
const insertQuery = `
  INSERT INTO Clinicas (
    nome, codigo, cnpj, endereco, cidade, estado, cep,
    telefones, emails, website, logo_url, observacoes,
    usuario, senha, status, operadora_id  -- ← Campo do vínculo
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const values = [
  // ... outros campos
  (clinicaData as any).operadora_id || null  // ← Vínculo opcional
];
```

#### **B. Busca de Clínicas por Operadora**
```typescript
// src/models/Clinica.ts
static async findByOperadoraId(operadoraId: number): Promise<Clinica[]> {
  const selectQuery = `
    SELECT id, nome, codigo, cnpj, endereco, cidade, estado, cep, 
           telefone, telefones, email, emails, website, logo_url, 
           observacoes, usuario, status, created_at, updated_at
    FROM Clinicas 
    WHERE operadora_id = ? AND status = 'ativo'  -- ← Filtro por operadora
    ORDER BY nome ASC
  `;
  
  const result = await query(selectQuery, [operadoraId]);
  return result;
}
```

#### **C. Relatórios por Operadora**
```typescript
// src/controllers/adminController.ts
const totalClinicas = await query(
  'SELECT COUNT(*) as count FROM Clinicas WHERE operadora_id = ?', 
  [operadora.id]
).then(r => r[0]?.count || 0);

const totalSolicitacoes = await SolicitacaoAutorizacaoModel.countByOperadora(operadora.id || 0);
const totalPacientes = await PacienteModel.countByOperadora(operadora.id || 0);
```

---

### **📊 FLUXO DE DADOS OPERADORA → CLÍNICA → PACIENTE**

```
Operadora (Unimed)
    ↓ (operadora_id)
Clínica A (OncoLife)
    ↓ (clinica_id)
Paciente 1 (João Silva)
    ↓ (paciente_id)
Solicitação de Autorização
    ↓ (diagnostico_cid)
CID C50.9 → Mapeado para → Órgão "Mama"
```

---

### **🎯 CASOS DE USO DO VÍNCULO**

#### **1. Dashboard da Operadora**
- Ver todas as clínicas vinculadas
- Estatísticas consolidadas por operadora
- Performance de cada clínica

#### **2. Relatórios Específicos**
- Pacientes por operadora
- Solicitações por operadora
- Protocolos mais utilizados por operadora

#### **3. Controle de Acesso**
- Usuários da operadora veem apenas suas clínicas
- Dados isolados por operadora
- Auditoria por operadora

---

## 🔍 **ANÁLISE TÉCNICA DETALHADA**

### **📈 Pontos Fortes do Sistema Atual**

#### **CIDs:**
✅ **Integração Externa:** Banco dedicado para catálogos  
✅ **Mapeamento Inteligente:** CID → Órgão automático  
✅ **Análise Médica:** Agrupamento por sistemas corporais  
✅ **Flexibilidade:** Suporte a busca e filtros  
✅ **Padronização:** Uso de códigos CID-10 oficiais  

#### **Operadoras:**
✅ **Relacionamento Claro:** FK bem definida  
✅ **Isolamento de Dados:** Por operadora  
✅ **Relatórios Específicos:** Por operadora  
✅ **Escalabilidade:** Suporte a múltiplas operadoras  

### **⚠️ Pontos de Melhoria Identificados**

#### **CIDs:**
❌ **Mapeamento Hardcoded:** Códigos fixos no código  
❌ **Manutenção Manual:** Novos CIDs precisam de código  
❌ **Cobertura Limitada:** Nem todos os CIDs mapeados  
❌ **Versionamento:** Sem controle de versão dos mapeamentos  

#### **Operadoras:**
❌ **Vínculo Opcional:** Clínicas podem não ter operadora  
❌ **Sem Validação:** Não valida se operadora existe  
❌ **Sem Histórico:** Não rastreia mudanças de operadora  
❌ **Sem Hierarquia:** Não suporta sub-operadoras  

---

## 🚀 **RECOMENDAÇÕES DE MELHORIA**

### **Para o Sistema de CIDs:**

#### **1. Tabela de Mapeamento Dinâmica**
```sql
CREATE TABLE cid_organ_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cid_code VARCHAR(10) NOT NULL,
  organ_id VARCHAR(50) NOT NULL,
  organ_name VARCHAR(100) NOT NULL,
  system_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_cid_organ (cid_code, organ_id),
  INDEX idx_cid_code (cid_code),
  INDEX idx_organ_id (organ_id),
  INDEX idx_system_name (system_name)
);
```

#### **2. API de Mapeamento Dinâmico**
```typescript
// Buscar mapeamento dinamicamente
static async getCidOrganMapping(cid: string): Promise<string | null> {
  const result = await query(
    'SELECT organ_id FROM cid_organ_mapping WHERE cid_code = ? AND is_active = TRUE',
    [cid]
  );
  return result[0]?.organ_id || null;
}
```

#### **3. Sistema de Versionamento**
```sql
CREATE TABLE cid_mapping_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Para o Sistema de Operadoras:**

#### **1. Validação de Vínculos**
```typescript
// Validar se operadora existe antes de vincular
static async validateOperadoraId(operadoraId: number): Promise<boolean> {
  const result = await query(
    'SELECT id FROM Operadoras WHERE id = ? AND status = "ativo"',
    [operadoraId]
  );
  return result.length > 0;
}
```

#### **2. Histórico de Vínculos**
```sql
CREATE TABLE clinica_operadora_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinica_id INT NOT NULL,
  operadora_id INT,
  operacao ENUM('vinculada', 'desvinculada', 'alterada') NOT NULL,
  data_operacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT,
  observacoes TEXT,
  
  FOREIGN KEY (clinica_id) REFERENCES Clinicas(id),
  FOREIGN KEY (operadora_id) REFERENCES Operadoras(id),
  FOREIGN KEY (usuario_id) REFERENCES Usuarios(id)
);
```

#### **3. Hierarquia de Operadoras**
```sql
ALTER TABLE Operadoras 
ADD COLUMN parent_operadora_id INT NULL,
ADD COLUMN nivel INT DEFAULT 1,
ADD FOREIGN KEY (parent_operadora_id) REFERENCES Operadoras(id);
```

---

## 📊 **MÉTRICAS E MONITORAMENTO**

### **Para CIDs:**
- **Cobertura de Mapeamento:** % de CIDs mapeados
- **CIDs Não Mapeados:** Lista de códigos sem órgão
- **Uso por Órgão:** Distribuição de casos
- **Atualizações:** Frequência de mudanças no mapeamento

### **Para Operadoras:**
- **Clínicas por Operadora:** Distribuição
- **Crescimento:** Novas clínicas por período
- **Performance:** Métricas por operadora
- **Mudanças:** Histórico de vínculos

---

## 🎯 **CONCLUSÃO**

O sistema atual possui uma **base sólida** para CIDs e vínculos operadora-clínica, mas pode ser **significativamente melhorado** com:

1. **Mapeamento dinâmico** de CIDs
2. **Validação robusta** de vínculos
3. **Histórico completo** de mudanças
4. **Monitoramento ativo** de cobertura
5. **API flexível** para manutenção

Essas melhorias transformarão o sistema em uma solução mais **robusta**, **escalável** e **manutenível** para o ambiente médico.

---

## 📞 **PRÓXIMOS PASSOS**

1. **Implementar tabela de mapeamento** de CIDs
2. **Migrar mapeamentos hardcoded** para banco
3. **Adicionar validações** de vínculos
4. **Criar histórico** de mudanças
5. **Desenvolver APIs** de manutenção
6. **Implementar monitoramento** de cobertura
