// Teste final para criação de clínica com .env correto
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testClinicCreationFinal() {
  try {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const clinicData = {
      nome: 'Clínica Teste Final Onkhos',
      codigo: 'CLI_ONKHOS_FINAL_001',
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua Teste Final, 123',
      cidade: 'Teresina',
      estado: 'PI',
      cep: '64000-000',
      telefones: ['(86) 99999-9999'],
      emails: ['contato@clinicatestefinal.com'],
      website: 'https://www.clinicatestefinal.com',
      observacoes: 'Clínica de teste final com .env correto',
      usuario: 'clinicatestefinal_onkhos',
      senha: 'senha123',
      status: 'ativo',
      operadora_id: 1
    };

    const response = await axios.post(`${API_BASE_URL}/clinicas/admin`, clinicData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (response.data.success) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verificar se o usuário foi criado
      await verifyUserInDatabase(clinicData.usuario, response.data.data.id);
    } else {}
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Headers:', error.response.headers);
    }
  }
}

async function verifyUserInDatabase(username, clinicaId) {
  try {
    // Criar um script simples para verificar
    const mysql = require('mysql2/promise');

    const config = {
      host: '191.252.1.143',
      user: 'douglas',
      password: 'Douglas193',
      database: 'bd_onkhos',
      port: 3306
    };

    const connection = await mysql.createConnection(config);

    // Verificar usuário específico
    const [users] = await connection.execute(
      'SELECT * FROM usuarios WHERE username = ? AND clinica_id = ?', 
      [username, clinicaId]
    );

    if (users.length === 0) {
      // Verificar se a clínica foi criada
      const [clinicas] = await connection.execute(
        'SELECT * FROM clinicas WHERE id = ?', 
        [clinicaId]
      );

      if (clinicas.length > 0) {} else {}
    } else {}

    await connection.end();
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error.message);
  }
}

testClinicCreationFinal();
