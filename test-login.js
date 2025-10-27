// Usando fetch nativo do Node.js 18+

async function testLogin() {
  try {
    console.log('🔧 Testando login com credenciais fornecidas...');
    
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
    console.log('📋 Resultado do login:', loginResult);
    
    if (!loginResult.success) {
      console.log('❌ Login falhou');
      return;
    }
    
    const token = loginResult.data.token;
    console.log('✅ Login realizado com sucesso!');
    console.log('🔑 Token:', token.substring(0, 50) + '...');
    
    // Testar rotas protegidas
    console.log('\n🔧 Testando rotas protegidas...');
    
    // Testar /api/pacientes
    console.log('\n📋 Testando /api/pacientes...');
    const pacientesResponse = await fetch('http://localhost:8080/api/pacientes?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Status da resposta pacientes:', pacientesResponse.status);
    if (pacientesResponse.ok) {
      const pacientesResult = await pacientesResponse.json();
      console.log('✅ Pacientes carregados:', pacientesResult.data?.data?.length || 0);
    } else {
      const errorText = await pacientesResponse.text();
      console.log('❌ Erro ao carregar pacientes:', errorText);
    }
    
    // Testar /api/solicitacoes
    console.log('\n📋 Testando /api/solicitacoes...');
    const solicitacoesResponse = await fetch('http://localhost:8080/api/solicitacoes?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Status da resposta solicitações:', solicitacoesResponse.status);
    if (solicitacoesResponse.ok) {
      const solicitacoesResult = await solicitacoesResponse.json();
      console.log('✅ Solicitações carregadas:', solicitacoesResult.data?.data?.length || 0);
    } else {
      const errorText = await solicitacoesResponse.text();
      console.log('❌ Erro ao carregar solicitações:', errorText);
    }
    
    // Testar /api/protocolos
    console.log('\n📋 Testando /api/protocolos...');
    const protocolosResponse = await fetch('http://localhost:8080/api/protocolos?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Status da resposta protocolos:', protocolosResponse.status);
    if (protocolosResponse.ok) {
      const protocolosResult = await protocolosResponse.json();
      console.log('✅ Protocolos carregados:', protocolosResult.data?.data?.length || 0);
    } else {
      const errorText = await protocolosResponse.text();
      console.log('❌ Erro ao carregar protocolos:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testLogin();