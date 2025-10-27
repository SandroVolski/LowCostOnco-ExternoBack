# 🗺️ MAPA MENTAL - ESTRUTURA DO BANCO DE DADOS
## Sistema de Clínicas - Análise Completa

---

## 📊 **BANCO DE DADOS PRINCIPAL**
**Nome:** `bd_sistema_clinicas` (configurável via DB_NAME)  
**Tipo:** MySQL  
**Configuração:** Pool de conexões (20 conexões simultâneas)

---

## 🏗️ **TABELAS PRINCIPAIS**

### 1. **👥 USUÁRIOS E AUTENTICAÇÃO**

#### `Usuarios` - Usuários do Sistema
- **Função:** Autenticação e autorização de usuários
- **Campos principais:**
  - `id` (PK)
  - `clinica_id` (FK → Clinicas)
  - `nome`, `email`, `username`
  - `password_hash`
  - `role` ('admin', 'clinica', 'operadora')
  - `status` ('ativo', 'inativo')
  - `last_login`, `created_at`, `updated_at`

#### `OperadoraUsers` - Usuários das Operadoras
- **Função:** Usuários específicos das operadoras de plano de saúde
- **Campos principais:**
  - `id` (PK)
  - `operadora_id` (FK → Operadoras)
  - `nome`, `email`, `username`, `password`
  - `role` ('operadora_admin', 'operadora_user')
  - `status` ('ativo', 'inativo')
  - `created_at`, `updated_at`, `last_login`

---

### 2. **🏥 ENTIDADES PRINCIPAIS**

#### `Operadoras` - Operadoras de Plano de Saúde
- **Função:** Cadastro das operadoras (Unimed, Amil, SulAmérica, etc.)
- **Campos principais:**
  - `id` (PK)
  - `nome`, `codigo`, `cnpj`
  - `status` ('ativo', 'inativo')
  - `created_at`, `updated_at`

#### `Clinicas` - Clínicas Cadastradas
- **Função:** Cadastro das clínicas que utilizam o sistema
- **Campos principais:**
  - `id` (PK)
  - `operadora_id` (FK → Operadoras)
  - `nome`, `codigo`, `cnpj`
  - `endereco`, `cidade`, `estado`, `cep`
  - `telefones` (JSON - múltiplos contatos)
  - `emails` (JSON - múltiplos emails)
  - `website`, `logo_url`, `observacoes`
  - `usuario`, `senha` (login da clínica)
  - `status` ('ativo', 'inativo')
  - `created_at`, `updated_at`

#### `Responsaveis_Tecnicos` - Responsáveis Técnicos das Clínicas
- **Função:** Médicos responsáveis técnicos de cada clínica
- **Campos principais:**
  - `id` (PK)
  - `clinica_id` (FK → Clinicas)
  - `nome`, `crm`, `especialidade`
  - `telefone`, `email`
  - `status` ('ativo', 'inativo')
  - `created_at`, `updated_at`

---

### 3. **👤 PACIENTES**

#### `Pacientes_Clinica` - Pacientes das Clínicas
- **Função:** Cadastro completo de pacientes oncológicos
- **Campos principais:**
  - `id` (PK)
  - `clinica_id` (FK → Clinicas)
  - `Operadora` (FK → Operadoras)
  - `Prestador` (FK → Prestadores)
  - `Paciente_Nome`, `Codigo`, `Data_Nascimento`, `Sexo`
  - `cpf`, `rg`, `telefone`, `email`
  - `Cid_Diagnostico`, `Data_Primeira_Solicitacao`
  - `stage`, `treatment`, `peso`, `altura`
  - `status` ('Em tratamento', 'Em remissão', 'Alta', 'Óbito')
  - **Endereço completo:**
    - `endereco` (legado)
    - `endereco_rua`, `endereco_numero`, `endereco_complemento`
    - `endereco_bairro`, `endereco_cidade`, `endereco_estado`, `endereco_cep`
  - **Plano de saúde:**
    - `plano_saude`, `abrangencia`, `numero_carteirinha`
  - **Responsável:**
    - `nome_responsavel`, `telefone_responsavel`
  - **Emergência:**
    - `contato_emergencia_nome`, `contato_emergencia_telefone`
  - `observacoes`, `created_at`, `updated_at`

#### `Prestadores` - Prestadores de Serviço
- **Função:** Entidades que prestam serviços aos pacientes
- **Campos:** `id`, `nome`

---

### 4. **📋 PROTOCOLOS E MEDICAMENTOS**

#### `Protocolos` - Protocolos de Tratamento
- **Função:** Protocolos médicos padronizados por clínica
- **Campos principais:**
  - `id` (PK)
  - `clinica_id` (FK → Clinicas)
  - `nome`, `descricao`, `cid`
  - `intervalo_ciclos`, `ciclos_previstos`, `linha`
  - `status` ('ativo', 'inativo')
  - `created_at`, `updated_at`

#### `Medicamentos_Protocolo` - Medicamentos dos Protocolos
- **Função:** Medicamentos específicos de cada protocolo
- **Campos principais:**
  - `id` (PK)
  - `protocolo_id` (FK → Protocolos)
  - `nome`, `dose`, `unidade_medida`
  - `via_adm`, `dias_adm`, `frequencia`
  - `observacoes`, `ordem`
  - `created_at`, `updated_at`

---

### 5. **📝 SOLICITAÇÕES DE AUTORIZAÇÃO**

#### `Solicitacoes_Autorizacao` - Solicitações de Autorização
- **Função:** Solicitações de autorização de tratamentos
- **Campos principais:**
  - `id` (PK)
  - `clinica_id` (FK → Clinicas)
  - `paciente_id` (FK → Pacientes_Clinica)
  - **Dados do hospital:**
    - `hospital_nome`, `hospital_codigo`
  - **Dados do cliente:**
    - `cliente_nome`, `cliente_codigo`, `sexo`, `data_nascimento`, `idade`
  - **Dados da solicitação:**
    - `data_solicitacao`, `diagnostico_cid`, `diagnostico_descricao`
    - `local_metastases`
  - **Estadiamento:**
    - `estagio_t`, `estagio_n`, `estagio_m`, `estagio_clinico`
  - **Tratamentos:**
    - `tratamento_cirurgia_radio`
    - `tratamento_quimio_adjuvante`
    - `tratamento_quimio_primeira_linha`
    - `tratamento_quimio_segunda_linha`
  - **Dados clínicos:**
    - `finalidade`, `performance_status`, `siglas`
    - `ciclos_previstos`, `ciclo_atual`
    - `superficie_corporal`, `peso`, `altura`
  - **Medicamentos:**
    - `medicamentos_antineoplasticos`
    - `dose_por_m2`, `dose_total`, `via_administracao`
    - `dias_aplicacao_intervalo`, `medicacoes_associadas`
  - **Assinatura:**
    - `medico_assinatura_crm`
  - **Controle:**
    - `numero_autorizacao`, `observacoes`
    - `status`, `created_at`, `updated_at`

---

### 6. **🔔 SISTEMA DE NOTIFICAÇÕES**

#### `notificacoes` - Notificações do Sistema
- **Função:** Sistema de notificações para clínicas
- **Campos principais:**
  - `id` (PK)
  - `clinica_id` (FK → Clinicas)
  - `tipo` ('patient_created', 'auth_created', 'auth_status')
  - `titulo`, `mensagem`
  - `solicitacao_id` (FK → Solicitacoes_Autorizacao)
  - `paciente_id` (FK → Pacientes_Clinica)
  - `lida` (BOOLEAN)
  - `created_at`

---

### 7. **📊 SISTEMA DE LOGS**

#### `system_logs` - Logs do Sistema
- **Função:** Logs gerais do sistema
- **Campos principais:**
  - `id` (PK)
  - `timestamp`, `level` ('error', 'warn', 'info', 'debug')
  - `category` ('system', 'database', 'api', 'auth', 'user', 'performance', 'security')
  - `message`, `details`, `stack_trace`
  - `user_id` (FK → Usuarios)
  - `user_agent`, `ip_address`
  - `endpoint`, `method`, `status_code`, `response_time`
  - `metadata` (JSON)
  - `created_at`

#### `performance_logs` - Logs de Performance
- **Função:** Monitoramento de performance
- **Campos principais:**
  - `id` (PK)
  - `timestamp`, `operation`, `duration_ms`
  - `resource`, `user_id` (FK → Usuarios)
  - `details` (JSON)
  - `created_at`

#### `security_logs` - Logs de Segurança
- **Função:** Auditoria de segurança
- **Campos principais:**
  - `id` (PK)
  - `timestamp`, `event_type`
  - `user_id` (FK → Usuarios)
  - `ip_address`, `user_agent`, `details`
  - `risk_level` ('low', 'medium', 'high', 'critical')
  - `created_at`

---

## 🔗 **BANCO DE DADOS EXTERNO**

### **Banco:** `bd_servico` (configurável via EXT_DB_NAME)

#### `dPrincipioativo` - Princípios Ativos
- **Função:** Catálogo de princípios ativos de medicamentos
- **Campo:** `PrincipioAtivo`

#### `bd_cid10_subcategoria` - CID-10 Subcategorias
- **Função:** Catálogo de códigos CID-10
- **Campos:** `SUBCAT` (código), `DESCRICAO`

---

## 🔄 **RELACIONAMENTOS PRINCIPAIS**

```
Operadoras (1) ←→ (N) Clinicas
Clinicas (1) ←→ (N) Usuarios
Clinicas (1) ←→ (N) Responsaveis_Tecnicos
Clinicas (1) ←→ (N) Pacientes_Clinica
Clinicas (1) ←→ (N) Protocolos
Clinicas (1) ←→ (N) Solicitacoes_Autorizacao
Clinicas (1) ←→ (N) notificacoes

Operadoras (1) ←→ (N) OperadoraUsers
Operadoras (1) ←→ (N) Pacientes_Clinica

Pacientes_Clinica (1) ←→ (N) Solicitacoes_Autorizacao
Pacientes_Clinica (1) ←→ (N) notificacoes

Protocolos (1) ←→ (N) Medicamentos_Protocolo

Prestadores (1) ←→ (N) Pacientes_Clinica

Solicitacoes_Autorizacao (1) ←→ (N) notificacoes

Usuarios (1) ←→ (N) system_logs
Usuarios (1) ←→ (N) performance_logs
Usuarios (1) ←→ (N) security_logs
```

---

## 📈 **ÍNDICES E PERFORMANCE**

### **Índices Importantes:**
- `Pacientes_Clinica`: `idx_pacientes_codigo`, `idx_pacientes_cpf`, `idx_pacientes_nome`
- `system_logs`: `idx_timestamp`, `idx_level`, `idx_category`, `idx_user_id`
- `Protocolos`: `idx_clinica_id`, `idx_status`, `idx_created_at`
- `Medicamentos_Protocolo`: `idx_protocolo_id`, `idx_ordem`

### **Views:**
- `Pacientes_Clinica_View`: View com endereço composto calculado

### **Triggers:**
- `trg_pacientes_endereco_ins/upd`: Manter endereço legado sincronizado

---

## 🛠️ **CONFIGURAÇÕES TÉCNICAS**

### **Pool de Conexões:**
- **Limite:** 20 conexões simultâneas
- **Timeout:** 60 segundos
- **Retry:** Configurado para erros transitórios
- **Timezone:** Local

### **Recursos Especiais:**
- **JSON Fields:** `telefones`, `emails` nas clínicas, `metadata` nos logs
- **ENUM Fields:** Para padronização de status e tipos
- **Foreign Keys:** Com CASCADE e SET NULL conforme necessário
- **Auto Timestamps:** `created_at`, `updated_at` automáticos

---

## 📊 **ESTATÍSTICAS DE USO**

### **Tabelas Mais Utilizadas:**
1. `Pacientes_Clinica` - Coração do sistema
2. `Solicitacoes_Autorizacao` - Processo principal
3. `Clinicas` - Entidade central
4. `system_logs` - Monitoramento contínuo
5. `notificacoes` - Comunicação ativa

### **Operações Frequentes:**
- **SELECT:** Busca de pacientes, solicitações, protocolos
- **INSERT:** Novos pacientes, solicitações, logs
- **UPDATE:** Status de solicitações, dados de pacientes
- **JOIN:** Relacionamentos entre clínicas, pacientes e operadoras

---

## 🎯 **PONTOS DE ATENÇÃO PARA REESTRUTURAÇÃO**

### **Otimizações Necessárias:**
1. **Particionamento** de `system_logs` por data
2. **Índices compostos** para consultas complexas
3. **Arquivamento** de dados históricos
4. **Cache** para consultas frequentes
5. **Normalização** de campos repetitivos

### **Melhorias de Estrutura:**
1. Separar endereços em tabela própria
2. Criar tabela de histórico de status
3. Implementar soft delete consistente
4. Padronizar nomenclatura de campos
5. Adicionar constraints de validação

### **Segurança:**
1. Criptografia de dados sensíveis
2. Auditoria completa de alterações
3. Backup automático
4. Controle de acesso granular
5. Logs de segurança detalhados
