// test-protocolos.js - Teste completo para CRUD de Protocolos

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para aguardar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Teste 1: Criar protocolo
async function testCreateProtocolo() {
  try {
    const novoProtocolo = {
      clinica_id: 1,
      nome: 'Protocolo Teste AC-T',
      descricao: 'Protocolo de teste para câncer de mama - Doxorrubicina + Ciclofosfamida + Paclitaxel',
      cid: 'C50.9',
      intervalo_ciclos: 21,
      ciclos_previstos: 6,
      linha: 1,
      status: 'ativo',
      medicamentos: [
        {
          nome: 'Doxorrubicina',
          dose: '60',
          unidade_medida: 'mg/m²',
          via_adm: 'EV',
          dias_adm: 'D1',
          frequencia: 'único',
          observacoes: 'Medicamento antineoplásico'
        },
        {
          nome: 'Ciclofosfamida',
          dose: '600',
          unidade_medida: 'mg/m²',
          via_adm: 'EV',
          dias_adm: 'D1',
          frequencia: 'único',
          observacoes: 'Medicamento antineoplásico'
        },
        {
          nome: 'Paclitaxel',
          dose: '175',
          unidade_medida: 'mg/m²',
          via_adm: 'EV',
          dias_adm: 'D1',
          frequencia: 'único',
          observacoes: 'Medicamento antineoplásico'
        }
      ]
    };

    const response = await axios.post(`${API_BASE_URL}/protocolos`, novoProtocolo);

    return response.data.data.id;
  } catch (error) {
    console.error('❌ Erro ao criar protocolo:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return null;
  }
}

// Teste 2: Buscar protocolo por ID
async function testGetProtocolo(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/protocolos/${id}`);

    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao buscar protocolo:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return null;
  }
}

// Teste 3: Listar todos os protocolos
async function testListProtocolos() {
  try {
    const response = await axios.get(`${API_BASE_URL}/protocolos`);

    return response.data.data.data;
  } catch (error) {
    console.error('❌ Erro ao listar protocolos:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return [];
  }
}

// Teste 4: Buscar protocolos por clínica
async function testGetByClinica() {
  try {
    const response = await axios.get(`${API_BASE_URL}/protocolos/clinica/1`);

    return response.data.data.data;
  } catch (error) {
    console.error('❌ Erro ao buscar protocolos por clínica:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return [];
  }
}

// Teste 5: Buscar protocolos por status
async function testGetByStatus() {
  try {
    const response = await axios.get(`${API_BASE_URL}/protocolos/status/ativo`);

    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao buscar protocolos por status:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return [];
  }
}

// Teste 6: Buscar protocolos por CID
async function testGetByCID() {
  try {
    const response = await axios.get(`${API_BASE_URL}/protocolos/cid/C50`);

    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao buscar protocolos por CID:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return [];
  }
}

// Teste 7: Atualizar protocolo
async function testUpdateProtocolo(id) {
  try {
    const dadosAtualizacao = {
      nome: 'Protocolo Teste AC-T Atualizado',
      descricao: 'Protocolo atualizado com novas informações',
      intervalo_ciclos: 28,
      medicamentos: [
        {
          nome: 'Doxorrubicina Atualizada',
          dose: '75',
          unidade_medida: 'mg/m²',
          via_adm: 'EV',
          dias_adm: 'D1',
          frequencia: 'único',
          observacoes: 'Dose ajustada'
        },
        {
          nome: 'Ciclofosfamida',
          dose: '600',
          unidade_medida: 'mg/m²',
          via_adm: 'EV',
          dias_adm: 'D1',
          frequencia: 'único',
          observacoes: 'Mantido'
        }
      ]
    };

    const response = await axios.put(`${API_BASE_URL}/protocolos/${id}`, dadosAtualizacao);

    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao atualizar protocolo:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return null;
  }
}

// Teste 8: Deletar protocolo
async function testDeleteProtocolo(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/protocolos/${id}`);

    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar protocolo:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  // Teste 1: Criar
  const protocoloId = await testCreateProtocolo();
  if (!protocoloId) {
    return;
  }

  await sleep(1000);

  // Teste 2: Buscar por ID
  await testGetProtocolo(protocoloId);

  await sleep(1000);

  // Teste 3: Listar todos
  await testListProtocolos();

  await sleep(1000);

  // Teste 4: Buscar por clínica
  await testGetByClinica();

  await sleep(1000);

  // Teste 5: Buscar por status
  await testGetByStatus();

  await sleep(1000);

  // Teste 6: Buscar por CID
  await testGetByCID();

  await sleep(1000);

  // Teste 7: Atualizar
  await testUpdateProtocolo(protocoloId);

  await sleep(1000);

  // Teste 8: Deletar
  await testDeleteProtocolo(protocoloId);
}

// Executar os testes
runAllTests(); 