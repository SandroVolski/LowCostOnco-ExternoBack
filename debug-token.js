const axios = require('axios');
const jwt = require('jsonwebtoken');

async function debugToken() {
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

    const decoded = jwt.decode(token);
    try {
      const response = await axios.get('http://localhost:3001/api/pacientes?page=1&limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
    } catch (error) {}
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugToken();
