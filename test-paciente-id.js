// test-paciente-id.js - Teste para verificar se paciente_id está sendo salvo

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para verificar se existem pacientes
async function verificarPacientes() {
  try {
    console.log('🔍 Verificando pacientes existentes...');
    const response = await axios.get(`${API_BASE_URL}/pacientes`);
    
    if (response.data.success && response.data.data && response.data.data.length > 0) {
      console.log('✅ Pacientes encontrados:', response.data.data.length);
      console.log('📋 Primeiros 3 pacientes:', response.data.data.slice(0, 3).map(p => ({ id: p.id, nome: p.Paciente_Nome })));
      return response.data.data[0].id; // Retorna o ID do primeiro paciente
    } else {
      console.log('⚠️  Nenhum paciente encontrado');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar pacientes:', error.response?.data || error.message);
    return null;
  }
}

async function testPacienteId() {
  try {
    console.log('🧪 Testando criação de solicitação com paciente_id...');
    
    // Primeiro, verificar se existem pacientes
    const pacienteIdValido = await verificarPacientes();
    
    if (!pacienteIdValido) {
      console.log('⚠️  Não há pacientes cadastrados. Testando com ID 1...');
    }
    
    const dadosSolicitacao = {
      clinica_id: 1,
      paciente_id: pacienteIdValido || 1, // Usar ID válido ou 1 como fallback
      hospital_nome: 'Hospital Teste',
      hospital_codigo: 'HT001',
      cliente_nome: 'Paciente Teste',
      cliente_codigo: 'PT001',
      sexo: 'M',
      data_nascimento: '1990-01-01',
      idade: 34,
      data_solicitacao: '2025-01-23',
      diagnostico_cid: 'C50.9',
      diagnostico_descricao: 'Câncer de mama',
      finalidade: 'curativo',
      performance_status: '0',
      ciclos_previstos: 6,
      ciclo_atual: 1,
      superficie_corporal: 1.75,
      peso: 70,
      altura: 170,
      medicamentos_antineoplasticos: 'Doxorrubicina 60mg/m²',
      dose_por_m2: '60mg/m²',
      dose_total: '105mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1 a cada 21 dias',
      medico_assinatura_crm: '12345-SP'
    };
    
    console.log('📤 Enviando dados:', {
      paciente_id: dadosSolicitacao.paciente_id,
      tipo: typeof dadosSolicitacao.paciente_id
    });
    
    const response = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);
    
    console.log('✅ Resposta do servidor:', {
      success: response.data.success,
      message: response.data.message,
      paciente_id_salvo: response.data.data?.paciente_id,
      tipo_paciente_id_salvo: typeof response.data.data?.paciente_id
    });
    
    // Buscar a solicitação criada para verificar
    const solicitacaoId = response.data.data.id;
    const getResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}`);
    
    console.log('🔍 Dados da solicitação recuperada:', {
      id: getResponse.data.data.id,
      paciente_id: getResponse.data.data.paciente_id,
      tipo_paciente_id: typeof getResponse.data.data.paciente_id,
      cliente_nome: getResponse.data.data.cliente_nome
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
}

// Teste sem paciente_id
async function testSemPacienteId() {
  try {
    console.log('\n🧪 Testando criação de solicitação SEM paciente_id...');
    
    const dadosSolicitacao = {
      clinica_id: 1,
      // paciente_id não informado
      hospital_nome: 'Hospital Teste 2',
      hospital_codigo: 'HT002',
      cliente_nome: 'Paciente Teste 2',
      cliente_codigo: 'PT002',
      sexo: 'F',
      data_nascimento: '1985-05-15',
      idade: 39,
      data_solicitacao: '2025-01-23',
      diagnostico_cid: 'C34.9',
      diagnostico_descricao: 'Câncer de pulmão',
      finalidade: 'paliativo',
      performance_status: '1',
      ciclos_previstos: 4,
      ciclo_atual: 1,
      superficie_corporal: 1.60,
      peso: 65,
      altura: 165,
      medicamentos_antineoplasticos: 'Cisplatina 75mg/m²',
      dose_por_m2: '75mg/m²',
      dose_total: '120mg',
      via_administracao: 'EV',
      dias_aplicacao_intervalo: 'D1 a cada 21 dias',
      medico_assinatura_crm: '54321-SP'
    };
    
    console.log('📤 Enviando dados SEM paciente_id');
    
    const response = await axios.post(`${API_BASE_URL}/solicitacoes`, dadosSolicitacao);
    
    console.log('✅ Resposta do servidor:', {
      success: response.data.success,
      message: response.data.message,
      paciente_id_salvo: response.data.data?.paciente_id,
      tipo_paciente_id_salvo: typeof response.data.data?.paciente_id
    });
    
    // Buscar a solicitação criada para verificar
    const solicitacaoId = response.data.data.id;
    const getResponse = await axios.get(`${API_BASE_URL}/solicitacoes/${solicitacaoId}`);
    
    console.log('🔍 Dados da solicitação recuperada:', {
      id: getResponse.data.data.id,
      paciente_id: getResponse.data.data.paciente_id,
      tipo_paciente_id: typeof getResponse.data.data.paciente_id,
      cliente_nome: getResponse.data.data.cliente_nome
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
}

// Executar os testes
async function runTests() {
  console.log('🚀 Iniciando testes de paciente_id...\n');
  
  await testPacienteId();
  await testSemPacienteId();
  
  console.log('\n🏁 Testes concluídos!');
}

runTests(); 