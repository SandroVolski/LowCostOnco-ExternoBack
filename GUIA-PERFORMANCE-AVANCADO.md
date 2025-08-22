# 🚀 Sistema Avançado de Performance

## 📋 Visão Geral

O sistema avançado de performance foi criado para resolver o problema de **requisições lentas** como a que você mencionou (`🐌 Requisição lenta detectada: GET / - 19381ms`).

### ✨ Funcionalidades Principais:

1. **🔍 Detecção Inteligente** - Identifica requisições lentas e críticas
2. **⚡ Circuit Breaker** - Desativa endpoints problemáticos automaticamente  
3. **⏰ Timeout Automático** - Mata requisições que excedem o limite
4. **🚨 Controle de Emergência** - Cancela todas as requisições ativas
5. **📊 Diagnóstico Avançado** - Análise detalhada de performance
6. **🎛️ Configuração Dinâmica** - Ajusta parâmetros em tempo real

## 🔧 Configurações Padrão

```javascript
{
  slowRequestThreshold: 5000,      // 5s - requisição lenta
  criticalRequestThreshold: 15000, // 15s - requisição crítica  
  timeoutThreshold: 30000,         // 30s - timeout automático
  maxConcurrentRequests: 50,       // máximo simultâneo
  enableAutoKill: true,            // mata requisições longas
  enableCircuitBreaker: true       // circuit breaker ativo
}
```

## 🌐 Endpoints da API

### 📊 Monitoramento

```bash
# Estatísticas detalhadas
GET /api/performance/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "config": {...},
    "activeRequests": 3,
    "averageActiveRequestTime": 1250,
    "circuitBreakers": [],
    "longestRunningRequest": 2100
  }
}
```

### 🔍 Diagnóstico

```bash
# Diagnóstico completo
GET /api/performance/diagnose
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "activeRequests": 3,
    "issues": ["🐌 Tempo médio das requisições ativas muito alto"],
    "recommendations": [
      "Verifique a conectividade com o banco de dados",
      "Analise queries SQL lentas"
    ]
  }
}
```

### 🏥 Health Check Avançado

```bash
# Status de saúde do sistema
GET /api/performance/health
```

**Resposta:**
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "activeRequests": 2,
    "uptime": 3600,
    "memory": {"used": 45678912, "total": 134217728},
    "issues": []
  }
}
```

### ⚙️ Configuração Dinâmica

```bash
# Atualizar configurações
PUT /api/performance/config
Content-Type: application/json

{
  "slowRequestThreshold": 3000,     # Reduzir para 3s
  "timeoutThreshold": 20000,        # Timeout de 20s
  "maxConcurrentRequests": 30       # Máximo 30 simultâneas
}
```

### 🚨 Funcionalidades de Emergência

```bash
# Cancelar todas as requisições ativas
POST /api/performance/kill-requests

# Resetar circuit breakers
POST /api/performance/reset-circuit-breakers
```

## 🎯 Como Usar na Prática

### 1. 🔍 Monitoramento Contínuo

```bash
# Verificar performance a cada 30 segundos
watch -n 30 'curl -s http://localhost:3001/api/performance/stats | jq .data'
```

### 2. 🚨 Detectar Problemas

```bash
# Diagnóstico quando houver lentidão
curl http://localhost:3001/api/performance/diagnose | jq .data.issues
```

### 3. ⚙️ Ajustar Configurações

```bash
# Para ambiente com muitos usuários
curl -X PUT http://localhost:3001/api/performance/config \
  -H "Content-Type: application/json" \
  -d '{
    "maxConcurrentRequests": 100,
    "timeoutThreshold": 45000
  }'
```

### 4. 🚨 Ação de Emergência

```bash
# Se o sistema estiver travado
curl -X POST http://localhost:3001/api/performance/kill-requests
```

## 📊 Logs Inteligentes

O sistema gera logs detalhados automaticamente:

### 🐌 Requisição Lenta (5-15s)
```
🐌 Requisição lenta detectada: GET /api/pacientes - 8500ms
```

### 🚨 Requisição Crítica (15s+)
```
🚨 REQUISIÇÃO CRÍTICA: POST /api/solicitacoes - 18200ms
📊 Detalhes da requisição lenta: {
  endpoint: "POST /api/solicitacoes",
  duration: "18200ms", 
  userAgent: "Mozilla/5.0...",
  ip: "192.168.1.100",
  activeRequests: 12
}
```

### ⏰ Timeout Automático
```
⏰ Timeout: Matando requisição GET /api/relatorios após 30000ms
```

### ⚡ Circuit Breaker
```
🚨 Circuit breaker aberto para GET /api/endpoint-lento (5 falhas)
🔄 Circuit breaker fechado para GET /api/endpoint-lento
```

## 🧪 Testando o Sistema

Execute o script de teste avançado:

```bash
node test-performance-advanced.js
```

**O que o teste faz:**
- ✅ Testa requisições simultâneas
- ✅ Verifica timeout customizado
- ✅ Ativa circuit breakers
- ✅ Executa diagnóstico
- ✅ Testa funcionalidades de emergência

## 🔧 Cenários de Uso

### 📈 Alto Tráfego
```javascript
// Configuração para picos de tráfego
{
  maxConcurrentRequests: 100,
  slowRequestThreshold: 8000,
  timeoutThreshold: 45000
}
```

### 🐌 Problemas de Performance
```javascript
// Configuração mais restritiva
{
  maxConcurrentRequests: 20,
  slowRequestThreshold: 3000,
  timeoutThreshold: 15000,
  enableAutoKill: true
}
```

### 🚨 Modo Emergência
```bash
# Cancelar tudo e reduzir limites
curl -X POST http://localhost:3001/api/performance/kill-requests
curl -X PUT http://localhost:3001/api/performance/config \
  -d '{"maxConcurrentRequests": 10, "timeoutThreshold": 10000}'
```

## 🎛️ Integração com Frontend

### Dashboard de Monitoramento

```javascript
// Buscar estatísticas a cada 5 segundos
setInterval(async () => {
  const response = await fetch('/api/performance/stats');
  const stats = await response.json();
  
  // Atualizar dashboard
  updateDashboard({
    activeRequests: stats.data.activeRequests,
    avgResponseTime: stats.data.averageActiveRequestTime,
    issues: stats.data.circuitBreakers.length > 0
  });
}, 5000);
```

### Alerta para Administradores

```javascript
// Verificar problemas críticos
const checkHealth = async () => {
  const response = await fetch('/api/performance/diagnose');
  const diagnosis = await response.json();
  
  if (diagnosis.data.issues.length > 0) {
    showAlert('⚠️ Problemas de performance detectados!', diagnosis.data.issues);
  }
};
```

## 🚀 Benefícios

### ✅ Antes (Sistema Básico)
- ❌ Requisições de 19s+ sem controle
- ❌ Sem limite de requisições simultâneas
- ❌ Sem detecção automática de problemas
- ❌ Sem ações corretivas automáticas

### ✅ Depois (Sistema Avançado)
- ✅ **Timeout automático** em 30s (configurável)
- ✅ **Limite de 50 requisições** simultâneas
- ✅ **Circuit breaker** desativa endpoints problemáticos
- ✅ **Logs detalhados** para debug
- ✅ **Diagnóstico automático** de problemas
- ✅ **Controle de emergência** via API
- ✅ **Configuração dinâmica** sem restart

## 🎯 Próximos Passos

1. **Execute o teste**: `node test-performance-advanced.js`
2. **Configure limites** adequados para seu ambiente
3. **Monitore logs** para identificar padrões
4. **Integre com dashboard** no frontend
5. **Configure alertas** para administradores

---

**💡 Dica:** Use `GET /api/performance/diagnose` sempre que notar lentidão para identificar a causa rapidamente! 