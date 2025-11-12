// test-simple.js - Teste simples para verificar formatação de medicamentos
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testMedicamentosFormatacao() {
  try {
    // Dados de teste mais simples
    const dadosSolicitacao = {
      clinica_id: 1,
      hospital_nome: 'Clínica Teste',
      hospital_codigo: 'TEST001',
      cliente_nome: 'Paciente Teste',
      cliente_codigo: 'PAC001',
      sexo: 'M',
      data_nascimento: '1980-01-01',
      idade: 45,
      data_solicitacao: '2025-01-29',
      diagnostico_cid: 'C25',
      diagnostico_descricao: 'Teste de formatação',
      finalidade: 'curativo',
      performance_status: 'BOA',
      ciclos_previstos: 3,
      ciclo_atual: 1,
      superficie_corporal: 1.8,
      peso: 70,
      altura: 170,
      // ✅ MEDICAMENTOS SEPARADOS POR ; - DEVE APARECER EM LINHAS SEPARADAS NO PDF
      medicamentos_antineoplasticos: 'Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x; 5-Fluorouracil 400mg/m² EV D1,D2 1x',
      dose_por_m2: '85mg/m²',
      dose_total: '170mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1,D2 a cada 14 dias',
      medico_assinatura_crm: 'CRM 123456/SP'
    };

    // Criar solicitação
    const createResponse = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);

    if (createResponse.data.success) {
      const solicitacaoId = createResponse.data.data.id;
      const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`, {
        responseType: 'arraybuffer'
      });

      // Salvar PDF para verificação
      const fs = require('fs');
      const fileName = `teste-medicamentos-${solicitacaoId}.pdf`;
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
testMedicamentosFormatacao();