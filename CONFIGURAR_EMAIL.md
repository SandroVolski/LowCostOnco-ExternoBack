# 📧 Configuração de Email - Sistema Onkhos

Este guia explica como configurar o envio de emails para o sistema de recuperação de senha.

## 🔧 Configuração na Hostinger

### ⚠️ IMPORTANTE: Domínio @onkhos.com

Para usar emails `@onkhos.com` na Hostinger, você precisa:

1. **Ter o domínio `onkhos.com` configurado na Hostinger**
2. **Ter o DNS configurado corretamente**
3. **Criar contas de email para esse domínio**

### Passo 1: Verificar Domínio na Hostinger

1. Acesse o painel da Hostinger
2. Vá em **"Domínios"** ou **"Gerenciar Domínios"**
3. Verifique se `onkhos.com` está listado e ativo
4. Se não estiver, você precisa:
   - Adicionar o domínio na Hostinger
   - Configurar os registros DNS (MX, SPF, DKIM)

### Passo 2: Configurar DNS para Email

Para que emails `@onkhos.com` funcionem, você precisa configurar:

**Registros MX (Mail Exchange):**
```
Tipo: MX
Nome: @
Valor: mx1.hostinger.com
Prioridade: 10
```

**Registro SPF (Sender Policy Framework):**
```
Tipo: TXT
Nome: @
Valor: v=spf1 include:hostinger.com ~all
```

**Registro DKIM (opcional, mas recomendado):**
- A Hostinger fornece as chaves DKIM no painel de email
- Adicione conforme as instruções da Hostinger

### Passo 3: Criar Conta de Email

1. Acesse o painel da Hostinger
2. Vá em **"Email"** > **"Gerenciar Contas de Email"**
3. Selecione o domínio `onkhos.com`
4. Clique em **"Criar Nova Conta de Email"**
5. Crie uma conta (ex: `noreply@onkhos.com` ou `sistema@onkhos.com`)
6. Defina uma senha forte para o email
7. **Ative a conta** (se aparecer como "Inativo", clique para ativar)
8. Anote as credenciais (email e senha)

### Passo 2: Criar Conta de Email para onkho.com.br

Como o domínio `onkho.com.br` já está configurado na Hostinger:

1. Acesse o painel da Hostinger
2. Vá em **"Email"** > **"Gerenciar Contas de Email"**
3. Selecione o domínio `onkho.com.br` (não `onkhos.com`)
4. Clique em **"Criar Nova Conta de Email"**
5. Crie uma conta: `noreply@onkho.com.br`
6. Defina uma senha forte
7. Anote as credenciais

**Nota:** O sistema aceita emails `@onkhos.com` e `@onkho.com.br` para recuperação, mas o email será enviado de `noreply@onkho.com.br`.

### Passo 3: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` do backend:

```env
# Configurações SMTP - Hostinger (usando onkho.com.br)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@onkho.com.br
SMTP_PASSWORD=sua-senha-do-email-aqui
SMTP_FROM_EMAIL=noreply@onkho.com.br
SMTP_FROM_NAME=Sistema Onkhos
SMTP_REJECT_UNAUTHORIZED=false
```

**Importante:** Use `@onkho.com.br` nas configurações SMTP, pois esse domínio já está configurado na Hostinger.

### Passo 3: Verificar Configuração

1. Reinicie o backend
2. Teste o "Esqueceu a senha?" no frontend
3. Verifique os logs do backend para confirmar o envio
4. Verifique a caixa de entrada do email (e spam)

## 📋 Configurações SMTP da Hostinger

- **Host:** `smtp.hostinger.com`
- **Porta:** `587` (TLS) ou `465` (SSL)
- **Seguro:** `false` para porta 587, `true` para porta 465
- **Autenticação:** Sim (use o email completo e senha)

## 🔄 Alternativas (Outros Provedores)

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app  # Não use a senha normal!
```

**Importante:** Para Gmail, você precisa criar uma "Senha de App":
1. Acesse: https://myaccount.google.com/apppasswords
2. Gere uma senha de app
3. Use essa senha no `SMTP_PASSWORD`

### Outlook/Office365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@outlook.com
SMTP_PASSWORD=sua-senha
```

### SendGrid (Recomendado para produção)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=sua-api-key-do-sendgrid
```

## 🧪 Testar Configuração

### Em Desenvolvimento

Em modo desenvolvimento, o sistema:
- ✅ Tenta enviar o email
- ✅ Retorna o link na resposta (para facilitar testes)
- ✅ Mostra logs detalhados no console

### Em Produção

Em modo produção, o sistema:
- ✅ Envia o email normalmente
- ❌ Não retorna o link na resposta (por segurança)
- ✅ Mostra apenas mensagem genérica

## 🐛 Troubleshooting

### Email aparece como "Inativo" na Hostinger

**Problema:** O email `@onkhos.com` aparece como "Inativo" no painel da Hostinger.

**Soluções:**

1. **Verificar se o domínio está configurado:**
   - O domínio `onkhos.com` precisa estar adicionado na Hostinger
   - Vá em "Domínios" e verifique se está listado

2. **Ativar o email:**
   - Clique no email inativo
   - Procure por um botão "Ativar" ou "Habilitar"
   - Se não houver opção, o domínio pode não estar configurado

3. **Se o domínio não estiver na Hostinger:**
   - Você tem duas opções:
     - **Opção A:** Adicionar o domínio na Hostinger e configurar DNS
     - **Opção B:** Usar um email de outro domínio (veja alternativas abaixo)

### Email não está sendo enviado

1. **Verifique as credenciais:**
   - Confirme que `SMTP_USER` e `SMTP_PASSWORD` estão corretos
   - Teste fazer login no webmail da Hostinger com essas credenciais

2. **Verifique os logs:**
   - Procure por `[EmailService]` nos logs do backend
   - Veja se há erros de autenticação ou conexão

3. **Teste a conexão SMTP:**
   - Use um cliente de email (Outlook, Thunderbird) para testar
   - Configure com as mesmas credenciais SMTP

4. **Firewall/Porta:**
   - Certifique-se de que a porta 587 ou 465 está aberta
   - Alguns servidores bloqueiam conexões SMTP

### Email vai para spam

1. Configure SPF no DNS do domínio
2. Configure DKIM no DNS do domínio
3. Use um email com o mesmo domínio (@onkhos.com)

## 🔄 Alternativas se @onkhos.com não estiver disponível

Se você não conseguir configurar emails `@onkhos.com` na Hostinger, você pode:

### Opção 1: Usar email da Hostinger (domínio padrão)

Se você tem um domínio padrão da Hostinger (ex: `seudominio.hosting.com`):

```env
SMTP_USER=noreply@seudominio.hosting.com
SMTP_FROM_EMAIL=noreply@seudominio.hosting.com
```

**Nota:** O sistema ainda aceitará emails `@onkhos.com` para recuperação, mas o email será enviado de outro domínio.

### Opção 2: Usar Gmail/Outlook temporariamente

Você pode usar um email pessoal temporariamente para testes:

```env
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=senha-de-app
SMTP_FROM_EMAIL=seu-email@gmail.com
```

### Opção 3: Usar SendGrid ou Mailgun (Recomendado)

Serviços profissionais de email transacional:

```env
# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=sua-api-key
SMTP_FROM_EMAIL=noreply@onkhos.com  # Pode usar qualquer email aqui
```

**Vantagens:**
- Não precisa configurar DNS
- Melhor entrega (menos spam)
- Estatísticas de envio
- Gratuito até certo limite

## 📝 Exemplo Completo do .env

```env
# Banco de Dados
DB_HOST=191.101.234.250
DB_USER=onkhos_user
DB_PASSWORD=@Pembrolizumabe2025
DB_NAME=bd_onkhos
DB_PORT=3306

# Servidor
PORT=3001
NODE_ENV=production
JWT_SECRET=seu-jwt-secret-super-seguro

# Frontend
FRONTEND_URL=https://app.onkhos.com

# Email (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@onkhos.com
SMTP_PASSWORD=sua-senha-aqui
SMTP_FROM_EMAIL=noreply@onkhos.com
SMTP_FROM_NAME=Sistema Onkhos
SMTP_REJECT_UNAUTHORIZED=false
```

## ✅ Checklist

- [ ] Conta de email criada na Hostinger
- [ ] Variáveis SMTP configuradas no `.env`
- [ ] Backend reiniciado
- [ ] Teste de "Esqueceu a senha?" realizado
- [ ] Email recebido (verificar spam também)
- [ ] Link de reset funciona corretamente

