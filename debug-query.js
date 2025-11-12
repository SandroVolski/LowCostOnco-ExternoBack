// Teste de debug para as queries
// Execute com: node debug-query.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDirectQuery() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    const [columns] = await connection.execute('SHOW COLUMNS FROM Pacientes_Clinica');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM Pacientes_Clinica');

    if (countResult[0].total === 0) {
      const insertQuery = `
        INSERT INTO Pacientes_Clinica 
        (clinica_id, Paciente_Nome, Operadora, Prestador, Codigo, Data_Nascimento, Sexo, Cid_Diagnostico, Data_Primeira_Solicitacao, status)
        VALUES (1, 'Paciente Teste', 1, 1, 'TEST001', '1980-01-01', 'Masculino', 'C50', '2024-01-01', 'ativo')
      `;

      try {
        await connection.execute(insertQuery);
      } catch (error) {}
    }

    const simpleQuery = 'SELECT * FROM Pacientes_Clinica ORDER BY created_at DESC LIMIT 5';
    const [simpleResult] = await connection.execute(simpleQuery);

    if (simpleResult.length > 0) {}

    const limitQuery = 'SELECT * FROM Pacientes_Clinica ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const [limitResult] = await connection.execute(limitQuery, [10, 0]);
    const joinQuery = `
      SELECT 
        p.*,
        o.nome as operadora_nome,
        pr.nome as prestador_nome
      FROM Pacientes_Clinica p
      LEFT JOIN Operadoras o ON p.Operadora = o.id
      LEFT JOIN Prestadores pr ON p.Prestador = pr.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [joinResult] = await connection.execute(joinQuery, [5, 0]);

      if (joinResult.length > 0) {}
    } catch (error) {}

    try {
      const [operadoras] = await connection.execute('SELECT COUNT(*) as total FROM Operadoras');
    } catch (error) {}

    try {
      const [prestadores] = await connection.execute('SELECT COUNT(*) as total FROM Prestadores');
    } catch (error) {}
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await connection.end();
  }
}

testDirectQuery().catch(console.error);