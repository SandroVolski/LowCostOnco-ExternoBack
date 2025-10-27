// create-test-solicitacao.js - Script para criar solicitação de teste e testar PDF
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para criar uma solicitação de teste
const createTestSolicitacao = async () => {
  const testData = {
    clinica_id: 1,
    cliente_nome: 'Paciente Teste Erro PDF',
    cliente_cpf: '123.456.789-00',
    cliente_data_nascimento: '1980-01-01',
    cliente_sexo: 'Masculino',
    cliente_telefone: '(11) 99999-9999',
    cliente_email: 'teste@teste.com',
    cid_diagnostico: 'C50.9',
    cid_diagnostico_descricao: 'Neoplasia maligna da mama, não especificada',
    protocolo_tratamento: 'Protocolo Teste Erro PDF',
    hospital_nome: 'Hospital Teste',
    diagnostico_cid: 'C50.9',
    
    // Medicamentos antineoplásicos (formato simples para teste)
    medicamentos_antineoplasticos: 'Teste 01 100mg/m² VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x',
    
    // Medicações coadjuvantes (formato simples para teste)
    medicacoes_associadas: 'Ondansetrona 8mg EV 30min antes da quimioterapia',
    
    medico_nome: 'Dr. João Silva',
    medico_crm: 'CRM 123456/SP',
    medico_assinatura_crm: 'CRM 123456/SP',
    status: 'pendente'
  };

  try {
    console.log('🔧 Criando solicitação de teste...');
    const response = await axios.post(`${API_BASE_URL}/solicitacoes`, testData);
    if (response.data.success) {
      console.log('✅ Solicitação criada com sucesso!');
      console.log('📋 ID:', response.data.data.id);
      return response.data.data.id;
    } else {
      console.log('❌ Erro ao criar solicitação:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
    return null;
  }
};

// Função para testar a geração de PDF
async function testPDFGeneration(solicitacaoId) {
  console.log(`\n🔍 Testando geração de PDF para solicitação ID: ${solicitacaoId}...\n`);
  
  try {
    // Testar geração de PDF
    console.log('🔗 URL:', `${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`);
    
    const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`, {
      responseType: 'arraybuffer',
      timeout: 60000 // 60 segundos de timeout
    });
    
    console.log('✅ PDF gerado com sucesso!');
    console.log('📏 Tamanho:', (pdfResponse.data.length / 1024).toFixed(2), 'KB');
    console.log('📋 Content-Type:', pdfResponse.headers['content-type']);
    
    // Salvar PDF para verificação
    const fs = require('fs');
    const fileName = `test-pdf-success-${solicitacaoId}.pdf`;
    fs.writeFileSync(fileName, pdfResponse.data);
    console.log('💾 PDF salvo como:', fileName);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro durante a geração de PDF:', error.message);
    
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
    
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Criando solicitação de teste e testando geração de PDF...\n');
  
  // 1. Criar solicitação de teste
  const solicitacaoId = await createTestSolicitacao();
  
  if (!solicitacaoId) {
    console.log('❌ Não foi possível criar solicitação de teste');
    return;
  }
  
  // 2. Testar geração de PDF
  const pdfSuccess = await testPDFGeneration(solicitacaoId);
  
  if (pdfSuccess) {
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('✅ Solicitação criada');
    console.log('✅ PDF gerado');
  } else {
    console.log('\n❌ Teste falhou!');
    console.log('✅ Solicitação criada');
    console.log('❌ PDF não foi gerado');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { createTestSolicitacao, testPDFGeneration }; 