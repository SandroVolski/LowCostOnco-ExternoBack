# Sistema de Procedimentos - Guia de Instalação

## Visão Geral

Este módulo implementa o gerenciamento de procedimentos que as clínicas realizam e as negociações de valores com operadoras, incluindo controle de vigência e credenciamento.

## Arquitetura

### Backend (sistema-clinicas-backend)

**Arquivos criados:**
- `create-procedimentos-tables.sql` - Script de criação das tabelas
- `src/models/Procedimento.ts` - Modelo de dados
- `src/controllers/procedimentoController.ts` - Controller com lógica de negócios
- `src/routes/procedimentoRoutes.ts` - Definição de rotas
- `src/server.ts` - Registra as rotas no servidor

**Estrutura do Banco de Dados:**

1. **Tabela `procedimentos`**
   - Armazena os procedimentos que cada clínica realiza
   - Campos: código, descrição, categoria, unidade de pagamento, fracionamento, status

2. **Tabela `procedimentos_operadora`**
   - Armazena as negociações entre clínicas e operadoras
   - Campos: valor, credenciamento, período de vigência (data_inicio, data_fim)
   - Permite múltiplas negociações por procedimento (histórico)

### Frontend (onco-connect-hub-main)

**Arquivos criados:**
- `src/services/procedimentoService.ts` - Serviço de comunicação com API
- `src/pages/Procedimentos.tsx` - Interface completa de gerenciamento
- `src/App.tsx` - Adicionada rota `/procedimentos`
- `src/pages/ClinicProfile.tsx` - Adicionado botão de acesso

## Instalação

### Passo 1: Criar as Tabelas no Banco de Dados

Execute o script SQL no seu banco de dados MySQL:

```bash
mysql -u seu_usuario -p nome_do_banco < sistema-clinicas-backend/create-procedimentos-tables.sql
```

Ou importe manualmente via phpMyAdmin, MySQL Workbench ou outra ferramenta de administração.

**Importante:** O script usa `CREATE TABLE IF NOT EXISTS`, então é seguro executá-lo múltiplas vezes.

### Passo 2: Verificar a Instalação do Backend

1. Certifique-se de que o backend está rodando:
   ```bash
   cd sistema-clinicas-backend
   npm run dev
   ```

2. O servidor deve estar acessível em `http://localhost:3001`

3. Teste o endpoint:
   ```bash
   curl http://localhost:3001/api/procedimentos?clinica_id=1
   ```

### Passo 3: Verificar a Instalação do Frontend

1. Certifique-se de que o frontend está rodando:
   ```bash
   cd onco-connect-hub-main
   npm run dev
   ```

2. O aplicativo deve estar acessível em `http://localhost:5173`

3. Faça login como clínica e acesse:
   - Perfil da Clínica → Botão "Procedimentos"
   - Ou diretamente: `http://localhost:5173/procedimentos`

## Funcionalidades

### Gestão de Procedimentos

- **Criar Procedimento:** Cadastrar novo procedimento da clínica
- **Editar Procedimento:** Atualizar informações
- **Excluir Procedimento:** Remover procedimento (exclui também todas as negociações vinculadas)
- **Listar Procedimentos:** Visualizar todos os procedimentos com busca por código/descrição

**Campos:**
- Código (obrigatório)
- Descrição (obrigatório)
- Categoria: Honorários | Taxas e Diárias | Materiais e Medicamentos
- Unidade de Pagamento (obrigatório): ex: "por sessão", "por dia", "por unidade"
- Fracionamento: Se permite divisão de pagamento
- Status: Ativo | Inativo
- Observações

### Gestão de Negociações

- **Criar Negociação:** Vincular procedimento a uma operadora com valor específico
- **Editar Negociação:** Atualizar valores e condições
- **Excluir Negociação:** Remover negociação específica
- **Visualizar Negociações:** Por clínica, por procedimento ou por operadora
- **Controle de Vigência:** Definir período de validade da negociação
- **Status de Credenciamento:** Marcar se está credenciado ou não

**Campos:**
- Operadora (obrigatório)
- Valor em R$ (obrigatório)
- Credenciado: Sim | Não
- Data Início (obrigatório)
- Data Fim (opcional - vazio = vigência indeterminada)
- Status: Ativo | Inativo | Vencido
- Observações

### Recursos Automáticos

1. **Atualização de Status:** Negociações com `data_fim` vencida são automaticamente marcadas como "vencido"
2. **Validação de Vigência:** Sistema identifica negociações ativas dentro do período válido
3. **Histórico Completo:** Mantém registro de todas as negociações (atuais e passadas)
4. **Formatação Automática:** Valores em R$, datas em formato brasileiro

## Endpoints da API

### Procedimentos

```
GET    /api/procedimentos?clinica_id={id}           - Listar procedimentos da clínica
GET    /api/procedimentos/:id                       - Buscar procedimento específico
POST   /api/procedimentos                           - Criar novo procedimento
PUT    /api/procedimentos/:id                       - Atualizar procedimento
DELETE /api/procedimentos/:id                       - Excluir procedimento
```

### Negociações

```
GET    /api/procedimentos/negociacoes/all?clinica_id={id}                     - Listar todas as negociações da clínica
GET    /api/procedimentos/negociacoes/vigentes?clinica_id={id}&operadora_id={id} - Negociações vigentes
GET    /api/procedimentos/:id/negociacoes                                     - Negociações de um procedimento
POST   /api/procedimentos/:id/negociacoes                                     - Criar negociação
PUT    /api/procedimentos/negociacoes/:id                                     - Atualizar negociação
DELETE /api/procedimentos/negociacoes/:id                                     - Excluir negociação
```

## Segurança

- Todas as rotas exigem autenticação (token JWT)
- Clínicas só podem acessar seus próprios procedimentos e negociações
- Validação de permissões em cada endpoint
- Proteção contra SQL Injection via prepared statements

## Exemplos de Uso

### Criar um Procedimento

```typescript
const procedimento = {
  clinica_id: 1,
  codigo: "QUIM001",
  descricao: "Sessão de Quimioterapia",
  categoria: "honorarios",
  unidade_pagamento: "por sessão",
  fracionamento: false,
  status: "ativo",
  observacoes: "Inclui aplicação de medicamento"
};

await ProcedimentoService.createProcedimento(procedimento);
```

### Criar uma Negociação

```typescript
const negociacao = {
  operadora_id: 5,
  clinica_id: 1,
  valor: 1500.00,
  credenciado: true,
  data_inicio: "2025-01-01",
  data_fim: "2025-12-31",
  status: "ativo",
  observacoes: "Contrato anual 2025"
};

await ProcedimentoService.createNegociacao(procedimentoId, negociacao);
```

## Troubleshooting

### Erro: "Tabela não encontrada"
- Execute o script SQL de criação das tabelas
- Verifique se está conectado ao banco correto

### Erro: "Permissão negada"
- Certifique-se de estar autenticado como clínica
- Verifique se o `clinica_id` corresponde ao usuário logado

### Negociações não aparecem como "Vencidas"
- O sistema atualiza o status automaticamente ao carregar
- Verifique se a `data_fim` está realmente no passado
- O status é atualizado em cada consulta às negociações

### Botão "Procedimentos" não aparece
- Verifique se está logado como clínica (não como operadora)
- Limpe o cache do navegador
- Verifique se o arquivo ClinicProfile.tsx foi atualizado corretamente

## Suporte

Para dúvidas ou problemas, consulte:
- Logs do backend em `sistema-clinicas-backend`
- Console do navegador para erros de frontend
- Documentação da API em `/api` (quando servidor estiver rodando)

## Próximas Melhorias

- [ ] Exportação de negociações para Excel/PDF
- [ ] Gráficos de comparação de valores entre operadoras
- [ ] Alertas de vencimento de negociações
- [ ] Importação em lote de procedimentos
- [ ] Templates de procedimentos comuns
- [ ] Integração com TUSS (Terminologia Unificada da Saúde Suplementar)

