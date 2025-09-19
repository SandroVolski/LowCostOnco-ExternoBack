import('node-fetch').then(async ({ default: fetch }) => {
  try {
    console.log('🔧 Testando login da clínica...');
    
    const response = await fetch('http://localhost:3001/api/clinicas/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: 'LCOClínica',
        senha: 'LowCostC2025'
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📋 Resposta:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Login realizado com sucesso!');
      console.log('🔑 Token:', data.data.token);
    } else {
      console.log('❌ Falha no login:', data.message);
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
});
