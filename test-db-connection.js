// test-db-connection.js
// Teste de conexão com o banco de dados

const mysql = require('mysql2/promise');

const testConnection = async () => {
  try {
    console.log('🔧 Testando conexão com o banco de dados...');
    
    // Primeiro, tentar conectar sem especificar o banco
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306
    });
    
    console.log('✅ Conexão com MySQL estabelecida!');
    
    // Teste simples de query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query de teste executada:', rows);
    
    // Listar bancos disponíveis
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📋 Bancos disponíveis:');
    databases.forEach(db => {
      console.log(`  - ${db.Database}`);
    });
    
    // Verificar se o banco específico existe
    const targetDb = 'bd_sistema_clinicas';
    const dbExists = databases.some(db => db.Database === targetDb);
    
    if (dbExists) {
      console.log(`✅ Banco ${targetDb} encontrado!`);
      
      // Conectar ao banco específico
      await connection.execute(`USE ${targetDb}`);
      
      // Verificar se a tabela Clinicas existe
      const [tables] = await connection.execute('SHOW TABLES LIKE "Clinicas"');
      if (tables.length > 0) {
        console.log('✅ Tabela Clinicas encontrada!');
        
        // Contar clínicas
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM Clinicas');
        console.log('📊 Total de clínicas:', countResult[0].total);
      } else {
        console.log('⚠️ Tabela Clinicas não encontrada');
      }
    } else {
      console.log(`⚠️ Banco ${targetDb} não encontrado`);
      console.log('💡 Você pode criar o banco com: CREATE DATABASE bd_sistema_clinicas;');
    }
    
    await connection.end();
    console.log('🎉 Teste de conexão concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na conexão com banco:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Dicas para resolver:');
      console.log('1. Verifique se o MySQL/MariaDB está rodando');
      console.log('2. Verifique se a porta 3306 está livre');
      console.log('3. Verifique se o usuário e senha estão corretos');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Erro de acesso negado:');
      console.log('1. Verifique se o usuário "root" tem acesso');
      console.log('2. Verifique se a senha está correta');
      console.log('3. Tente conectar com: mysql -u root -p');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Banco de dados não encontrado:');
      console.log('1. Verifique se o banco "bd_sistema_clinicas" existe');
      console.log('2. Execute: CREATE DATABASE bd_sistema_clinicas;');
    }
  }
};

// Executar teste
testConnection();
