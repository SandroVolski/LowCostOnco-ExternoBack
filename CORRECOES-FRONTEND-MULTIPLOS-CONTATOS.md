# 🔧 Correções no Frontend - Múltiplos Telefones e Emails

## 🎯 Problema Identificado

O backend está funcionando corretamente e retornando arrays de telefones e emails, mas o frontend pode estar exibindo apenas o primeiro valor.

## 📋 Verificações Necessárias

### **1. Verificar se os dados estão chegando corretamente**

Adicione este console.log no seu componente para verificar:

```javascript
// No seu componente ClinicProfileComponent
useEffect(() => {
  const loadProfile = async () => {
    try {
      const response = await ClinicService.getProfile();
      console.log('📋 Dados recebidos da API:', response.data.clinica);
      console.log('📞 Telefones:', response.data.clinica.telefones);
      console.log('📧 Emails:', response.data.clinica.emails);
      
      setProfile(response.data.clinica);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };
  
  loadProfile();
}, []);
```

### **2. Verificar se está usando os arrays corretos**

No seu código atual, certifique-se de que está usando `telefones` e `emails` (arrays) em vez de `telefone` e `email` (strings):

```javascript
// ❌ ERRADO - usando campos antigos
const telefone = profile.telefone;
const email = profile.email;

// ✅ CORRETO - usando arrays
const telefones = profile.telefones || [''];
const emails = profile.emails || [''];
```

### **3. Verificar a exibição no preview**

No seu código, você tem esta seção de preview:

```javascript
{/* Preview dos dados */}
<div className="mt-6 p-4 bg-muted/30 rounded-lg">
  <h4 className="font-medium mb-2">Dados atuais:</h4>
  <div className="space-y-2 text-sm">
    <div>
      <strong>Telefones:</strong> {contactInfo.telefones.filter(t => t.trim()).join(', ') || 'Nenhum'}
    </div>
    <div>
      <strong>Emails:</strong> {contactInfo.emails.filter(e => e.trim()).join(', ') || 'Nenhum'}
    </div>
  </div>
</div>
```

**Correção:** Certifique-se de que está usando os dados do `profile` em vez de `contactInfo`:

```javascript
{/* Preview dos dados - CORRIGIDO */}
<div className="mt-6 p-4 bg-muted/30 rounded-lg">
  <h4 className="font-medium mb-2">Dados atuais:</h4>
  <div className="space-y-2 text-sm">
    <div>
      <strong>Telefones:</strong> {profile.telefones?.filter(t => t.trim()).join(', ') || 'Nenhum'}
    </div>
    <div>
      <strong>Emails:</strong> {profile.emails?.filter(e => e.trim()).join(', ') || 'Nenhum'}
    </div>
  </div>
</div>
```

### **4. Verificar o envio de dados**

No `handleSave`, certifique-se de que está enviando os arrays:

```javascript
const handleSave = useCallback(async () => {
  // ... validações ...
  
  const cleanTelefones = profile.telefones?.filter(tel => tel.trim() !== '') || [''];
  const cleanEmails = profile.emails?.filter(email => email.trim() !== '') || [''];
  
  if (apiConnected) {
    const cleanProfile = Object.fromEntries(
      Object.entries({
        ...profile,
        telefones: cleanTelefones,  // ✅ Array de telefones
        emails: cleanEmails,        // ✅ Array de emails
      }).filter(([key]) => !fieldsToExclude.includes(key))
    );
    
    console.log('🔧 Enviando dados limpos para API:', cleanProfile);
    
    const updateRequest = {
      clinica: cleanProfile
    };
    
    const updatedProfile = await ClinicService.updateProfile(updateRequest);
    setProfile(updatedProfile.clinica);
  }
}, [profile, apiConnected]);
```

## 🔍 Debugging

### **1. Teste via API direta**

Execute este comando para verificar se a API está retornando os arrays:

```bash
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
      "telefones": ["(11) 99999-9999", "(11) 88888-8888"],
      "emails": ["contato@clinica.com", "admin@clinica.com"]
    }
  }
}
```

### **2. Teste via script**

Execute o script de teste para verificar:

```bash
node test-multiple-contacts.js
```

### **3. Verificar no console do navegador**

Abra o DevTools (F12) e verifique:
- Se há erros no console
- Se os dados estão chegando corretamente
- Se os arrays estão sendo processados

## 🎯 Correções Específicas

### **Se estiver usando apenas o primeiro valor:**

```javascript
// ❌ ERRADO
const telefone = profile.telefone || '';
const email = profile.email || '';

// ✅ CORRETO
const telefones = profile.telefones || [''];
const emails = profile.emails || [''];
```

### **Se estiver exibindo apenas um campo:**

```javascript
// ❌ ERRADO - exibe apenas o primeiro
<div>{profile.telefone}</div>
<div>{profile.email}</div>

// ✅ CORRETO - exibe todos
<div>{profile.telefones?.join(', ') || 'Nenhum'}</div>
<div>{profile.emails?.join(', ') || 'Nenhum'}</div>
```

### **Se estiver salvando apenas um valor:**

```javascript
// ❌ ERRADO
const updateData = {
  clinica: {
    ...profile,
    telefone: selectedTelefone,  // String única
    email: selectedEmail         // String única
  }
};

// ✅ CORRETO
const updateData = {
  clinica: {
    ...profile,
    telefones: telefonesArray,   // Array
    emails: emailsArray          // Array
  }
};
```

## 🚀 Teste Final

Após fazer as correções:

1. **Reinicie o frontend**
2. **Abra o DevTools (F12)**
3. **Vá para a aba Console**
4. **Carregue a página do perfil**
5. **Verifique se os arrays estão sendo exibidos corretamente**

Se ainda houver problemas, me envie:
- O resultado do `console.log` dos dados
- Qualquer erro no console
- Uma captura de tela da exibição atual 