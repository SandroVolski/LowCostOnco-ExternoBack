const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Configurações de teste
const TEST_CONFIG = {
  baseURL: BASE_URL,
  timeout: 60000, // 60 segundos
  validateStatus: () => true // Aceitar todos os status codes
};

const api = axios.create(TEST_CONFIG);

// Função para fazer requisições simultâneas
async function testConcurrentRequests(count = 10) {
  console.log(`\n🔄 Testando ${count} requisições simultâneas...`);
  
  const promises = Array.from({ length: count }, (_, i) => 
    api.get('/api/performance/stats').then(res => ({
      index: i,
      status: res.status,
      duration: res.headers['x-response-time'] || 'N/A'
    }))
  );
  
  const startTime = Date.now();
  const results = await Promise.allSettled(promises);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ ${successful} bem-sucedidas, ❌ ${failed} falharam`);
  console.log(`⏱️  Tempo total: ${endTime - startTime}ms`);
  
  return results;
}

// Função para testar timeout customizado
async function testCustomTimeout() {
  console.log('\n⏰ Testando timeout customizado...');
  
  try {
    // Configurar timeout muito baixo (1 segundo)
    const response = await api.put('/api/performance/config', {
      timeoutThreshold: 1000,
      slowRequestThreshold: 500
    });
    
    console.log('📝 Configuração atualizada:', response.data);
    
    // Fazer uma requisição que pode ser lenta
    const testResponse = await api.get('/api/pacientes');
    console.log(`✅ Requisição concluída: ${testResponse.status}`);
    
    // Restaurar configuração original
    await api.put('/api/performance/config', {
      timeoutThreshold: 30000,
      slowRequestThreshold: 5000
    });
    
  } catch (error) {
    console.log(`⚠️ Timeout ou erro esperado: ${error.message}`);
  }
}

// Função para testar circuit breaker
async function testCircuitBreaker() {
  console.log('\n⚡ Testando circuit breaker...');
  
  // Ativar circuit breaker
  await api.put('/api/performance/config', {
    enableCircuitBreaker: true,
    criticalRequestThreshold: 100 // Muito baixo para forçar falhas
  });
  
  console.log('🔧 Circuit breaker ativado com threshold baixo');
  
  // Fazer várias requisições para um endpoint inexistente (forçar falhas)
  for (let i = 0; i < 6; i++) {
    try {
      await api.get('/api/endpoint-inexistente');
    } catch (error) {
      console.log(`❌ Falha ${i + 1}: ${error.response?.status || 'Network Error'}`);
    }
  }
  
  // Verificar se circuit breaker foi ativado
  const stats = await api.get('/api/performance/stats');
  console.log('📊 Circuit breakers ativos:', stats.data.data.circuitBreakers);
  
  // Resetar circuit breakers
  await api.post('/api/performance/reset-circuit-breakers');
  console.log('🔄 Circuit breakers resetados');
  
  // Restaurar configuração
  await api.put('/api/performance/config', {
    criticalRequestThreshold: 15000
  });
}

// Função para testar diagnóstico
async function testDiagnosis() {
  console.log('\n🔍 Testando diagnóstico avançado...');
  
  const response = await api.get('/api/performance/diagnose');
  const diagnosis = response.data.data;
  
  console.log('📊 Diagnóstico:');
  console.log(`  • Requisições ativas: ${diagnosis.activeRequests}`);
  console.log(`  • Tempo médio: ${diagnosis.averageActiveRequestTime}ms`);
  console.log(`  • Circuit breakers: ${diagnosis.circuitBreakers.length}`);
  console.log(`  • Problemas encontrados: ${diagnosis.issues.length}`);
  
  if (diagnosis.issues.length > 0) {
    console.log('⚠️ Problemas:');
    diagnosis.issues.forEach(issue => console.log(`  - ${issue}`));
    
    console.log('💡 Recomendações:');
    diagnosis.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
}

// Função para testar health check avançado
async function testAdvancedHealthCheck() {
  console.log('\n🏥 Testando health check avançado...');
  
  const response = await api.get('/api/performance/health');
  const health = response.data;
  
  console.log(`📊 Status: ${health.status} (${response.status})`);
  console.log(`⏱️  Uptime: ${Math.round(health.data.uptime)}s`);
  console.log(`💾 Memória: ${Math.round(health.data.memory.used / 1024 / 1024)}MB`);
  console.log(`🔄 Requisições ativas: ${health.data.activeRequests}`);
  
  if (health.data.issues.length > 0) {
    console.log('⚠️ Problemas de saúde detectados:');
    health.data.issues.forEach(issue => console.log(`  - ${issue}`));
  }
}

// Função para demonstrar funcionalidades de emergência
async function testEmergencyFeatures() {
  console.log('\n🚨 Testando funcionalidades de emergência...');
  
  // Fazer algumas requisições em background
  console.log('📤 Iniciando requisições em background...');
  const backgroundPromises = Array.from({ length: 5 }, () => 
    api.get('/api/performance/stats')
  );
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verificar requisições ativas
  const statsBefore = await api.get('/api/performance/stats');
  console.log(`📊 Requisições ativas antes: ${statsBefore.data.data.activeRequests}`);
  
  // Matar todas as requisições ativas (emergência)
  await api.post('/api/performance/kill-requests');
  console.log('🚨 Todas as requisições ativas foram canceladas');
  
  // Verificar após cancelamento
  const statsAfter = await api.get('/api/performance/stats');
  console.log(`📊 Requisições ativas depois: ${statsAfter.data.data.activeRequests}`);
  
  // Aguardar as promises em background terminarem
  await Promise.allSettled(backgroundPromises);
}

// Função principal
async function runAdvancedPerformanceTests() {
  console.log('🚀 INICIANDO TESTES AVANÇADOS DE PERFORMANCE');
  console.log('=' .repeat(50));
  
  try {
    // Verificar se o servidor está rodando
    console.log('🔍 Verificando conexão com o servidor...');
    await api.get('/health');
    console.log('✅ Servidor conectado com sucesso!');
    
    // Executar testes
    await testAdvancedHealthCheck();
    await testDiagnosis();
    await testConcurrentRequests(15);
    await testCustomTimeout();
    await testCircuitBreaker();
    await testEmergencyFeatures();
    
    // Estatísticas finais
    console.log('\n📊 ESTATÍSTICAS FINAIS:');
    const finalStats = await api.get('/api/performance/stats');
    console.log(JSON.stringify(finalStats.data.data, null, 2));
    
    console.log('\n✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ ERRO DURANTE OS TESTES:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Certifique-se de que o servidor está rodando em ' + BASE_URL);
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  runAdvancedPerformanceTests();
}

module.exports = {
  runAdvancedPerformanceTests,
  testConcurrentRequests,
  testCustomTimeout,
  testCircuitBreaker,
  testDiagnosis,
  testAdvancedHealthCheck,
  testEmergencyFeatures
}; 