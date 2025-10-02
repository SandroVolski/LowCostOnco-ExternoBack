// Teste final para criação de clínica com .env correto
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testClinicCreationFinal() {
  try {
    console.log('🔧 Testando criação de clínica com .env correto...');
    
    // Aguardar servidor inicializar
    console.log('⏳ Aguardando servidor inicializar...');
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

    console.log('📋 Dados da clínica:');
    console.log(JSON.stringify(clinicData, null, 2));

    const response = await axios.post(`${API_BASE_URL}/clinicas/admin`, clinicData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('✅ Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('✅ Clínica criada com sucesso!');
      console.log('📋 ID da clínica:', response.data.data.id);
      
      // Aguardar um pouco e verificar se o usuário foi criado
      console.log('⏳ Aguardando 3 segundos para verificar usuário...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar se o usuário foi criado
      await verifyUserInDatabase(clinicData.usuario, response.data.data.id);
    } else {
      console.log('❌ Erro ao criar clínica:', response.data.message);
    }

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
    console.log('🔍 Verificando se usuário foi criado no banco...');
    
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
    console.log('✅ Conectado ao banco para verificação');
    
    // Verificar usuário específico
    const [users] = await connection.execute(
      'SELECT * FROM usuarios WHERE username = ? AND clinica_id = ?', 
      [username, clinicaId]
    );
    
    if (users.length === 0) {
      console.log('❌ Usuário NÃO foi criado na tabela usuarios!');
      
      // Verificar se a clínica foi criada
      const [clinicas] = await connection.execute(
        'SELECT * FROM clinicas WHERE id = ?', 
        [clinicaId]
      );
      
      if (clinicas.length > 0) {
        console.log('✅ Clínica foi criada corretamente:');
        console.log('📋 Clínica:', clinicas[0].nome, 'ID:', clinicas[0].id);
        console.log('\n⚠️ PROBLEMA CONFIRMADO: Clínica criada mas usuário NÃO foi criado na tabela usuarios');
      } else {
        console.log('❌ Nem clínica nem usuário foram criados');
      }
    } else {
      console.log('✅ Usuário foi criado corretamente:');
      console.log('📋 Usuário:', users[0].username, 'ID:', users[0].id, 'Clínica ID:', users[0].clinica_id);
      console.log('🎉 PROBLEMA RESOLVIDO! Usuário criado com sucesso na tabela usuarios');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error.message);
  }
}

// Executar teste
console.log('🚀 Iniciando teste final de criação de clínica...');
testClinicCreationFinal();
