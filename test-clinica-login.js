const axios = require('axios');

async function testClinicaLogin() {
  try {
    const loginResponse = await axios.post('http://localhost:3001/api/clinicas/login', {
      usuario: 'admin',
      senha: 'password'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const token = loginResponse.data.accessToken;

    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);

    // Testar pacientes
    try {
      const pacientesResponse = await axios.get('http://localhost:3001/api/pacientes?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
    } catch (error) {}

    // Testar solicitações
    try {
      const solicitacoesResponse = await axios.get('http://localhost:3001/api/solicitacoes?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
    } catch (error) {}

    // Testar protocolos
    try {
      const protocolosResponse = await axios.get('http://localhost:3001/api/protocolos?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
    } catch (error) {}

    // Testar notificações
    try {
      const notificacoesResponse = await axios.get('http://localhost:3001/api/notificacoes?clinica_id=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
    } catch (error) {}
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testClinicaLogin();
