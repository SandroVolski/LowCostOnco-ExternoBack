// test-frontend-simulation.js - Simula exatamente o que o frontend está enviando

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testFrontendSimulation() {
  try {
    console.log('🧪 Simulando envio do frontend com paciente selecionado...');
    
    // Dados exatamente como o frontend está enviando (baseado no seu exemplo)
    const dadosSolicitacao = {
      clinica_id: 1,
      paciente_id: 6, // ID do paciente "Teste Status" que você mencionou
      hospital_nome: 'Clínica Oncológica Irati PR',
      hospital_codigo: 'COSP002',
      cliente_nome: 'Teste Status', // Mesmo nome do paciente
      cliente_codigo: '678',
      sexo: 'F',
      data_nascimento: '1990-08-25',
      idade: 34,
      data_solicitacao: '2025-07-23',
      diagnostico_cid: '456',
      diagnostico_descricao: 'Diagnóstico',
      local_metastases: 'Fígado',
      estagio_t: '1',
      estagio_n: '0',
      estagio_m: '1',
      estagio_clinico: '1',
      tratamento_cirurgia_radio: 'Cirurgia ou Radioterapia',
      tratamento_quimio_adjuvante: 'Cirurgia ou Radioterapia',
      tratamento_quimio_primeira_linha: 'Cirurgia ou Radioterapia',
      tratamento_quimio_segunda_linha: 'Cirurgia ou Radioterapia',
      finalidade: 'curativo',
      performance_status: 'Totalmente capaz',
      siglas: 'CU',
      ciclos_previstos: 2,
      ciclo_atual: 2,
      superficie_corporal: 1.00,
      peso: 90.00,
      altura: 1,
      medicamentos_antineoplasticos: 'Medicamentos antineoplásticos',
      dose_por_m2: '2',
      dose_total: '2',
      via_administracao: '2',
      dias_aplicacao_intervalo: '2',
      medicacoes_associadas: 'Medicações Associadas',
      medico_assinatura_crm: '25112003'
    };
    
    console.log('📤 Dados que o frontend está enviando:', {
      paciente_id: dadosSolicitacao.paciente_id,
      tipo_paciente_id: typeof dadosSolicitacao.paciente_id,
      cliente_nome: dadosSolicitacao.cliente_nome,
      clinica_id: dadosSolicitacao.clinica_id
    });
    
    const response = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);
    
    console.log('✅ Resposta do servidor:', {
      success: response.data.success,
      message: response.data.message,
      paciente_id_salvo: response.data.data?.paciente_id,
      tipo_paciente_id_salvo: typeof response.data.data?.paciente_id,
      id_solicitacao: response.data.data?.id
    });
    
    // Buscar a solicitação criada para verificar
    const solicitacaoId = response.data.data.id;
    const getResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}`);
    
    console.log('🔍 Dados da solicitação recuperada:', {
      id: getResponse.data.data.id,
      paciente_id: getResponse.data.data.paciente_id,
      tipo_paciente_id: typeof getResponse.data.data.paciente_id,
      cliente_nome: getResponse.data.data.cliente_nome,
      clinica_id: getResponse.data.data.clinica_id
    });
    
    // Verificar se o paciente existe
    console.log('\n🔍 Verificando se o paciente ID 6 existe...');
    try {
      const pacienteResponse = await axios.get(`${API_BASE_URL}/pacientes/6`);
      console.log('✅ Paciente encontrado:', {
        id: pacienteResponse.data.data.id,
        nome: pacienteResponse.data.data.Paciente_Nome,
        codigo: pacienteResponse.data.data.Codigo
      });
    } catch (error) {
      console.log('❌ Paciente não encontrado ou erro:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
}

// Teste com paciente_id como string (possível problema do frontend)
async function testWithStringPacienteId() {
  try {
    console.log('\n🧪 Testando com paciente_id como string (possível problema do frontend)...');
    
    const dadosSolicitacao = {
      clinica_id: 1,
      paciente_id: "6", // String em vez de número
      hospital_nome: 'Clínica Oncológica Irati PR',
      hospital_codigo: 'COSP002',
      cliente_nome: 'Teste Status String',
      cliente_codigo: '679',
      sexo: 'M',
      data_nascimento: '1990-08-25',
      idade: 34,
      data_solicitacao: '2025-07-23',
      diagnostico_cid: '456',
      diagnostico_descricao: 'Diagnóstico',
      finalidade: 'curativo',
      performance_status: 'Totalmente capaz',
      ciclos_previstos: 2,
      ciclo_atual: 2,
      superficie_corporal: 1.00,
      peso: 90.00,
      altura: 1,
      medicamentos_antineoplasticos: 'Medicamentos antineoplásticos',
      dose_por_m2: '2',
      dose_total: '2',
      via_administracao: '2',
      dias_aplicacao_intervalo: '2',
      medico_assinatura_crm: '25112003'
    };
    
    console.log('📤 Dados com paciente_id como string:', {
      paciente_id: dadosSolicitacao.paciente_id,
      tipo_paciente_id: typeof dadosSolicitacao.paciente_id
    });
    
    const response = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);
    
    console.log('✅ Resposta do servidor:', {
      success: response.data.success,
      message: response.data.message,
      paciente_id_salvo: response.data.data?.paciente_id,
      tipo_paciente_id_salvo: typeof response.data.data?.paciente_id
    });
    
  } catch (error) {
    console.error('❌ Erro no teste com string:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
}

// Executar os testes
async function runTests() {
  console.log('🚀 Iniciando testes de simulação do frontend...\n');
  
  await testFrontendSimulation();
  await testWithStringPacienteId();
  
  console.log('\n🏁 Testes concluídos!');
}

runTests(); 