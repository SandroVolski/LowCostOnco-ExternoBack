// test-protocolos.js - Teste completo para CRUD de Protocolos

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para aguardar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Teste 1: Criar protocolo
async function testCreateProtocolo() {
  try {
    console.log('🧪 Teste 1: Criando novo protocolo...');
    
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
    
    console.log('✅ Protocolo criado com sucesso!');
    console.log('📋 Dados do protocolo criado:', {
      id: response.data.data.id,
      nome: response.data.data.nome,
      medicamentos: response.data.data.medicamentos.length
    });
    
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
    console.log('\n🧪 Teste 2: Buscando protocolo por ID...');
    
    const response = await axios.get(`${API_BASE_URL}/protocolos/${id}`);
    
    console.log('✅ Protocolo encontrado!');
    console.log('📋 Dados do protocolo:', {
      id: response.data.data.id,
      nome: response.data.data.nome,
      cid: response.data.data.cid,
      medicamentos: response.data.data.medicamentos.length
    });
    
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
    console.log('\n🧪 Teste 3: Listando todos os protocolos...');
    
    const response = await axios.get(`${API_BASE_URL}/protocolos`);
    
    console.log('✅ Protocolos listados com sucesso!');
    console.log('📋 Total de protocolos:', response.data.data.data.length);
    console.log('📋 Paginação:', response.data.data.pagination);
    
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
    console.log('\n🧪 Teste 4: Buscando protocolos por clínica...');
    
    const response = await axios.get(`${API_BASE_URL}/protocolos/clinica/1`);
    
    console.log('✅ Protocolos da clínica encontrados!');
    console.log('📋 Total de protocolos da clínica:', response.data.data.data.length);
    
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
    console.log('\n🧪 Teste 5: Buscando protocolos por status...');
    
    const response = await axios.get(`${API_BASE_URL}/protocolos/status/ativo`);
    
    console.log('✅ Protocolos ativos encontrados!');
    console.log('📋 Total de protocolos ativos:', response.data.data.length);
    
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
    console.log('\n🧪 Teste 6: Buscando protocolos por CID...');
    
    const response = await axios.get(`${API_BASE_URL}/protocolos/cid/C50`);
    
    console.log('✅ Protocolos para CID C50 encontrados!');
    console.log('📋 Total de protocolos para CID C50:', response.data.data.length);
    
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
    console.log('\n🧪 Teste 7: Atualizando protocolo...');
    
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
    
    console.log('✅ Protocolo atualizado com sucesso!');
    console.log('📋 Dados atualizados:', {
      nome: response.data.data.nome,
      intervalo_ciclos: response.data.data.intervalo_ciclos,
      medicamentos: response.data.data.medicamentos.length
    });
    
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
    console.log('\n🧪 Teste 8: Deletando protocolo...');
    
    const response = await axios.delete(`${API_BASE_URL}/protocolos/${id}`);
    
    console.log('✅ Protocolo deletado com sucesso!');
    console.log('📋 Resposta:', response.data.message);
    
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
  console.log('🚀 Iniciando testes completos de Protocolos...\n');
  
  // Teste 1: Criar
  const protocoloId = await testCreateProtocolo();
  if (!protocoloId) {
    console.log('❌ Falha no teste de criação. Parando testes.');
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
  
  console.log('\n🏁 Todos os testes de Protocolos concluídos!');
}

// Executar os testes
runAllTests(); 