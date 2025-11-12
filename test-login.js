// Usando fetch nativo do Node.js 18+

async function testLogin() {
  try {
    // Testar login
    const loginResponse = await fetch('http://localhost:8080/api/clinicas/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: 'LCOClínica',
        senha: 'LowCostC2025'
      })
    });

    const loginResult = await loginResponse.json();

    if (!loginResult.success) {
      return;
    }

    const token = loginResult.data.token;
    const pacientesResponse = await fetch('http://localhost:8080/api/pacientes?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (pacientesResponse.ok) {
      const pacientesResult = await pacientesResponse.json();
    } else {
      const errorText = await pacientesResponse.text();
    }

    const solicitacoesResponse = await fetch('http://localhost:8080/api/solicitacoes?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (solicitacoesResponse.ok) {
      const solicitacoesResult = await solicitacoesResponse.json();
    } else {
      const errorText = await solicitacoesResponse.text();
    }

    const protocolosResponse = await fetch('http://localhost:8080/api/protocolos?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (protocolosResponse.ok) {
      const protocolosResult = await protocolosResponse.json();
    } else {
      const errorText = await protocolosResponse.text();
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testLogin();