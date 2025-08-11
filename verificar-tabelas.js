// verificar-tabelas.js - Verificar se as tabelas de protocolos existem

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456', // Ajuste para sua senha
  database: 'sistema_clinicas'
};

async function verificarTabelas() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados!');
    
    // Verificar se a tabela Protocolos existe
    console.log('\n🔍 Verificando tabela Protocolos...');
    const [protocolosResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Protocolos'
    `);
    
    if (protocolosResult[0].count > 0) {
      console.log('✅ Tabela Protocolos existe!');
      
      // Verificar estrutura da tabela
      const [columns] = await connection.execute(`
        DESCRIBE Protocolos
      `);
      console.log('📋 Colunas da tabela Protocolos:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
      
      // Verificar se há dados
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM Protocolos');
      console.log(`📊 Total de protocolos: ${count[0].count}`);
      
    } else {
      console.log('❌ Tabela Protocolos NÃO existe!');
    }
    
    // Verificar se a tabela Medicamentos_Protocolo existe
    console.log('\n🔍 Verificando tabela Medicamentos_Protocolo...');
    const [medicamentosResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Medicamentos_Protocolo'
    `);
    
    if (medicamentosResult[0].count > 0) {
      console.log('✅ Tabela Medicamentos_Protocolo existe!');
      
      // Verificar estrutura da tabela
      const [columns] = await connection.execute(`
        DESCRIBE Medicamentos_Protocolo
      `);
      console.log('📋 Colunas da tabela Medicamentos_Protocolo:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
      
      // Verificar se há dados
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM Medicamentos_Protocolo');
      console.log(`📊 Total de medicamentos: ${count[0].count}`);
      
    } else {
      console.log('❌ Tabela Medicamentos_Protocolo NÃO existe!');
    }
    
    // Verificar se a tabela Clinicas existe (necessária para foreign key)
    console.log('\n🔍 Verificando tabela Clinicas...');
    const [clinicasResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Clinicas'
    `);
    
    if (clinicasResult[0].count > 0) {
      console.log('✅ Tabela Clinicas existe!');
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM Clinicas');
      console.log(`📊 Total de clínicas: ${count[0].count}`);
    } else {
      console.log('❌ Tabela Clinicas NÃO existe!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificarTabelas(); 