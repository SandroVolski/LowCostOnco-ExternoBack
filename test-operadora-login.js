const axios = require('axios');

async function testOperadoraLogin() {
  try {
    const mysql = require('mysql2/promise');
    require('dotenv').config();

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_sistema_clinicas',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    // Verificar usuários de operadora
    const [operadoraUsers] = await connection.execute(`
      SELECT u.*, o.nome as operadora_nome 
      FROM usuarios u 
      JOIN operadoras o ON u.operadora_id = o.id 
      WHERE u.role IN ('operadora_admin', 'operadora_user')
    `);

    operadoraUsers.forEach(user => {});

    await connection.end();

    if (operadoraUsers.length === 0) {
      // Criar usuário de teste
      const testUser = {
        nome: 'Admin Operadora Teste',
        email: 'admin@operadora.com',
        username: 'admin_operadora',
        password: 'password123',
        operadora_id: 1, // Assumindo que existe operadora com ID 1
        role: 'operadora_admin'
      };

      const createResponse = await axios.post('http://localhost:3001/api/operadora-auth/register', testUser, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token' // Token de admin para criar usuário
        }
      });
    }

    // Testar login
    const loginData = {
      email: 'admin@operadora.com',
      password: 'password123'
    };

    const response = await axios.post('http://localhost:3001/api/operadora-auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  } catch (error) {
    console.error('❌ Erro no teste de login de operadora:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Aguardar um pouco para o servidor inicializar
setTimeout(testOperadoraLogin, 2000);