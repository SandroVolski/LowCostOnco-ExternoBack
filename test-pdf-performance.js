// test-pdf-performance.js - Script para testar performance de PDFs
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para medir tempo de resposta
const measureResponseTime = async (url, description) => {
  const startTime = Date.now();
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000
    });
    const endTime = Date.now();
    const duration = endTime - startTime;

    return { success: true, duration, size: response.data.length };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    return { success: false, duration, error: error.message };
  }
};

// Função para criar uma solicitação de teste
const createTestSolicitacao = async () => {
  const testData = {
    clinica_id: 1,
    cliente_nome: 'Paciente Teste Performance',
    cliente_cpf: '123.456.789-00',
    cliente_data_nascimento: '1980-01-01',
    cliente_sexo: 'Masculino',
    cliente_telefone: '(11) 99999-9999',
    cliente_email: 'teste@teste.com',
    cid_diagnostico: 'C50.9',
    cid_diagnostico_descricao: 'Neoplasia maligna da mama, não especificada',
    protocolo_tratamento: 'Protocolo Teste',
    medicacoes_protocolo: 'Oxaliplatina 85mg/m² EV D1 único\nLeucovorina 400mg/m² EV D1,D2 1x\n5-Fluorouracil 400mg/m² EV D1,D2 1x',
    medicacoes_associadas: 'Ondansetrona 8mg EV 30min antes da quimioterapia\nDexametasona 8mg EV 30min antes da quimioterapia',
    medico_nome: 'Dr. João Silva',
    medico_crm: 'CRM 123456/SP',
    medico_assinatura_crm: 'CRM 123456/SP',
    status: 'pendente'
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/solicitacoes`, testData);
    if (response.data.success) {
      return response.data.data.id;
    }
  } catch (error) {
    console.error('Erro ao criar solicitação de teste:', error.message);
  }
  return null;
};

// Função principal de teste
async function testPDFPerformance() {
  try {
    const solicitacaoId = await createTestSolicitacao();

    if (!solicitacaoId) {
      return;
    }

    const downloadResult1 = await measureResponseTime(
      `${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`,
      'Download (sem cache)'
    );

    const viewResult1 = await measureResponseTime(
      `${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf?view=true`,
      'Visualização (sem cache)'
    );

    const downloadResult2 = await measureResponseTime(
      `${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`,
      'Download (com cache)'
    );

    const viewResult2 = await measureResponseTime(
      `${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf?view=true`,
      'Visualização (com cache)'
    );

    const concurrentPromises = [];

    for (let i = 0; i < 3; i++) {
      concurrentPromises.push(
        measureResponseTime(
          `${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`,
          `Download simultâneo #${i + 1}`
        )
      );
    }

    const concurrentResults = await Promise.all(concurrentPromises);

    if (downloadResult1.success && viewResult1.success) {
      const downloadTime = downloadResult1.duration;
      const viewTime = viewResult1.duration;
      const difference = viewTime - downloadTime;
      const percentage = ((difference / downloadTime) * 100).toFixed(1);

      if (difference > 0) {} else {}
    }

    if (downloadResult2.success && downloadResult1.success) {
      const cacheImprovement = downloadResult1.duration - downloadResult2.duration;
      const cachePercentage = ((cacheImprovement / downloadResult1.duration) * 100).toFixed(1);
    }

    // 8. Estatísticas das requisições simultâneas
    const successfulConcurrent = concurrentResults.filter(r => r.success);
    if (successfulConcurrent.length > 0) {
      const avgConcurrentTime = successfulConcurrent.reduce((sum, r) => sum + r.duration, 0) / successfulConcurrent.length;
    }
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  testPDFPerformance();
}

module.exports = { testPDFPerformance, measureResponseTime }; 