// debug-protocolos.js - Script para debugar problemas com protocolos

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function debugProtocolos() {
  try {
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    const dbResponse = await axios.get(`${API_BASE_URL}/test-db`);
    const protocoloTeste = {
      clinica_id: 1,
      nome: 'Protocolo Teste Debug',
      descricao: 'Protocolo para teste de debug',
      medicamentos: [
        {
          nome: 'Medicamento Teste',
          dose: '100',
          unidade_medida: 'mg',
          via_adm: 'EV',
          dias_adm: 'D1',
          frequencia: 'único',
          ordem: 1
        }
      ]
    };

    const createResponse = await axios.post(`${API_BASE_URL}/protocolos`, protocoloTeste);
  } catch (error) {
    console.error('❌ Erro encontrado:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response?.status === 500) {}
  }
}

debugProtocolos(); 