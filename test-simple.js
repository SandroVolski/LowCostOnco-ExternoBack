// Teste simples para verificar a API
// Execute com: node test-simple.js

const baseUrl = 'http://localhost:3001';

async function testeSimples() {
  console.log('🔧 Testando API básica...\n');

  // 1. Health Check
  try {
    console.log('1. Testando Health Check...');
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    console.log('✅ Resposta:', data);
  } catch (error) {
    console.log('❌ Erro no Health Check:', error.message);
    return;
  }

  // 2. Teste de Banco
  try {
    console.log('\n2. Testando conexão com banco...');
    const response = await fetch(`${baseUrl}/api/test-db`);
    const data = await response.json();
    console.log(data.success ? '✅ Banco OK' : '❌ Problema no banco');
    console.log('Detalhes:', data);
  } catch (error) {
    console.log('❌ Erro no teste de banco:', error.message);
  }

  // 3. Listar Pacientes
  try {
    console.log('\n3. Testando listagem de pacientes...');
    const response = await fetch(`${baseUrl}/api/pacientes`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Pacientes listados com sucesso!');
      console.log(`Total de pacientes: ${data.data.pagination.total}`);
      console.log(`Pacientes nesta página: ${data.data.data.length}`);
      
      if (data.data.data.length > 0) {
        console.log('\nPrimeiro paciente:');
        const primeiro = data.data.data[0];
        console.log(`- ID: ${primeiro.id}`);
        console.log(`- Nome: ${primeiro.Paciente_Nome}`);
        console.log(`- Código: ${primeiro.Codigo}`);
        console.log(`- Status: ${primeiro.status}`);
      }
    } else {
      console.log('❌ Erro ao listar pacientes:', data.message);
    }
  } catch (error) {
    console.log('❌ Erro na listagem:', error.message);
  }

  console.log('\n✨ Teste concluído!');
}

testeSimples().catch(console.error);