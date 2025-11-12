// Teste ultra simples para debug
// Execute com: node test-ultra-simple.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testUltraSimple() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });

    const [simple] = await connection.query('SELECT COUNT(*) as total FROM Pacientes_Clinica');
    const [withLimit] = await connection.query('SELECT id, Paciente_Nome FROM Pacientes_Clinica ORDER BY id DESC LIMIT 2');
    withLimit.forEach(p => console.log(`- ${p.id}: ${p.Paciente_Nome}`));

    const fullQuery = `
      SELECT 
        p.*,
        o.nome as operadora_nome,
        pr.nome as prestador_nome
      FROM Pacientes_Clinica p
      LEFT JOIN Operadoras o ON p.Operadora = o.id
      LEFT JOIN Prestadores pr ON p.Prestador = pr.id
      ORDER BY p.created_at DESC
      LIMIT 5 OFFSET 0
    `;

    const [fullResult] = await connection.query(fullQuery);

    if (fullResult.length > 0) {}

    await connection.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testUltraSimple();