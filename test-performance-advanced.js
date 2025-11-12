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

  return results;
}

// Função para testar timeout customizado
async function testCustomTimeout() {
  try {
    // Configurar timeout muito baixo (1 segundo)
    const response = await api.put('/api/performance/config', {
      timeoutThreshold: 1000,
      slowRequestThreshold: 500
    });

    // Fazer uma requisição que pode ser lenta
    const testResponse = await api.get('/api/pacientes');

    // Restaurar configuração original
    await api.put('/api/performance/config', {
      timeoutThreshold: 30000,
      slowRequestThreshold: 5000
    });
  } catch (error) {}
}

// Função para testar circuit breaker
async function testCircuitBreaker() {
  // Ativar circuit breaker
  await api.put('/api/performance/config', {
    enableCircuitBreaker: true,
    criticalRequestThreshold: 100 // Muito baixo para forçar falhas
  });

  // Fazer várias requisições para um endpoint inexistente (forçar falhas)
  for (let i = 0; i < 6; i++) {
    try {
      await api.get('/api/endpoint-inexistente');
    } catch (error) {}
  }

  // Verificar se circuit breaker foi ativado
  const stats = await api.get('/api/performance/stats');

  // Resetar circuit breakers
  await api.post('/api/performance/reset-circuit-breakers');

  // Restaurar configuração
  await api.put('/api/performance/config', {
    criticalRequestThreshold: 15000
  });
}

// Função para testar diagnóstico
async function testDiagnosis() {
  const response = await api.get('/api/performance/diagnose');
  const diagnosis = response.data.data;

  if (diagnosis.issues.length > 0) {
    diagnosis.issues.forEach(issue => console.log(`  - ${issue}`));

    diagnosis.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
}

// Função para testar health check avançado
async function testAdvancedHealthCheck() {
  const response = await api.get('/api/performance/health');
  const health = response.data;

  if (health.data.issues.length > 0) {
    health.data.issues.forEach(issue => console.log(`  - ${issue}`));
  }
}

// Função para demonstrar funcionalidades de emergência
async function testEmergencyFeatures() {
  const backgroundPromises = Array.from({ length: 5 }, () => 
    api.get('/api/performance/stats')
  );

  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verificar requisições ativas
  const statsBefore = await api.get('/api/performance/stats');

  // Matar todas as requisições ativas (emergência)
  await api.post('/api/performance/kill-requests');

  // Verificar após cancelamento
  const statsAfter = await api.get('/api/performance/stats');

  // Aguardar as promises em background terminarem
  await Promise.allSettled(backgroundPromises);
}

// Função principal
async function runAdvancedPerformanceTests() {
  try {
    await api.get('/health');

    // Executar testes
    await testAdvancedHealthCheck();
    await testDiagnosis();
    await testConcurrentRequests(15);
    await testCustomTimeout();
    await testCircuitBreaker();
    await testEmergencyFeatures();

    const finalStats = await api.get('/api/performance/stats');
  } catch (error) {
    console.error('❌ ERRO DURANTE OS TESTES:', error.message);
    
    if (error.code === 'ECONNREFUSED') {}
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