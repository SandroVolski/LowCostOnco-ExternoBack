# 💬 Sistema de Chat - Operadoras e Clínicas

## 📋 Visão Geral

O sistema de chat permite comunicação em tempo real entre operadoras de plano de saúde e suas clínicas parceiras. O sistema foi projetado com as seguintes funcionalidades:

- **Operadoras**: Podem enviar mensagens para todas as clínicas que fazem parte do seu conjunto
- **Clínicas**: Podem enviar mensagens apenas para a operadora da qual fazem parte
- **Chat Individual**: Comunicação direta entre operadora e clínica específica
- **Chat em Grupo**: Operadoras podem criar grupos com múltiplas clínicas
- **Mensagens em Tempo Real**: Atualização automática a cada 30 segundos
- **Status de Leitura**: Controle de mensagens lidas/não lidas

## 🏗️ Arquitetura

### Backend (sistema-clinicas-backend)
- **Modelos**: `Chat.ts` - Gerenciamento de chats e mensagens
- **Controllers**: `chatController.ts` - Lógica de negócio
- **Rotas**: `chatRoutes.ts` - Endpoints da API
- **Banco de Dados**: 3 tabelas principais (chats, messages, chat_participants)

### Frontend (onco-connect-hub-main)
- **Serviço**: `chatService.ts` - Comunicação com API
- **Componente**: `Chat.tsx` - Interface do usuário
- **Integração**: Sistema de autenticação e roles

## 🚀 Configuração

### 1. Criar Tabelas do Banco de Dados

Execute o script SQL para criar as tabelas necessárias:

```bash
# No diretório sistema-clinicas-backend
node setup-chat-tables.js
```

Ou execute manualmente o arquivo SQL:
```sql
-- Execute o conteúdo de database-chat.sql no seu banco MySQL
```

### 2. Verificar Configuração

Teste se o sistema está funcionando:

```bash
# No diretório sistema-clinicas-backend
node test-chat-system.js
```

### 3. Iniciar Servidor

```bash
# Backend
cd sistema-clinicas-backend
npm start

# Frontend
cd onco-connect-hub-main
npm run dev
```

## 📊 Estrutura do Banco de Dados

### Tabela `chats`
```sql
CREATE TABLE chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('individual', 'group') NOT NULL,
    operadora_id INT,
    clinica_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    last_message_id INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Tabela `messages`
```sql
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_type ENUM('operadora', 'clinica') NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file') DEFAULT 'text',
    status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Tabela `chat_participants`
```sql
CREATE TABLE chat_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    participant_id INT NOT NULL,
    participant_type ENUM('operadora', 'clinica') NOT NULL,
    joined_at TIMESTAMP,
    last_read_message_id INT,
    is_active BOOLEAN DEFAULT TRUE
);
```

## 🔌 API Endpoints

### Chats
- `GET /api/chat/chats` - Listar chats do usuário
- `GET /api/chat/chats/:id` - Buscar chat específico
- `POST /api/chat/chats` - Criar novo chat
- `POST /api/chat/chats/find-or-create` - Buscar ou criar chat operadora-clínica

### Mensagens
- `GET /api/chat/chats/:id/messages` - Buscar mensagens de um chat
- `POST /api/chat/chats/:id/messages` - Enviar mensagem
- `PUT /api/chat/chats/:id/read` - Marcar chat como lido

### Utilitários
- `GET /api/chat/unread-count` - Contar mensagens não lidas

## 🎯 Funcionalidades

### Para Operadoras
1. **Acesso Total**: Podem ver e criar chats com todas as clínicas
2. **Chat Individual**: Comunicação direta com clínica específica
3. **Chat em Grupo**: Criar grupos com múltiplas clínicas
4. **Gerenciamento**: Controlar todos os chats da operadora

### Para Clínicas
1. **Acesso Limitado**: Apenas chats com sua operadora
2. **Chat Individual**: Comunicação direta com a operadora
3. **Participação em Grupos**: Participar de grupos criados pela operadora
4. **Restrições**: Não podem criar chats com outras clínicas

### Recursos Gerais
- **Tempo Real**: Atualização automática de mensagens
- **Status de Leitura**: Controle de mensagens lidas/não lidas
- **Busca**: Filtrar chats por nome
- **Organização**: Separação entre chats individuais e grupos
- **Histórico**: Manter histórico completo de conversas

## 🔐 Segurança e Permissões

### Autenticação
- Todas as rotas requerem token JWT válido
- Verificação de roles (operadora/clinica)
- Controle de acesso baseado em relacionamentos

### Autorização
- Operadoras: Acesso a chats da sua operadora
- Clínicas: Acesso apenas a chats com sua operadora
- Validação de participantes em cada chat

### Validações
- Verificação de existência de operadora/clínica
- Validação de relacionamentos antes de criar chats
- Controle de entrada para prevenir SQL injection

## 🧪 Testes

### Teste Manual
1. Execute `node test-chat-system.js`
2. Verifique se as tabelas foram criadas
3. Teste envio de mensagens
4. Verifique contagem de não lidas

### Teste de Integração
1. Faça login como operadora
2. Acesse a tela de Chat
3. Crie um chat com uma clínica
4. Envie mensagens
5. Verifique se a clínica recebe as mensagens

## 🐛 Troubleshooting

### Problemas Comuns

#### "Tabelas não encontradas"
```bash
# Execute o script de criação
node setup-chat-tables.js
```

#### "Erro de conexão com banco"
```bash
# Verifique as variáveis de ambiente
echo $DB_HOST $DB_USER $DB_PASSWORD $DB_NAME
```

#### "Mensagens não aparecem"
```bash
# Verifique se o polling está funcionando
# Abra o console do navegador e veja as requisições
```

#### "Erro de permissão"
```bash
# Verifique se o usuário tem o role correto
# Operadoras: role = 'operadora'
# Clínicas: role = 'clinica'
```

### Logs e Debug
- Backend: Logs no console do servidor
- Frontend: Console do navegador
- Banco: Verifique tabelas diretamente no MySQL

## 📈 Performance

### Otimizações Implementadas
- **Índices**: Criação automática de índices nas tabelas
- **Polling**: Atualização a cada 30 segundos (configurável)
- **Paginação**: Carregamento de mensagens em lotes
- **Cache**: Headers de cache para dados estáticos

### Monitoramento
- Contagem de mensagens não lidas
- Status de conexão em tempo real
- Logs de performance no backend

## 🔄 Atualizações Futuras

### Funcionalidades Planejadas
- **WebSockets**: Comunicação em tempo real sem polling
- **Arquivos**: Upload e envio de arquivos/imagens
- **Notificações**: Push notifications para mensagens
- **Histórico**: Busca em mensagens antigas
- **Temas**: Personalização da interface

### Melhorias Técnicas
- **Rate Limiting**: Controle de envio de mensagens
- **Backup**: Sistema de backup automático
- **Analytics**: Métricas de uso do chat
- **Mobile**: Interface otimizada para mobile

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique este README
2. Execute os scripts de teste
3. Consulte os logs do sistema
4. Entre em contato com a equipe de desenvolvimento

---

**Sistema de Chat v1.0** - Desenvolvido para comunicação entre operadoras e clínicas
