const axios = require('axios');

async function testOperadoraLogin() {
  try {
    console.log('🔧 Testando login de operadora...');
    
    // Primeiro, vamos verificar se há usuários de operadora no banco
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
    
    console.log(`👥 Encontrados ${operadoraUsers.length} usuários de operadora:`);
    operadoraUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Username: ${user.username}, Role: ${user.role}, Operadora: ${user.operadora_nome}`);
    });
    
    await connection.end();
    
    if (operadoraUsers.length === 0) {
      console.log('❌ Nenhum usuário de operadora encontrado. Criando usuário de teste...');
      
      // Criar usuário de teste diretamente no banco
      const testUser = {
        nome: 'Admin Operadora Teste',
        email: 'admin@operadora.com',
        username: 'admin_operadora',
        password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
        operadora_id: 1, // Assumindo que existe operadora com ID 1
        role: 'operadora_admin',
        status: 'ativo'
      };
      
      const insertConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bd_sistema_clinicas',
        port: parseInt(process.env.DB_PORT || '3306')
      });
      
      await insertConnection.execute(`
        INSERT INTO usuarios (nome, email, username, password_hash, operadora_id, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [testUser.nome, testUser.email, testUser.username, testUser.password_hash, testUser.operadora_id, testUser.role, testUser.status]);
      
      await insertConnection.end();
      console.log('✅ Usuário de teste criado');
    }
    
    // Aguardar um pouco para o servidor inicializar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Testar login
    const loginData = {
      email: 'admin@operadora.com',
      password: 'password123'
    };
    
    console.log('📤 Testando login com:', loginData);
    
    const response = await axios.post('http://localhost:3001/api/operadora-auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login de operadora realizado com sucesso!');
    console.log('📋 Resposta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no teste de login de operadora:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOperadoraLogin();
