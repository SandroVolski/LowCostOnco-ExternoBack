const fetch = require('node-fetch');

async function testLoginAPI() {
  try {
    // Teste 1: Verificar se a API está respondendo
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {} else {
      return;
    }

    // Teste 2: Tentar login com credenciais válidas
    const loginData = {
      usuario: 'LCOClinica',
      senha: 'teste123'
    };

    const loginResponse = await fetch('http://localhost:3001/api/clinicas/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    if (loginResponse.ok) {
      const responseData = await loginResponse.json();
    } else {
      const errorData = await loginResponse.text();
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testLoginAPI();
