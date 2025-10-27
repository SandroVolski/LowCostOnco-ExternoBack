// debug-protocolos.js - Script para debugar problemas com protocolos

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function debugProtocolos() {
  console.log('🔧 Debugando problemas com protocolos...\n');
  
  try {
    // Teste 1: Verificar se o servidor está respondendo
    console.log('1️⃣ Testando conexão com servidor...');
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Servidor respondendo:', healthResponse.data);
    
    // Teste 2: Verificar se as tabelas existem (via endpoint de teste)
    console.log('\n2️⃣ Testando conexão com banco de dados...');
    const dbResponse = await axios.get(`${API_BASE_URL}/test-db`);
    console.log('✅ Conexão com banco:', dbResponse.data);
    
    // Teste 3: Tentar criar um protocolo simples
    console.log('\n3️⃣ Testando criação de protocolo...');
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
    
    console.log('📤 Enviando dados:', JSON.stringify(protocoloTeste, null, 2));
    
    const createResponse = await axios.post(`${API_BASE_URL}/protocolos`, protocoloTeste);
    console.log('✅ Protocolo criado com sucesso!');
    console.log('📋 Resposta:', createResponse.data);
    
  } catch (error) {
    console.error('❌ Erro encontrado:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response?.status === 500) {
      console.log('\n🔧 Erro 500 - Possíveis causas:');
      console.log('1. Tabelas não existem no banco de dados');
      console.log('2. Erro na query SQL');
      console.log('3. Problema de conexão com banco');
      console.log('\n💡 Soluções:');
      console.log('1. Execute: node setup-protocolos.js');
      console.log('2. Verifique se o banco está rodando');
      console.log('3. Verifique os logs do servidor');
    }
  }
}

debugProtocolos(); 