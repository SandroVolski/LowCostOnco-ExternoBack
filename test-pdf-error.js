// test-pdf-error.js - Script para testar e identificar erro na geração de PDF
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para testar a geração de PDF
async function testPDFGeneration() {
  try {
    const solicitacoesResponse = await axios.get(`${API_BASE_URL}/solicitacoes`);

    if (!solicitacoesResponse.data.success || !solicitacoesResponse.data.data.length) {
      return;
    }

    const solicitacoes = solicitacoesResponse.data.data;

    // 2. Pegar a primeira solicitação
    const primeiraSolicitacao = solicitacoes[0];

    const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${primeiraSolicitacao.id}/pdf`, {
      responseType: 'arraybuffer',
      timeout: 60000 // 60 segundos de timeout
    });

    // 4. Salvar PDF para verificação
    const fs = require('fs');
    const fileName = `test-pdf-success-${primeiraSolicitacao.id}.pdf`;
    fs.writeFileSync(fileName, pdfResponse.data);
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);

    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Headers:', error.response.headers);
      
      // Tentar ler o corpo da resposta de erro
      try {
        const errorBody = error.response.data.toString();
        console.error('📋 Error Body:', errorBody);
      } catch (e) {
        console.error('📋 Error Body: Não foi possível ler');
      }
    }
  }
}

// Função para testar especificamente a formatação de medicamentos
async function testMedicamentosFormat() {
  try {
    // Buscar uma solicitação com medicamentos
    const solicitacoesResponse = await axios.get(`${API_BASE_URL}/solicitacoes`);

    if (!solicitacoesResponse.data.success || !solicitacoesResponse.data.data.length) {
      return;
    }

    const solicitacoes = solicitacoesResponse.data.data;

    // Encontrar uma solicitação com medicamentos antineoplásicos
    const solicitacaoComMedicamentos = solicitacoes.find(s => s.medicamentos_antineoplasticos);

    if (!solicitacaoComMedicamentos) {
      return;
    }

    const solicitacaoResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoComMedicamentos.id}`);

    if (solicitacaoResponse.data.success) {} else {}
  } catch (error) {
    console.error('❌ Erro ao testar formatação:', error.message);
  }
}

// Executar testes
async function runTests() {
  await testPDFGeneration();
  await testMedicamentosFormat();
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests();
}

module.exports = { testPDFGeneration, testMedicamentosFormat }; 