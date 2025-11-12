// test-medicamentos-espacos-dedicados.js - Teste da nova formatação com espaços dedicados
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para criar uma solicitação de teste
const createTestSolicitacao = async () => {
  const testData = {
    clinica_id: 1,
    cliente_nome: 'Paciente Teste Espaços Dedicados',
    cliente_cpf: '123.456.789-00',
    cliente_data_nascimento: '1980-01-01',
    cliente_sexo: 'Masculino',
    cliente_telefone: '(11) 99999-9999',
    cliente_email: 'teste@teste.com',
    cid_diagnostico: 'C50.9',
    cid_diagnostico_descricao: 'Neoplasia maligna da mama, não especificada',
    protocolo_tratamento: 'Protocolo Teste Espaços Dedicados',
    
    // ✅ CORREÇÃO: Medicamentos antineoplásicos (formato com ponto e vírgula)
    medicamentos_antineoplasticos: `Teste 01 100mg/m² VO D1,D7,D12,D15,D21,D25,D28,D30,D32,D69 2x; Teste 01 200mg/kg IM D8-D20 3x; Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x`,
    
    // Medicações coadjuvantes (formato com ponto e vírgula)
    medicacoes_associadas: `Ondansetrona 8mg EV 30min antes da quimioterapia; Dexametasona 8mg EV 30min antes da quimioterapia; Metoclopramida 10mg VO 3x/dia por 3 dias`,
    
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
async function testMedicamentosEspacosDedicados() {
  try {
    const solicitacaoId = await createTestSolicitacao();

    if (!solicitacaoId) {
      return;
    }

    const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`, {
      responseType: 'arraybuffer'
    });

    // 3. Salvar PDF para verificação
    const fs = require('fs');
    const fileName = `teste-medicamentos-espacos-dedicados-corrigido-${solicitacaoId}.pdf`;
    fs.writeFileSync(fileName, pdfResponse.data);
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste se o script for chamado diretamente
if (require.main === module) {
  testMedicamentosEspacosDedicados();
}

module.exports = { testMedicamentosEspacosDedicados }; 