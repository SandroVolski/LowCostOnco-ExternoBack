// test-parsing-medicamentos.js - Teste específico para parsing de medicamentos
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// ✅ FUNÇÃO DE TESTE: Formatar medicamentos manuais com parsing melhorado
const formatMedicamentosManuais = (medicamentosString) => {
  if (!medicamentosString || medicamentosString.trim() === '') return '';
  
  try {
    // Separar por ; e limpar espaços em branco
    const medicamentos = medicamentosString
      .split(';')
      .map(med => med.trim())
      .filter(med => med.length > 0);
    
    if (medicamentos.length === 0) return '';
    
    // ✅ NOVA FORMATAÇÃO: Estrutura tabular para medicamentos manuais
    return medicamentos.map((med, index) => {
      // Tentar extrair informações do medicamento manual
      // Formato esperado: "Nome Dose Unidade Via Dias Frequencia"
      const partes = med.split(' ');
      
      // Padrão mais flexível para extrair informações
      let nome = '';
      let dose = '';
      let unidade = '';
      let via = '';
      let dias = '';
      let frequencia = '';
      
      if (partes.length >= 6) {
        // Tentar extrair baseado em padrões conhecidos
        const viaPatterns = ['EV', 'VO', 'IM', 'SC', 'IT', 'IP', 'TOP'];
        const unidadePatterns = ['mg', 'mg/m²', 'mg/kg', 'AUC', 'UI', 'mcg', 'ml', 'g'];
        
        // Encontrar via de administração
        const viaIndex = partes.findIndex(part => viaPatterns.includes(part));
        if (viaIndex !== -1) {
          via = partes[viaIndex];
          
          // Nome é tudo antes da dose
          const doseIndex = partes.findIndex(part => /^\d+/.test(part));
          if (doseIndex !== -1) {
            nome = partes.slice(0, doseIndex).join(' ');
            dose = partes[doseIndex];
            
            // Unidade pode estar junto com a dose ou separada
            if (doseIndex + 1 < partes.length) {
              const nextPart = partes[doseIndex + 1];
              if (unidadePatterns.some(u => nextPart.includes(u))) {
                unidade = nextPart;
                dose += unidade;
                // Dias e frequência são o resto
                const restParts = partes.slice(doseIndex + 2);
                if (restParts.length >= 2) {
                  dias = restParts[0];
                  frequencia = restParts.slice(1).join(' ');
                }
              } else {
                // Dias e frequência são o resto
                const restParts = partes.slice(doseIndex + 1);
                if (restParts.length >= 2) {
                  dias = restParts[0];
                  frequencia = restParts.slice(1).join(' ');
                }
              }
            }
          }
        }
      }
      
      // Se conseguiu extrair informações estruturadas
      if (nome && dose && via) {
        return `MEDICAMENTO ${index + 1}:
• Nome: ${nome}
• Dose: ${dose}
• Via de Administração: ${via}
• Dias de Administração: ${dias}
• Frequência: ${frequencia}`;
      } else {
        // Formato simples - mostrar como está
        return `MEDICAMENTO ${index + 1}:
• Prescrição: ${med}`;
      }
    }).join('\n\n');
    
  } catch (error) {
    console.warn('⚠️  Erro ao formatar medicamentos manuais:', error);
    return medicamentosString || '';
  }
};

async function testParsingMedicamentos() {
  try {
    // Teste 1: Medicamentos com formato padrão
    const medicamentos1 = "Doxorrubicina 60 mg/m² EV D1 único; Ciclofosfamida 600 mg/m² EV D1 único; Paclitaxel 175 mg/m² EV D1 único";

    // Teste 2: Medicamentos com formato compacto
    const medicamentos2 = "Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x";

    // Teste 3: Medicamentos com formato complexo
    const medicamentos3 = "Carboplatina AUC6 EV D1 único; Paclitaxel 175mg/m² EV D1 único";

    // Teste 4: Medicamentos com formato simples
    const medicamentos4 = "Teste 01 100mg VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x; Teste 01 200mg IM D8-D20 3x";

    const dadosSolicitacao = {
      clinica_id: 1,
      hospital_nome: 'Clínica Teste Parsing',
      hospital_codigo: 'TEST004',
      cliente_nome: 'Paciente Teste Parsing',
      cliente_codigo: 'PAC004',
      sexo: 'M',
      data_nascimento: '1980-01-01',
      idade: 45,
      data_solicitacao: '2025-01-29',
      diagnostico_cid: 'C25',
      diagnostico_descricao: 'Teste de parsing de medicamentos',
      finalidade: 'curativo',
      performance_status: 'BOA',
      ciclos_previstos: 3,
      ciclo_atual: 1,
      superficie_corporal: 1.8,
      peso: 70,
      altura: 170,
      // ✅ TESTE COM DIFERENTES FORMATOS
      medicamentos_antineoplasticos: 'Doxorrubicina 60 mg/m² EV D1 único; Ciclofosfamida 600 mg/m² EV D1 único; Paclitaxel 175 mg/m² EV D1 único',
      dose_por_m2: '60mg/m²',
      dose_total: '835mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1 a cada 21 dias',
      medico_assinatura_crm: 'CRM 123456/SP'
    };

    const createResponse = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);

    if (createResponse.data.success) {
      const solicitacaoId = createResponse.data.data.id;
      const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`, {
        responseType: 'arraybuffer'
      });

      // Salvar PDF para verificação
      const fs = require('fs');
      const fileName = `teste-parsing-medicamentos-${solicitacaoId}.pdf`;
      fs.writeFileSync(fileName, pdfResponse.data);
    } else {}
  } catch (error) {
    console.error('❌ Erro no teste:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
}

// Executar teste
testParsingMedicamentos(); 