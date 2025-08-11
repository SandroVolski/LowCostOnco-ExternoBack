// test-rotas-protocolos.js - Teste simples das rotas de protocolos

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testarRotas() {
  console.log('🧪 Testando rotas de protocolos...\n');
  
  try {
    // Teste 1: Verificar se a rota base existe
    console.log('1️⃣ Testando GET /api/protocolos...');
    const response1 = await axios.get(`${API_BASE_URL}/protocolos`);
    console.log('✅ GET /api/protocolos funcionando!');
    console.log('📋 Resposta:', {
      success: response1.data.success,
      message: response1.data.message,
      total: response1.data.data?.data?.length || 0
    });
    
    // Teste 2: Verificar rota com parâmetros
    console.log('\n2️⃣ Testando GET /api/protocolos?clinica_id=1...');
    const response2 = await axios.get(`${API_BASE_URL}/protocolos?clinica_id=1&page=1&limit=10`);
    console.log('✅ GET /api/protocolos com parâmetros funcionando!');
    console.log('📋 Resposta:', {
      success: response2.data.success,
      message: response2.data.message,
      total: response2.data.data?.data?.length || 0
    });
    
    // Teste 3: Verificar rota de clínica específica
    console.log('\n3️⃣ Testando GET /api/protocolos/clinica/1...');
    const response3 = await axios.get(`${API_BASE_URL}/protocolos/clinica/1`);
    console.log('✅ GET /api/protocolos/clinica/1 funcionando!');
    console.log('📋 Resposta:', {
      success: response3.data.success,
      message: response3.data.message,
      total: response3.data.data?.data?.length || 0
    });
    
    console.log('\n🎉 Todas as rotas estão funcionando corretamente!');
    
  } catch (error) {
    console.error('❌ Erro ao testar rotas:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response?.status === 404) {
      console.log('\n🔧 Possíveis soluções:');
      console.log('1. Verifique se o servidor foi reiniciado após adicionar as rotas');
      console.log('2. Verifique se as rotas foram registradas corretamente no server.ts');
      console.log('3. Execute: npm run build && npm start');
    }
  }
}

testarRotas(); 