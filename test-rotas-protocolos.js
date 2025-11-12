// test-rotas-protocolos.js - Teste simples das rotas de protocolos

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testarRotas() {
  try {
    const response1 = await axios.get(`${API_BASE_URL}/protocolos`);
    const response2 = await axios.get(`${API_BASE_URL}/protocolos?clinica_id=1&page=1&limit=10`);
    const response3 = await axios.get(`${API_BASE_URL}/protocolos/clinica/1`);
  } catch (error) {
    console.error('❌ Erro ao testar rotas:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response?.status === 404) {}
  }
}

testarRotas(); 