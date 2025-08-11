// test-performance.js - Script para testar a performance do sistema
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para medir tempo de resposta
const measureResponseTime = async (url, description) => {
  const startTime = Date.now();
  try {
    const response = await axios.get(url);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ ${description}: ${duration}ms`);
    return { success: true, duration, status: response.status };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ ${description}: ${duration}ms (Erro: ${error.message})`);
    return { success: false, duration, error: error.message };
  }
};

// Função para testar múltiplas requisições simultâneas
const testConcurrentRequests = async (url, description, count = 10) => {
  console.log(`\n🔄 Testando ${count} requisições simultâneas para ${description}...`);
  
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(measureResponseTime(url, `${description} #${i + 1}`));
  }
  
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const minDuration = Math.min(...successful.map(r => r.duration));
    const maxDuration = Math.max(...successful.map(r => r.duration));
    
    console.log(`📊 Resultados para ${description}:`);
    console.log(`   ✅ Sucessos: ${successful.length}/${count}`);
    console.log(`   ❌ Falhas: ${failed.length}/${count}`);
    console.log(`   ⏱️  Tempo médio: ${Math.round(avgDuration)}ms`);
    console.log(`   🐌 Tempo mínimo: ${minDuration}ms`);
    console.log(`   🐌 Tempo máximo: ${maxDuration}ms`);
  }
  
  return results;
};

// Função principal de teste
async function testPerformance() {
  console.log('🚀 Iniciando testes de performance...\n');
  
  try {
    // 1. Teste de health check
    console.log('1️⃣ Testando health check...');
    await measureResponseTime(`${API_BASE_URL.replace('/api', '')}/health`, 'Health Check');
    
    // 2. Teste de estatísticas
    console.log('\n2️⃣ Testando endpoint de estatísticas...');
    await measureResponseTime(`${API_BASE_URL}/stats`, 'Stats');
    
    // 3. Teste de diagnóstico de performance
    console.log('\n3️⃣ Testando diagnóstico de performance...');
    await measureResponseTime(`${API_BASE_URL}/performance/diagnose`, 'Performance Diagnosis');
    
    // 4. Teste de conexão com banco
    console.log('\n4️⃣ Testando conexão com banco...');
    await measureResponseTime(`${API_BASE_URL}/test-db`, 'Database Connection');
    
    // 5. Teste de pacientes (com cache)
    console.log('\n5️⃣ Testando endpoint de pacientes...');
    await measureResponseTime(`${API_BASE_URL}/pacientes`, 'Pacientes List');
    
    // 6. Teste de requisições simultâneas para pacientes
    await testConcurrentRequests(`${API_BASE_URL}/pacientes`, 'Pacientes List', 5);
    
    // 7. Teste de clínicas
    console.log('\n6️⃣ Testando endpoint de clínicas...');
    await measureResponseTime(`${API_BASE_URL}/clinicas`, 'Clinicas List');
    
    // 8. Teste de protocolos
    console.log('\n7️⃣ Testando endpoint de protocolos...');
    await measureResponseTime(`${API_BASE_URL}/protocolos`, 'Protocolos List');
    
    // 9. Teste de solicitações
    console.log('\n8️⃣ Testando endpoint de solicitações...');
    await measureResponseTime(`${API_BASE_URL}/solicitacoes`, 'Solicitacoes List');
    
    // 10. Teste de cache (segunda requisição deve ser mais rápida)
    console.log('\n9️⃣ Testando cache (segunda requisição)...');
    await measureResponseTime(`${API_BASE_URL}/pacientes`, 'Pacientes List (Cached)');
    
    // 11. Teste de stress (muitas requisições)
    console.log('\n🔟 Teste de stress...');
    await testConcurrentRequests(`${API_BASE_URL}/pacientes`, 'Stress Test', 20);
    
    console.log('\n✅ Testes de performance concluídos!');
    console.log('\n📊 Para ver estatísticas detalhadas, acesse:');
    console.log(`   ${API_BASE_URL}/stats`);
    console.log(`   ${API_BASE_URL}/performance/diagnose`);
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    console.log('\n💡 Certifique-se de que o servidor está rodando em http://localhost:3001');
  }
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  testPerformance();
}

module.exports = { testPerformance, measureResponseTime, testConcurrentRequests }; 