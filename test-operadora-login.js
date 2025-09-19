// Script para testar o login da operadora
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testOperadoraLogin() {
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sistema_clinicas'
    });

    console.log('🔧 Conectado ao banco de dados');

    // Verificar se existem usuários da operadora
    const [users] = await connection.execute(
      "SELECT * FROM OperadoraUsers"
    );

    console.log('📊 Usuários da operadora encontrados:', users.length);
    
    if (users.length > 0) {
      console.log('👥 Usuários:');
      users.forEach(user => {
        console.log(`  - ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Role: ${user.role}, Status: ${user.status}`);
      });

      // Testar login com o primeiro usuário
      const testUser = users[0];
      console.log(`\n🔧 Testando login com: ${testUser.email}`);
      
      // Verificar senha
      const passwordMatch = await bcrypt.compare('admin123', testUser.password);
      console.log(`🔐 Senha 'admin123' confere: ${passwordMatch}`);
      
      // Verificar operadora
      const [operadoras] = await connection.execute(
        "SELECT * FROM Operadoras WHERE id = ?",
        [testUser.operadora_id]
      );
      
      if (operadoras.length > 0) {
        console.log(`🏢 Operadora: ${operadoras[0].nome} (${operadoras[0].codigo})`);
      } else {
        console.log('❌ Operadora não encontrada');
      }
    } else {
      console.log('❌ Nenhum usuário da operadora encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testOperadoraLogin();
