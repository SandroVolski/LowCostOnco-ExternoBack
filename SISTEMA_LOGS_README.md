# 🚀 Sistema de Logs - Implementação Completa

## 📋 Visão Geral

Este documento descreve a implementação completa do sistema de logs para o painel administrativo, substituindo os dados mock por logs reais do sistema.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **`system_logs`** - Logs principais do sistema
2. **`performance_logs`** - Logs específicos de performance
3. **`security_logs`** - Logs de auditoria de segurança

### Campos Principais

- **Identificação**: `id`, `timestamp`, `created_at`
- **Classificação**: `level`, `category`
- **Conteúdo**: `message`, `details`, `stack_trace`
- **Contexto**: `user_id`, `ip_address`, `user_agent`
- **API**: `endpoint`, `method`, `status_code`, `response_time`
- **Metadados**: `metadata` (JSON flexível)

## 🔧 Instalação e Configuração

### 1. Executar Script de Configuração

```bash
cd sistema-clinicas-backend
node setup-logs.js
```

**O que o script faz:**
- ✅ Cria as tabelas necessárias
- ✅ Configura índices para performance
- ✅ Insere logs de teste iniciais
- ✅ Valida a estrutura criada

### 2. Verificar Configuração

```bash
# Testar conexão com banco
node test-db-connection.js

# Verificar se as tabelas foram criadas
mysql -u root -p bd_sistema_clinicas -e "SHOW TABLES LIKE '%logs%';"
```

### 3. Reiniciar o Servidor Backend

```bash
# Parar servidor atual (Ctrl+C)
# Iniciar novamente
npm run dev
# ou
node src/server.ts
```

## 🔌 Endpoints da API

### Logs do Sistema

```http
GET    /api/logs/system          # Listar logs com filtros
GET    /api/logs/system/stats    # Estatísticas dos logs
POST   /api/logs/system          # Criar novo log
DELETE /api/logs/system/clean    # Limpar logs antigos
GET    /api/logs/system/export   # Exportar logs para CSV
```

### Logs de Performance

```http
GET    /api/logs/performance     # Listar logs de performance
POST   /api/logs/performance     # Criar log de performance
```

### Logs de Segurança

```http
GET    /api/logs/security        # Listar logs de segurança
POST   /api/logs/security        # Criar log de segurança
```

## 📊 Funcionalidades Implementadas

### 1. Logging Automático
- ✅ **Middleware de logging** para todas as requisições
- ✅ **Captura automática** de tempo de resposta
- ✅ **Classificação inteligente** por endpoint e status code
- ✅ **Logging de erros** com stack traces

### 2. Filtros e Busca
- ✅ **Filtro por nível**: error, warn, info, debug
- ✅ **Filtro por categoria**: system, database, api, auth, user, performance, security
- ✅ **Busca textual** em mensagens e detalhes
- ✅ **Filtro por data** (início e fim)
- ✅ **Filtro por usuário** e endpoint

### 3. Exportação e Limpeza
- ✅ **Exportação para CSV** com filtros aplicados
- ✅ **Limpeza automática** de logs antigos
- ✅ **Configuração de retenção** (padrão: 30 dias)

### 4. Estatísticas e Monitoramento
- ✅ **Contadores por nível** e categoria
- ✅ **Erros recentes** (últimas 24h)
- ✅ **Tempo médio de resposta**
- ✅ **Total de logs** no sistema

## 🎯 Como Usar

### 1. Acessar Logs no Frontend

1. Faça login como administrador
2. Acesse `/admin/controle-sistema`
3. Clique na aba **"Logs"**
4. Os logs reais aparecerão automaticamente

### 2. Filtrar e Buscar

- **Nível**: Selecione error, warn, info ou debug
- **Categoria**: Filtre por tipo de operação
- **Busca**: Digite texto para encontrar logs específicos
- **Data**: Use os filtros de período

### 3. Exportar Dados

- Clique em **"Exportar CSV"**
- Os filtros atuais serão aplicados
- Arquivo será baixado automaticamente

### 4. Limpar Logs Antigos

- Clique em **"Limpar Logs"**
- Configure quantos dias manter
- Confirme a operação

## 🔍 Exemplos de Logs

### Log de Requisição Normal
```json
{
  "level": "info",
  "category": "api",
  "message": "GET /api/pacientes - 200",
  "details": "Requisição processada em 150ms",
  "endpoint": "/api/pacientes",
  "method": "GET",
  "statusCode": 200,
  "responseTime": 150
}
```

### Log de Erro
```json
{
  "level": "error",
  "category": "database",
  "message": "Falha na conexão com banco",
  "details": "Timeout na conexão MySQL",
  "stackTrace": "Error: Connection timeout...",
  "endpoint": "/api/protocolos",
  "method": "GET",
  "statusCode": 500,
  "responseTime": 5000
}
```

### Log de Performance
```json
{
  "level": "warn",
  "category": "performance",
  "message": "Consulta lenta detectada",
  "details": "Query demorou mais de 1000ms",
  "endpoint": "/api/pacientes",
  "method": "GET",
  "statusCode": 200,
  "responseTime": 1200
}
```

## 🛠️ Personalização

### 1. Adicionar Novas Categorias

Edite `src/models/SystemLog.ts`:

```typescript
export interface SystemLog {
  category: 'system' | 'database' | 'api' | 'auth' | 'user' | 'performance' | 'security' | 'custom';
  // ... outros campos
}
```

### 2. Configurar Retenção de Logs

```typescript
// Em src/models/SystemLog.ts
static async cleanOldLogs(daysToKeep: number = 30): Promise<number>
```

### 3. Adicionar Novos Campos

```sql
ALTER TABLE system_logs ADD COLUMN new_field VARCHAR(255);
```

## 📈 Monitoramento e Alertas

### 1. Logs Críticos
- **Erros 500**: Falhas do servidor
- **Timeouts**: Conexões lentas
- **Falhas de autenticação**: Tentativas de acesso não autorizado

### 2. Métricas de Performance
- **Tempo médio de resposta** por endpoint
- **Logs de performance** para operações lentas
- **Estatísticas** de uso da API

### 3. Segurança
- **Tentativas de login** falhadas
- **Acessos a endpoints** restritos
- **Mudanças de permissões** de usuários

## 🔧 Troubleshooting

### Problema: Logs não aparecem
**Solução:**
1. Verifique se as tabelas foram criadas
2. Confirme se o servidor foi reiniciado
3. Verifique os logs do console do backend

### Problema: Erro de conexão com banco
**Solução:**
1. Execute `node test-db-connection.js`
2. Verifique as credenciais no `.env`
3. Confirme se o MySQL está rodando

### Problema: Performance lenta
**Solução:**
1. Verifique os índices das tabelas
2. Configure limpeza automática de logs antigos
3. Monitore o tamanho das tabelas

## 📚 Próximos Passos

### 1. Implementações Futuras
- [ ] **Dashboard de logs** com gráficos
- [ ] **Alertas automáticos** para erros críticos
- [ ] **Integração com ferramentas** de monitoramento
- [ ] **Logs estruturados** em formato JSON

### 2. Melhorias de Performance
- [ ] **Cache de logs** frequentes
- [ ] **Compressão** de logs antigos
- [ ] **Particionamento** de tabelas por data
- [ ] **Backup automático** de logs

### 3. Funcionalidades Avançadas
- [ ] **Análise de padrões** de uso
- [ ] **Detecção de anomalias** automática
- [ ] **Relatórios personalizados** por período
- [ ] **Integração com SIEM** (Security Information and Event Management)

## 🎉 Conclusão

O sistema de logs está agora **100% funcional** com dados reais, substituindo completamente os dados mock. Todas as requisições são automaticamente logadas, e o painel administrativo exibe informações em tempo real sobre o funcionamento do sistema.

**Para começar:**
1. Execute `node setup-logs.js`
2. Reinicie o servidor backend
3. Acesse a aba de Logs no painel admin
4. Os logs reais aparecerão automaticamente!

---

**Status**: ✅ **IMPLEMENTAÇÃO COMPLETA**  
**Backend**: ✅ **API funcionando**  
**Frontend**: ✅ **Integrado com dados reais**  
**Banco de Dados**: ✅ **Estrutura criada**  
**Logging Automático**: ✅ **Ativo em todas as requisições**
