// test-formatacao-tabular.js - Teste para formatação tabular de medicamentos
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// ✅ FUNÇÃO DE TESTE: Formatar medicamentos manuais com estrutura tabular
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
      
      if (partes.length >= 6) {
        // Formato estruturado
        const nome = partes[0];
        const dose = partes[1];
        const unidade = partes[2];
        const via = partes[3];
        const dias = partes[4];
        const frequencia = partes.slice(5).join(' ');
        
        return `MEDICAMENTO ${index + 1}:
• Nome: ${nome}
• Dose: ${dose} ${unidade}
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

async function testFormatacaoTabular() {
  try {
    // Teste 1: Medicamentos com formato estruturado
    const medicamentos1 = "Doxorrubicina 60mg/m² EV D1 único; Ciclofosfamida 600mg/m² EV D1 único; Paclitaxel 175mg/m² EV D1 único";

    // Teste 2: Medicamentos com formato simples
    const medicamentos2 = "Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x";

    // Teste 3: Medicamentos com observações
    const medicamentos3 = "Carboplatina AUC6 EV D1 único; Paclitaxel 175mg/m² EV D1 único";

    const dadosSolicitacao = {
      clinica_id: 1,
      hospital_nome: 'Clínica Teste Tabular',
      hospital_codigo: 'TEST003',
      cliente_nome: 'Paciente Teste Tabular',
      cliente_codigo: 'PAC003',
      sexo: 'M',
      data_nascimento: '1980-01-01',
      idade: 45,
      data_solicitacao: '2025-01-29',
      diagnostico_cid: 'C25',
      diagnostico_descricao: 'Teste de formatação tabular',
      finalidade: 'curativo',
      performance_status: 'BOA',
      ciclos_previstos: 3,
      ciclo_atual: 1,
      superficie_corporal: 1.8,
      peso: 70,
      altura: 170,
      // ✅ TESTE COM MÚLTIPLOS MEDICAMENTOS ESTRUTURADOS
      medicamentos_antineoplasticos: 'Doxorrubicina 60mg/m² EV D1 único; Ciclofosfamida 600mg/m² EV D1 único; Paclitaxel 175mg/m² EV D1 único',
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
      const fileName = `teste-formatacao-tabular-${solicitacaoId}.pdf`;
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
testFormatacaoTabular(); 