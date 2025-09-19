// Script para testar o endpoint de login da operadora
const fetch = require('node-fetch');

async function testOperadoraEndpoint() {
  try {
    console.log('🔧 Testando endpoint de login da operadora...');
    
    const response = await fetch('http://localhost:3001/api/operadora-auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@unimed.com',
        password: 'admin123'
      })
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📊 Dados da resposta:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Login realizado com sucesso!');
    } else {
      console.log('❌ Erro no login');
    }

  } catch (error) {
    console.error('❌ Erro ao testar endpoint:', error);
  }
}

testOperadoraEndpoint();
