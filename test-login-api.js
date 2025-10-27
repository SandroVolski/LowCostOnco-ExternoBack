const fetch = require('node-fetch');

async function testLoginAPI() {
  try {
    console.log('🧪 Testando API de login das clínicas...');
    
    // Teste 1: Verificar se a API está respondendo
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      console.log('✅ API está respondendo');
    } else {
      console.log('❌ API não está respondendo');
      return;
    }

    // Teste 2: Tentar login com credenciais válidas
    const loginData = {
      usuario: 'LCOClinica',
      senha: 'teste123'
    };

    console.log('🔐 Tentando login com:', loginData.usuario);
    
    const loginResponse = await fetch('http://localhost:3001/api/clinicas/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    console.log('📊 Status da resposta:', loginResponse.status);
    
    if (loginResponse.ok) {
      const responseData = await loginResponse.json();
      console.log('✅ Login bem-sucedido!');
      console.log('📋 Resposta:', JSON.stringify(responseData, null, 2));
    } else {
      const errorData = await loginResponse.text();
      console.log('❌ Login falhou');
      console.log('📋 Erro:', errorData);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testLoginAPI();
