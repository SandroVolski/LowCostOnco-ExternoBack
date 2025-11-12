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
    connection = await mysql.createConnection(dbConfig);
    const [protocolosResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Protocolos'
    `);

    if (protocolosResult[0].count > 0) {
      // Verificar estrutura da tabela
      const [columns] = await connection.execute(`
        DESCRIBE Protocolos
      `);
      columns.forEach(col => {});

      // Verificar se há dados
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM Protocolos');
    } else {}

    const [medicamentosResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Medicamentos_Protocolo'
    `);

    if (medicamentosResult[0].count > 0) {
      // Verificar estrutura da tabela
      const [columns] = await connection.execute(`
        DESCRIBE Medicamentos_Protocolo
      `);
      columns.forEach(col => {});

      // Verificar se há dados
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM Medicamentos_Protocolo');
    } else {}

    const [clinicasResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Clinicas'
    `);

    if (clinicasResult[0].count > 0) {
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM Clinicas');
    } else {}
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificarTabelas(); 