// test-formatacao-medicamentos.js - Teste específico para formatação de medicamentos
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// ✅ FUNÇÃO DE TESTE: Formatar medicamentos manuais
const formatMedicamentosManuais = (medicamentosString) => {
  if (!medicamentosString || medicamentosString.trim() === '') return '';
  
  try {
    // Separar por ; e limpar espaços em branco
    const medicamentos = medicamentosString
      .split(';')
      .map(med => med.trim())
      .filter(med => med.length > 0);
    
    if (medicamentos.length === 0) return '';
    
    // ✅ MELHORIA: Adicionar espaçamento e formatação mais clara
    return medicamentos.map((med, index) => {
      // Adicionar numeração e espaçamento
      return `${index + 1}. ${med}`;
    }).join('\n\n'); // Dupla quebra de linha para melhor separação
    
  } catch (error) {
    console.warn('⚠️  Erro ao formatar medicamentos manuais:', error);
    return medicamentosString || '';
  }
};

async function testFormatacaoMedicamentos() {
  try {
    console.log('🧪 Testando formatação de medicamentos...\n');
    
    // Teste 1: Medicamentos simples
    const medicamentos1 = "Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x";
    console.log('📋 Teste 1 - Medicamentos simples:');
    console.log('Original:', medicamentos1);
    console.log('Formatado:');
    console.log(formatMedicamentosManuais(medicamentos1));
    console.log('');
    
    // Teste 2: Medicamentos com mais detalhes
    const medicamentos2 = "Doxorrubicina 60mg/m² EV D1 único; Ciclofosfamida 600mg/m² EV D1 único; Paclitaxel 175mg/m² EV D1 único";
    console.log('📋 Teste 2 - Medicamentos com mais detalhes:');
    console.log('Original:', medicamentos2);
    console.log('Formatado:');
    console.log(formatMedicamentosManuais(medicamentos2));
    console.log('');
    
    // Teste 3: Medicamentos com espaços extras
    const medicamentos3 = "  Oxaliplatina 85mg/m² EV D1 único  ;  Leucovorina 400mg/m² EV D1,D2 1x  ;  5-Fluorouracil 400mg/m² EV D1,D2 1x  ";
    console.log('📋 Teste 3 - Medicamentos com espaços extras:');
    console.log('Original:', medicamentos3);
    console.log('Formatado:');
    console.log(formatMedicamentosManuais(medicamentos3));
    console.log('');
    
    // Teste 4: Apenas um medicamento
    const medicamentos4 = "Oxaliplatina 85mg/m² EV D1 único";
    console.log('📋 Teste 4 - Apenas um medicamento:');
    console.log('Original:', medicamentos4);
    console.log('Formatado:');
    console.log(formatMedicamentosManuais(medicamentos4));
    console.log('');
    
    console.log('✅ Testes de formatação concluídos!');
    
    // Agora testar no PDF
    console.log('\n📄 Testando no PDF...');
    
    const dadosSolicitacao = {
      clinica_id: 1,
      hospital_nome: 'Clínica Teste Formatação',
      hospital_codigo: 'TEST002',
      cliente_nome: 'Paciente Teste Formatação',
      cliente_codigo: 'PAC002',
      sexo: 'M',
      data_nascimento: '1980-01-01',
      idade: 45,
      data_solicitacao: '2025-01-29',
      diagnostico_cid: 'C25',
      diagnostico_descricao: 'Teste de formatação de medicamentos',
      finalidade: 'curativo',
      performance_status: 'BOA',
      ciclos_previstos: 3,
      ciclo_atual: 1,
      superficie_corporal: 1.8,
      peso: 70,
      altura: 170,
      // ✅ TESTE COM MÚLTIPLOS MEDICAMENTOS
      medicamentos_antineoplasticos: 'Doxorrubicina 60mg/m² EV D1 único; Ciclofosfamida 600mg/m² EV D1 único; Paclitaxel 175mg/m² EV D1 único',
      dose_por_m2: '60mg/m²',
      dose_total: '835mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1 a cada 21 dias',
      medico_assinatura_crm: 'CRM 123456/SP'
    };
    
    console.log('📤 Criando solicitação de teste...');
    const createResponse = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);
    
    if (createResponse.data.success) {
      const solicitacaoId = createResponse.data.data.id;
      console.log('✅ Solicitação criada com ID:', solicitacaoId);
      
      // Gerar PDF
      console.log('📄 Gerando PDF...');
      const pdfResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/pdf`, {
        responseType: 'arraybuffer'
      });
      
      console.log('✅ PDF gerado com sucesso!');
      console.log('📏 Tamanho do PDF:', (pdfResponse.data.length / 1024).toFixed(2), 'KB');
      
      // Salvar PDF para verificação
      const fs = require('fs');
      const fileName = `teste-formatacao-medicamentos-${solicitacaoId}.pdf`;
      fs.writeFileSync(fileName, pdfResponse.data);
      console.log('💾 PDF salvo como:', fileName);
      console.log('👀 Abra o arquivo para verificar se os medicamentos aparecem em linhas separadas e numeradas');
      
    } else {
      console.log('❌ Erro ao criar solicitação:', createResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
}

// Executar teste
testFormatacaoMedicamentos(); 