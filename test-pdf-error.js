// test-pdf-error.js - Script para testar e identificar erro na geração de PDF
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para testar a geração de PDF
async function testPDFGeneration() {
  console.log('🔍 Testando geração de PDF para identificar erro...\n');
  
  try {
    // 1. Primeiro, vamos buscar uma solicitação existente
    console.log('1️⃣ Buscando solicitações existentes...');
    const solicitacoesResponse = await axios.get(`${API_BASE_URL}/solicitacoes`);
    
    if (!solicitacoesResponse.data.success || !solicitacoesResponse.data.data.length) {
      console.log('❌ Nenhuma solicitação encontrada');
      return;
    }
    
    const solicitacoes = solicitacoesResponse.data.data;
    console.log(`✅ Encontradas ${solicitacoes.length} solicitações`);
    
    // 2. Pegar a primeira solicitação
    const primeiraSolicitacao = solicitacoes[0];
    console.log(`📋 Testando com solicitação ID: ${primeiraSolicitacao.id}`);
    console.log(`📋 Cliente: ${primeiraSolicitacao.cliente_nome}`);
    console.log(`📋 Medicamentos antineoplásicos: ${primeiraSolicitacao.medicamentos_antineoplasticos ? 'Sim' : 'Não'}`);
    
    // 3. Testar geração de PDF
    console.log('\n2️⃣ Testando geração de PDF...');
    console.log('🔗 URL:', `${API_BASE_URL}/solicitacoes/${primeiraSolicitacao.id}/pdf`);
    
    const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${primeiraSolicitacao.id}/pdf`, {
      responseType: 'arraybuffer',
      timeout: 60000 // 60 segundos de timeout
    });
    
    console.log('✅ PDF gerado com sucesso!');
    console.log('📏 Tamanho:', (pdfResponse.data.length / 1024).toFixed(2), 'KB');
    console.log('📋 Content-Type:', pdfResponse.headers['content-type']);
    
    // 4. Salvar PDF para verificação
    const fs = require('fs');
    const fileName = `test-pdf-success-${primeiraSolicitacao.id}.pdf`;
    fs.writeFileSync(fileName, pdfResponse.data);
    console.log('💾 PDF salvo como:', fileName);
    
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
    
    console.log('\n💡 Possíveis causas do erro:');
    console.log('1. Servidor não está rodando');
    console.log('2. Erro na função de formatação de medicamentos');
    console.log('3. Erro no Puppeteer');
    console.log('4. Erro na geração do HTML');
    console.log('5. Timeout na geração do PDF');
  }
}

// Função para testar especificamente a formatação de medicamentos
async function testMedicamentosFormat() {
  console.log('\n🔍 Testando especificamente a formatação de medicamentos...\n');
  
  try {
    // Buscar uma solicitação com medicamentos
    const solicitacoesResponse = await axios.get(`${API_BASE_URL}/solicitacoes`);
    
    if (!solicitacoesResponse.data.success || !solicitacoesResponse.data.data.length) {
      console.log('❌ Nenhuma solicitação encontrada');
      return;
    }
    
    const solicitacoes = solicitacoesResponse.data.data;
    
    // Encontrar uma solicitação com medicamentos antineoplásicos
    const solicitacaoComMedicamentos = solicitacoes.find(s => s.medicamentos_antineoplasticos);
    
    if (!solicitacaoComMedicamentos) {
      console.log('❌ Nenhuma solicitação com medicamentos encontrada');
      return;
    }
    
    console.log(`📋 Testando formatação com solicitação ID: ${solicitacaoComMedicamentos.id}`);
    console.log(`📋 Medicamentos antineoplásicos:`);
    console.log(solicitacaoComMedicamentos.medicamentos_antineoplasticos);
    
    // Testar apenas a busca da solicitação (sem gerar PDF)
    console.log('\n3️⃣ Testando busca da solicitação...');
    const solicitacaoResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoComMedicamentos.id}`);
    
    if (solicitacaoResponse.data.success) {
      console.log('✅ Solicitação encontrada com sucesso');
      console.log('📋 Dados da solicitação:', {
        id: solicitacaoResponse.data.data.id,
        cliente: solicitacaoResponse.data.data.cliente_nome,
        temMedicamentos: !!solicitacaoResponse.data.data.medicamentos_antineoplasticos
      });
    } else {
      console.log('❌ Erro ao buscar solicitação');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar formatação:', error.message);
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes para identificar erro na geração de PDF...\n');
  
  await testPDFGeneration();
  await testMedicamentosFormat();
  
  console.log('\n📋 Resumo dos testes concluído');
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests();
}

module.exports = { testPDFGeneration, testMedicamentosFormat }; 