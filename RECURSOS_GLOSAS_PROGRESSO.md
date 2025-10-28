# Sistema de Recursos de Glosas - Progresso da Implementação

## ✅ CONCLUÍDO

### 1. Estrutura de Banco de Dados
- [x] Planejamento completo do fluxo: Clínica → Operadora → Auditor → Operadora → Clínica
- [x] Criação de arquivos SQL:
  - `create-recursos-glosas-completo.sql` (versão com triggers)
  - `create-recursos-glosas-sem-triggers.sql` (versão simplificada)
  - `create-recursos-glosas-final.sql` (versão adaptada para usar financeiro_items)
- [x] Tabelas criadas:
  - ✅ `auditores` - Cadastro de auditores médicos
  - ✅ `auditor_users` - Login de auditores

### 2. Tabelas Pendentes de Criação
- [ ] `recursos_glosas` - Tabela principal
- [ ] `recursos_glosas_documentos` - Documentos anexados
- [ ] `recursos_glosas_pareceres` - Pareceres dos auditores
- [ ] `recursos_glosas_historico` - Timeline de eventos
- [ ] `recursos_glosas_chat` - Chat Operadora-Auditor
- [ ] `recursos_glosas_notificacoes` - Sistema de notificações
- [ ] Views de consulta (vw_recursos_glosas_completo, etc)

## 🔄 EM ANDAMENTO

### Criação das Tabelas no Banco
- Script `setup-recursos-glosas.js` criado
- Tabelas base (auditores, auditor_users) já criadas
- **Próximo passo**: Executar script para criar as tabelas restantes

## 📋 PENDENTE

### 1. Backend - Controllers e Rotas

#### Auditor
- [ ] Controller: `auditorController.ts`
  - Autenticação de auditores
  - Listar recursos atribuídos
  - Emitir parecer
  - Chat com operadora
- [ ] Rotas: `auditorRoutes.ts`

#### Operadora
- [ ] Controller: `operadoraRecursosController.ts`
  - Listar recursos recebidos
  - Aprovar/Negar recurso
  - Solicitar parecer de auditor
  - Chat com auditor
  - Enviar resposta para clínica
- [ ] Rotas: `operadoraRecursosRoutes.ts`

#### Clínica
- [ ] Atualizar `recursosGlosaController.ts`:
  - Visualizar resposta da operadora
  - Ver histórico completo

#### Sistema
- [ ] `notificacoesController.ts`:
  - Criar notificações automáticas
  - Marcar como lidas
  - Listar por usuário

### 2. Frontend - Interfaces

#### Área do Auditor (Nova)
- [ ] Login de auditor
- [ ] Dashboard do auditor
- [ ] Lista de recursos para análise
- [ ] Tela de emissão de parecer
- [ ] Chat com operadora
- [ ] Histórico de pareceres

#### Área da Operadora
- [ ] Lista de recursos de glosas recebidos
- [ ] Visualizar detalhes do recurso
- [ ] Ações: Aprovar/Negar/Solicitar Parecer
- [ ] Chat com auditor
- [ ] Histórico de decisões

#### Área da Clínica
- [ ] Visualizar resposta da operadora
- [ ] Ver histórico completo do recurso

### 3. Sistema de Notificações
- [ ] Service de notificações
- [ ] WebSocket para notificações em tempo real
- [ ] Badge de notificações não lidas
- [ ] Centro de notificações

### 4. Autenticação
- [ ] Middleware de autenticação para auditores
- [ ] Verificação de permissões por perfil
- [ ] Tokens JWT para auditores

## 🎯 FLUXO COMPLETO

```
1. CLÍNICA cria recurso
   ↓
2. OPERADORA recebe notificação
   ↓
3. OPERADORA decide:
   a) Aprovar → Status: deferido
   b) Negar → Status: indeferido
   c) Solicitar parecer → Status: solicitado_parecer
   ↓
4. AUDITOR recebe (se solicitado)
   ↓
5. AUDITOR analisa e emite parecer
   ↓
6. OPERADORA recebe parecer
   ↓
7. OPERADORA decide baseado no parecer
   ↓
8. CLÍNICA recebe resposta final
```

## 📝 COMANDOS ÚTEIS

### Executar SQL manualmente
```bash
cd sistema-clinicas-backend
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  // Seu código SQL aqui

  await conn.end();
})();
"
```

### Verificar tabelas criadas
```sql
SHOW TABLES LIKE '%recursos_glosas%';
```

### Limpar tabelas (cuidado!)
```sql
DROP TABLE IF EXISTS recursos_glosas_notificacoes;
DROP TABLE IF EXISTS recursos_glosas_chat;
DROP TABLE IF EXISTS recursos_glosas_historico;
DROP TABLE IF EXISTS recursos_glosas_pareceres;
DROP TABLE IF EXISTS recursos_glosas_documentos;
DROP TABLE IF EXISTS recursos_glosas;
DROP TABLE IF EXISTS auditor_users;
DROP TABLE IF EXISTS auditores;
```

## 🔐 REGRAS DE SEGURANÇA

- Clínica ↔ Operadora: ✅ Permitido
- Operadora ↔ Auditor: ✅ Permitido
- Clínica ↔ Auditor: ❌ **NÃO PERMITIDO**

## 📊 MÉTRICAS A IMPLEMENTAR

- Tempo médio de análise por auditor
- Taxa de deferimento/indeferimento
- Valor total em recursos por período
- Auditores mais ativos

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. Finalizar criação das tabelas no banco
2. Criar controllers básicos para cada perfil
3. Implementar autenticação de auditores
4. Criar telas básicas de auditor
5. Testar fluxo mínimo viável

---

**Última atualização**: Contexto está chegando ao limite. Tabelas `auditores` e `auditor_users` já criadas. Próximo: criar tabela `recursos_glosas`.
