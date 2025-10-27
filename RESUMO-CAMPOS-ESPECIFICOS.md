# ✅ CAMPOS ESPECÍFICOS DO FRONTEND - IMPLEMENTAÇÃO NO PDF

## 🎯 Campos Específicos Identificados

### 1. **"LOCALIZAÇÃO DE METÁSTASES"** - Seção 2
- **Campo no banco:** `local_metastases`
- **Localização no PDF:** Seção 2 - Diagnóstico e Estadiamento
- **Linha no código:** 753-758 do `pdfGenerator.ts`
- **Implementação:** ✅ Já implementado

```typescript
${solicitacao.local_metastases ? `
<div class="info-item">
    <span class="info-label">Localização de Metástases</span>
    <div class="text-area-value">${solicitacao.local_metastases}</div>
</div>
` : ''}
```

### 2. **"MEDICAÇÕES COADJUVANTES E SUPORTE"** - Seção 6
- **Campo no banco:** `medicacoes_associadas`
- **Localização no PDF:** Seção 6 - Medicações Coadjuvantes e Suporte
- **Linha no código:** 914-925 do `pdfGenerator.ts`
- **Implementação:** ✅ Já implementado

```typescript
${solicitacao.medicacoes_associadas ? `
<!-- Seção 6: Medicações Coadjuvantes -->
<div class="section">
    <div class="section-header">
        <div class="section-title">
            <div class="section-number">6</div>
            Medicações Coadjuvantes e Suporte
        </div>
    </div>
    <div class="section-content">
        <div class="text-area-value">${solicitacao.medicacoes_associadas}</div>
    </div>
</div>
` : ''}
```

## 📋 Estrutura do PDF

### **Seção 2: Diagnóstico e Estadiamento**
```
2. DIAGNÓSTICO E ESTADIAMENTO
   • CID: C25
   • Descrição: Adenocarcinoma de pâncreas
   • Localização de Metástases: Fígado, pulmão e ossos  ← ✅ AQUI
   • Tumor (T): T3
   • Linfonodos (N): N1
   • Metástase (M): M1
   • Estágio Clínico: IV
```

### **Seção 6: Medicações Coadjuvantes e Suporte**
```
6. MEDICAÇÕES COADJUVANTES E SUPORTE
   • Ondansetrona 8mg EV 30min antes da quimioterapia
   • Dexametasona 8mg EV 30min antes da quimioterapia
   • Metoclopramida 10mg VO 3x/dia por 3 dias
   • Pantoprazol 40mg VO 1x/dia
   • Filgrastim 300mcg SC D3-D7  ← ✅ AQUI
```

## 🔧 Como Funciona

### **No Frontend:**
1. Campo `local_metastases` é preenchido na seção de diagnóstico
2. Campo `medicacoes_associadas` é preenchido na seção de medicações coadjuvantes
3. Dados são enviados para o backend via API

### **No Backend:**
1. Campos são salvos no banco de dados
2. PDF é gerado usando os valores dos campos
3. Seção 2 mostra `local_metastases` quando preenchido
4. Seção 6 mostra `medicacoes_associadas` quando preenchido

### **No PDF:**
1. **Seção 2:** Campo aparece automaticamente se preenchido
2. **Seção 6:** Seção inteira aparece automaticamente se `medicacoes_associadas` for preenchido

## ✅ Status da Implementação

### ✅ **Campos Já Implementados:**
- `local_metastases` → Seção 2 ✅
- `medicacoes_associadas` → Seção 6 ✅

### ✅ **Formatação:**
- Ambos os campos usam a classe `text-area-value`
- Preservam quebras de linha (`\n`)
- Formatação consistente com outros campos

### ✅ **Condicionais:**
- Seção 2: Campo aparece apenas se `local_metastases` for preenchido
- Seção 6: Seção inteira aparece apenas se `medicacoes_associadas` for preenchido

## 📝 Exemplo de Uso

### **Dados do Frontend:**
```javascript
{
  local_metastases: "Fígado, pulmão e ossos",
  medicacoes_associadas: "Ondansetrona 8mg EV 30min antes da quimioterapia\nDexametasona 8mg EV 30min antes da quimioterapia\nMetoclopramida 10mg VO 3x/dia por 3 dias"
}
```

### **Resultado no PDF:**
```
2. DIAGNÓSTICO E ESTADIAMENTO
   • Localização de Metástases: Fígado, pulmão e ossos

6. MEDICAÇÕES COADJUVANTES E SUPORTE
   • Ondansetrona 8mg EV 30min antes da quimioterapia
   • Dexametasona 8mg EV 30min antes da quimioterapia
   • Metoclopramida 10mg VO 3x/dia por 3 dias
```

## 🎉 Conclusão

Os campos específicos que você mencionou **já estão implementados** no PDF:

1. ✅ **"LOCALIZAÇÃO DE METÁSTASES"** - Aparece na **Seção 2**
2. ✅ **"MEDICAÇÕES COADJUVANTES E SUPORTE"** - Aparece na **Seção 6**

Ambos os campos são opcionais e aparecem automaticamente quando preenchidos no frontend. A formatação está consistente com o resto do documento e preserva quebras de linha quando necessário. 