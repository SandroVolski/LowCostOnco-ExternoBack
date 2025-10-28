# Sistema de Recursos de Glosas - Implementação Completa

## ✅ BACKEND COMPLETO

### 1. Banco de Dados
Todas as tabelas foram criadas com sucesso:

#### Tabelas Principais
- ✅ `auditores` - Cadastro de auditores médicos
- ✅ `auditor_users` - Login e autenticação de auditores
- ✅ `recursos_glosas` - Tabela principal de recursos
- ✅ `recursos_glosas_documentos` - Documentos anexados
- ✅ `recursos_glosas_pareceres` - Pareceres técnicos dos auditores
- ✅ `recursos_glosas_historico` - Timeline completa de ações
- ✅ `recursos_glosas_chat` - Chat exclusivo Operadora ↔ Auditor
- ✅ `recursos_glosas_notificacoes` - Sistema de notificações

#### Views
- ✅ `vw_recursos_glosas_completo` - View com todos os dados consolidados

### 2. Controllers Implementados

#### AuditorController (`auditorController.ts`)
- ✅ `POST /api/auditor/login` - Autenticação de auditor
- ✅ `GET /api/auditor/dashboard` - Dashboard com estatísticas
- ✅ `GET /api/auditor/recursos` - Listar recursos atribuídos
- ✅ `GET /api/auditor/recursos/:id` - Detalhes de um recurso
- ✅ `POST /api/auditor/recursos/:id/parecer` - Emitir parecer técnico
- ✅ `GET /api/auditor/recursos/:id/chat` - Listar mensagens do chat
- ✅ `POST /api/auditor/recursos/:id/chat` - Enviar mensagem para operadora

#### OperadoraRecursosController (`operadoraRecursosController.ts`)
- ✅ `GET /api/operadora/recursos-glosas/dashboard` - Dashboard
- ✅ `GET /api/operadora/recursos-glosas/recursos` - Listar recursos
- ✅ `GET /api/operadora/recursos-glosas/recursos/:id` - Detalhes
- ✅ `POST /api/operadora/recursos-glosas/recursos/:id/receber` - Marcar como recebido
- ✅ `POST /api/operadora/recursos-glosas/recursos/:id/aprovar` - Aprovar/Deferir
- ✅ `POST /api/operadora/recursos-glosas/recursos/:id/negar` - Negar/Indeferir
- ✅ `POST /api/operadora/recursos-glosas/recursos/:id/solicitar-parecer` - Solicitar parecer
- ✅ `POST /api/operadora/recursos-glosas/recursos/:id/chat` - Enviar mensagem
- ✅ `GET /api/operadora/recursos-glosas/auditores` - Listar auditores disponíveis

#### RecursosGlosaController (já existia, atualizado)
- ✅ `POST /api/financeiro/recursos-glosas` - Clínica cria recurso
- ✅ `GET /api/financeiro/recursos-glosas/clinica/:clinicaId` - Listar por clínica
- ✅ `GET /api/financeiro/recursos-glosas/:id` - Buscar por ID
- ✅ `GET /api/financeiro/recursos-glosas/guia/:guiaId` - Buscar por guia

### 3. Middlewares de Autenticação
- ✅ `authenticateAuditor` - Valida token JWT de auditores
- ✅ `authenticateOperadora` - Valida token JWT de operadoras

### 4. Rotas Registradas
Todas as rotas foram registradas no `server.ts`:
- `/api/auditor/*` - Rotas de auditores
- `/api/operadora/recursos-glosas/*` - Rotas de operadora para recursos

### 5. Dados de Teste

#### Auditor de Teste
```
Username: auditor
Senha: auditor123
Email: auditor@sistema.com
Nome: Dr. João Silva
CRM: 12345/SP
```

## 🎯 FLUXO COMPLETO IMPLEMENTADO

```
1. CLÍNICA cria recurso
   ├─ Status: pendente
   ├─ Anexa documentos
   ├─ Notificação → OPERADORA
   └─ Histórico registrado

2. OPERADORA recebe
   ├─ Status: em_analise_operadora
   ├─ Pode APROVAR → deferido (guia paga)
   ├─ Pode NEGAR → indeferido
   └─ Pode SOLICITAR PARECER → solicitado_parecer

3. AUDITOR recebe (se solicitado)
   ├─ Status: em_analise_auditor
   ├─ Chat com OPERADORA disponível
   ├─ Emite parecer técnico
   └─ Status: parecer_emitido

4. OPERADORA recebe parecer
   ├─ Analisa recomendação do auditor
   └─ Decide: aprovar ou negar

5. CLÍNICA recebe resposta
   ├─ Status final: deferido ou indeferido
   ├─ Visualiza histórico completo
   └─ Notificação recebida
```

## 🚀 FRONTEND - PRÓXIMOS PASSOS

### 1. Criar Área do Auditor

#### Login de Auditor
Criar página: `onco-connect-hub-main/src/pages/AuditorLogin.tsx`

```typescript
// Fazer POST para /api/auditor/login
// Retorna token JWT com tipo 'auditor'
```

#### Dashboard do Auditor
Criar página: `onco-connect-hub-main/src/pages/AuditorDashboard.tsx`

```typescript
// GET /api/auditor/dashboard
// Mostra:
// - Total de recursos atribuídos
// - Pendentes de análise
// - Concluídos
// - Tempo médio de análise
// - Recursos recentes
```

#### Lista de Recursos
Criar página: `onco-connect-hub-main/src/pages/AuditorRecursos.tsx`

```typescript
// GET /api/auditor/recursos?status=em_analise_auditor
// Lista com filtros por status
```

#### Detalhe do Recurso + Emissão de Parecer
Criar página: `onco-connect-hub-main/src/pages/AuditorRecursoDetalhe.tsx`

```typescript
// GET /api/auditor/recursos/:id
// Mostra:
// - Dados da guia e lote
// - Justificativa da clínica
// - Documentos anexados
// - Histórico
// - Formulário de parecer:
//   * Parecer técnico (textarea)
//   * Recomendação (select: aprovar/negar/solicitar_documentos/parcial)
//   * Valor recomendado (se parcial)
//   * Justificativa técnica
//   * CIDs analisados
//   * Procedimentos analisados
// - Chat com operadora (sidebar)
```

#### Chat Operadora-Auditor
Componente: `onco-connect-hub-main/src/components/ChatOperadoraAuditor.tsx`

```typescript
// GET /api/auditor/recursos/:id/chat
// POST /api/auditor/recursos/:id/chat
// WebSocket para mensagens em tempo real (opcional)
```

### 2. Criar Área da Operadora para Recursos

#### Dashboard de Recursos
Criar página: `onco-connect-hub-main/src/pages/OperadoraRecursosDashboard.tsx`

```typescript
// GET /api/operadora/recursos-glosas/dashboard
```

#### Lista de Recursos Recebidos
Criar página: `onco-connect-hub-main/src/pages/OperadoraRecursosList.tsx`

```typescript
// GET /api/operadora/recursos-glosas/recursos?status=pendente
```

#### Detalhe do Recurso + Ações
Criar página: `onco-connect-hub-main/src/pages/OperadoraRecursoDetalhe.tsx`

```typescript
// GET /api/operadora/recursos-glosas/recursos/:id
// Ações:
// - Aprovar (POST /recursos/:id/aprovar)
// - Negar (POST /recursos/:id/negar)
// - Solicitar Parecer (POST /recursos/:id/solicitar-parecer)
//   * Selecionar auditor da lista
//   * Adicionar observações
// - Chat com auditor (se houver)
```

### 3. Atualizar Área da Clínica

#### Visualizar Resposta da Operadora
Atualizar: `onco-connect-hub-main/src/pages/RecursosGlosas.tsx`

```typescript
// Adicionar visualização de:
// - Status atualizado (deferido/indeferido)
// - Resposta da operadora
// - Histórico completo
// - Parecer do auditor (se houver)
```

#### Sistema de Notificações
Criar componente: `onco-connect-hub-main/src/components/NotificacoesRecursos.tsx`

```typescript
// GET /api/financeiro/recursos-glosas/notificacoes
// Badge com contador de não lidas
// Lista de notificações com links
```

### 4. Estrutura de Rotas

Adicionar ao `Router.tsx`:

```typescript
// Auditor
<Route path="/auditor/login" element={<AuditorLogin />} />
<Route path="/auditor" element={<ProtectedRouteAuditor />}>
  <Route path="dashboard" element={<AuditorDashboard />} />
  <Route path="recursos" element={<AuditorRecursos />} />
  <Route path="recursos/:id" element={<AuditorRecursoDetalhe />} />
</Route>

// Operadora - Recursos
<Route path="/operadora/recursos-glosas" element={<OperadoraRecursosList />} />
<Route path="/operadora/recursos-glosas/:id" element={<OperadoraRecursoDetalhe />} />
```

### 5. Context de Autenticação

Criar: `onco-connect-hub-main/src/contexts/AuditorAuthContext.tsx`

```typescript
interface AuditorAuthContextType {
  auditor: Auditor | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

### 6. Services

Criar: `onco-connect-hub-main/src/services/auditorService.ts`

```typescript
export class AuditorService {
  static async login(username: string, password: string)
  static async getDashboard()
  static async listarRecursos(status?: string)
  static async buscarRecurso(id: number)
  static async emitirParecer(id: number, parecer: Parecer)
  static async listarMensagens(id: number)
  static async enviarMensagem(id: number, mensagem: string)
}
```

Criar: `onco-connect-hub-main/src/services/operadoraRecursosService.ts`

```typescript
export class OperadoraRecursosService {
  static async getDashboard()
  static async listarRecursos(status?: string)
  static async buscarRecurso(id: number)
  static async receberRecurso(id: number)
  static async aprovarRecurso(id: number, observacoes?: string)
  static async negarRecurso(id: number, motivo: string)
  static async solicitarParecer(id: number, auditorId: number, observacoes?: string)
  static async enviarMensagem(id: number, mensagem: string)
  static async listarAuditores()
}
```

## 📝 TESTES

### 1. Testar Login de Auditor
```bash
curl -X POST http://localhost:8080/api/auditor/login \
  -H "Content-Type: application/json" \
  -d '{"username":"auditor","password":"auditor123"}'
```

### 2. Criar Recurso de Teste
Use a interface da clínica para criar um recurso em uma guia glosada.

### 3. Atribuir ao Auditor
Use a interface da operadora para solicitar parecer e atribuir ao auditor de teste.

### 4. Emitir Parecer
Login como auditor e emitir parecer técnico.

### 5. Decisão Final
Operadora recebe parecer e decide (aprovar/negar).

## 🎨 UI/UX Sugerido

### Cores por Status
- `pendente`: Amarelo (amber)
- `em_analise_operadora`: Azul (blue)
- `solicitado_parecer`: Roxo (purple)
- `em_analise_auditor`: Índigo (indigo)
- `parecer_emitido`: Ciano (cyan)
- `deferido`: Verde (green)
- `indeferido`: Vermelho (red)

### Ícones
- Auditor: `Stethoscope`, `UserCog`
- Parecer: `FileText`, `ClipboardCheck`
- Chat: `MessageSquare`, `MessagesSquare`
- Timeline: `GitBranch`, `Activity`

## 🔐 SEGURANÇA

### Regras Implementadas
- ✅ Clínica ↔ Operadora: Comunicação via histórico e notificações
- ✅ Operadora ↔ Auditor: Chat exclusivo
- ❌ Clínica ↔ Auditor: **NÃO PERMITIDO** (implementado na lógica)

### Validações
- Tokens JWT com tipo de usuário
- Middlewares verificam permissões
- Auditor só vê recursos atribuídos a ele
- Operadora só vê recursos da sua ANS
- Clínica só vê seus próprios recursos

## 📊 MÉTRICAS DISPONÍVEIS

### Dashboard Auditor
- Total de análises
- Pendentes
- Concluídas
- Tempo médio de análise

### Dashboard Operadora
- Total de recursos recebidos
- Pendentes/Em análise
- Deferidos/Indeferidos
- Valor total em recursos
- Taxa de aprovação

## 🐛 DEBUG

### Logs Importantes
Todos os controllers têm logs com emoji para facilitar:
- 📥 Dados recebidos
- ✅ Operação concluída
- ❌ Erro
- 📧 Notificação enviada
- 💬 Mensagem de chat

### Verificar Dados no Banco
```sql
-- Ver recursos
SELECT * FROM vw_recursos_glosas_completo;

-- Ver histórico
SELECT * FROM recursos_glosas_historico ORDER BY created_at DESC LIMIT 10;

-- Ver notificações não lidas
SELECT * FROM recursos_glosas_notificacoes WHERE lida = FALSE;

-- Ver chat
SELECT * FROM recursos_glosas_chat ORDER BY created_at DESC;
```

---

**Status**: Backend 100% completo e funcional. Frontend aguardando implementação.

**Próximo passo**: Começar pela área do auditor (login + dashboard + lista).
