const axios = require('axios');
const jwt = require('jsonwebtoken');

async function debugToken() {
  try {
    console.log('🔧 Debug do token de clínica...');
    
    // 1. Fazer login
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
    
    console.log('✅ Login realizado!');
    console.log('📋 Response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.accessToken;
    
    // 2. Decodificar token
    console.log('\n🔍 Decodificando token...');
    const decoded = jwt.decode(token);
    console.log('📋 Token decodificado:', JSON.stringify(decoded, null, 2));
    
    // 3. Verificar se o role está correto
    console.log('\n🔍 Verificando role...');
    console.log('📋 Role no token:', decoded.role);
    console.log('📋 Tipo no token:', decoded.tipo);
    console.log('📋 ClinicaId no token:', decoded.clinicaId);
    
    // 4. Testar endpoint com debug
    console.log('\n🔧 Testando endpoint com debug...');
    try {
      const response = await axios.get('http://localhost:3001/api/pacientes?page=1&limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      console.log('✅ Endpoint funcionou!');
      console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Erro no endpoint:');
      console.log('📋 Status:', error.response?.status);
      console.log('📋 Message:', error.response?.data?.message);
      console.log('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugToken();
