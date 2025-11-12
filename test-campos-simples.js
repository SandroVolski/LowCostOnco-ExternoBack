// test-campos-simples.js - Teste simples para campos específicos
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testCamposSimples() {
  try {
    const dadosSolicitacao = {
      clinica_id: 1,
      hospital_nome: 'Clínica Teste',
      hospital_codigo: 'TEST007',
      cliente_nome: 'Paciente Teste',
      cliente_codigo: 'PAC007',
      sexo: 'M',
      data_nascimento: '1980-01-01',
      idade: 45,
      data_solicitacao: '2025-01-29',
      diagnostico_cid: 'C25',
      diagnostico_descricao: 'Adenocarcinoma de pâncreas',
      
      // ✅ CAMPO 1: LOCALIZAÇÃO DE METÁSTASES (Seção 2)
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
      medicamentos_antineoplasticos: 'Oxaliplatina 85mg/m² EV D1 único; Leucovorina 400mg/m² EV D1,D2 1x',
      dose_por_m2: '85mg/m²',
      dose_total: '153mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1 a cada 14 dias',
      
      // ✅ CAMPO 2: MEDICAÇÕES COADJUVANTES E SUPORTE (Seção 6)
      medicacoes_associadas: 'Ondansetrona 8mg EV 30min antes da quimioterapia\nDexametasona 8mg EV 30min antes da quimioterapia\nMetoclopramida 10mg VO 3x/dia por 3 dias',
      
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
      const fileName = `teste-campos-simples-${solicitacaoId}.pdf`;
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
testCamposSimples(); 