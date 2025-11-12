// Script para testar o endpoint de login da operadora
const fetch = require('node-fetch');

async function testOperadoraEndpoint() {
  try {
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

    const data = await response.json();

    if (response.ok) {} else {}
  } catch (error) {
    console.error('❌ Erro ao testar endpoint:', error);
  }
}

testOperadoraEndpoint();
