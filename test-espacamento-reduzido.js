// test-espacamento-reduzido.js - Teste para verificar espaçamento reduzido
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testEspacamentoReduzido() {
  try {
    console.log('🧪 Testando espaçamento reduzido entre seções...\n');
    
    const dadosSolicitacao = {
      clinica_id: 1,
      hospital_nome: 'Clínica Teste Espaçamento',
      hospital_codigo: 'TEST009',
      cliente_nome: 'Paciente Teste Espaçamento',
      cliente_codigo: 'PAC009',
      sexo: 'M',
      data_nascimento: '1980-01-01',
      idade: 45,
      data_solicitacao: '2025-01-29',
      diagnostico_cid: 'C25',
      diagnostico_descricao: 'Adenocarcinoma de pâncreas',
      
      // Campos específicos para testar
      local_metastases: 'Fígado, pulmão e ossos',
      estagio_t: 'T3',
      estagio_n: 'N1',
      estagio_m: 'M1',
      estagio_clinico: 'IV',
      
      // Tratamentos anteriores
      tratamento_cirurgia_radio: 'Não realizado',
      tratamento_quimio_adjuvante: 'Não realizado',
      tratamento_quimio_primeira_linha: 'FOLFIRINOX - 6 ciclos',
      tratamento_quimio_segunda_linha: 'Gemcitabina + Nab-paclitaxel - 4 ciclos',
      
      // Protocolo terapêutico
      finalidade: 'paliativo',
      performance_status: 'BOA',
      siglas: 'FOLFIRINOX',
      ciclos_previstos: 6,
      ciclo_atual: 1,
      superficie_corporal: 1.8,
      peso: 70,
      altura: 170,
      
      // Medicamentos antineoplásicos
      medicamentos_antineoplasticos: 'Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x; Irinotecano 180mg/m² EV D1 único',
      dose_por_m2: '85mg/m²',
      dose_total: '153mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1 a cada 14 dias',
      
      // Medicações coadjuvantes
      medicacoes_associadas: 'Ondansetrona 8mg EV 30min antes da quimioterapia\nDexametasona 8mg EV 30min antes da quimioterapia\nMetoclopramida 10mg VO 3x/dia por 3 dias\nPantoprazol 40mg VO 1x/dia\nFilgrastim 300mcg SC D3-D7',
      
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
      const fileName = `teste-espacamento-reduzido-${solicitacaoId}.pdf`;
      fs.writeFileSync(fileName, pdfResponse.data);
      console.log('💾 PDF salvo como:', fileName);
      
      console.log('\n📋 Espaçamentos reduzidos:');
      console.log('✅ 1. Seções: margin-bottom de 8px → 4px');
      console.log('✅ 2. Section-header: padding de 8px → 6px');
      console.log('✅ 3. Section-content: padding de 12px → 8px 12px');
      console.log('✅ 4. Grids: gap de 8px → 6px, margin-bottom de 8px → 6px');
      console.log('✅ 5. Info-items: margin-bottom de 6px → 4px');
      console.log('✅ 6. Info-labels: margin-bottom de 3px → 2px');
      console.log('✅ 7. Info-values: padding de 6px 8px → 4px 8px, min-height de 18px → 16px');
      console.log('✅ 8. Text-area-value: padding de 10px 12px → 8px 10px, min-height de 40px → 35px');
      console.log('✅ 9. Body: padding de 15px 25px 20px 25px → 10px 20px 15px 20px');
      console.log('');
      console.log('👀 Abra o arquivo PDF para verificar se o espaçamento está mais compacto');
      
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
testEspacamentoReduzido(); 