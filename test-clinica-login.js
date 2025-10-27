const axios = require('axios');

async function testClinicaLogin() {
  try {
    console.log('🔧 Testando login de clínica...');
    
    // 1. Fazer login como clínica
    console.log('📤 Fazendo login como clínica...');
    const loginResponse = await axios.post('http://localhost:3001/api/clinicas/login', {
      usuario: 'admin',
      senha: 'password'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login de clínica realizado!');
    console.log('📋 Token recebido:', loginResponse.data.accessToken ? 'SIM' : 'NÃO');
    console.log('📋 Dados do usuário:', loginResponse.data.user);
    
    const token = loginResponse.data.accessToken;
    
    // 2. Decodificar token para verificar conteúdo
    console.log('\n🔍 Decodificando token...');
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    console.log('📋 Token decodificado:', decoded);
    
    // 3. Testar endpoints de clínica
    console.log('\n🔧 Testando endpoints de clínica...');
    
    // Testar pacientes
    try {
      const pacientesResponse = await axios.get('http://localhost:3001/api/pacientes?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      console.log('✅ Endpoint de pacientes funcionando!');
      console.log('📋 Total de pacientes:', pacientesResponse.data.total || 'N/A');
    } catch (error) {
      console.log('❌ Erro no endpoint de pacientes:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Testar solicitações
    try {
      const solicitacoesResponse = await axios.get('http://localhost:3001/api/solicitacoes?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      console.log('✅ Endpoint de solicitações funcionando!');
      console.log('📋 Total de solicitações:', solicitacoesResponse.data.total || 'N/A');
    } catch (error) {
      console.log('❌ Erro no endpoint de solicitações:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Testar protocolos
    try {
      const protocolosResponse = await axios.get('http://localhost:3001/api/protocolos?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      console.log('✅ Endpoint de protocolos funcionando!');
      console.log('📋 Total de protocolos:', protocolosResponse.data.total || 'N/A');
    } catch (error) {
      console.log('❌ Erro no endpoint de protocolos:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Testar notificações
    try {
      const notificacoesResponse = await axios.get('http://localhost:3001/api/notificacoes?clinica_id=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      console.log('✅ Endpoint de notificações funcionando!');
      console.log('📋 Total de notificações:', notificacoesResponse.data.total || 'N/A');
    } catch (error) {
      console.log('❌ Erro no endpoint de notificações:', error.response?.status, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testClinicaLogin();
