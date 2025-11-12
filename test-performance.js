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

    return { success: true, duration, status: response.status };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    return { success: false, duration, error: error.message };
  }
};

// Função para testar múltiplas requisições simultâneas
const testConcurrentRequests = async (url, description, count = 10) => {
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
  }

  return results;
};

// Função principal de teste
async function testPerformance() {
  try {
    await measureResponseTime(`${API_BASE_URL.replace('/api', '')}/health`, 'Health Check');

    await measureResponseTime(`${API_BASE_URL}/stats`, 'Stats');

    await measureResponseTime(`${API_BASE_URL}/performance/diagnose`, 'Performance Diagnosis');

    await measureResponseTime(`${API_BASE_URL}/test-db`, 'Database Connection');

    await measureResponseTime(`${API_BASE_URL}/pacientes`, 'Pacientes List');

    // 6. Teste de requisições simultâneas para pacientes
    await testConcurrentRequests(`${API_BASE_URL}/pacientes`, 'Pacientes List', 5);

    await measureResponseTime(`${API_BASE_URL}/clinicas`, 'Clinicas List');

    await measureResponseTime(`${API_BASE_URL}/protocolos`, 'Protocolos List');

    await measureResponseTime(`${API_BASE_URL}/solicitacoes`, 'Solicitacoes List');

    await measureResponseTime(`${API_BASE_URL}/pacientes`, 'Pacientes List (Cached)');

    await testConcurrentRequests(`${API_BASE_URL}/pacientes`, 'Stress Test', 20);
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  testPerformance();
}

module.exports = { testPerformance, measureResponseTime, testConcurrentRequests }; 