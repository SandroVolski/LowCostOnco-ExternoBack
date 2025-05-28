// Teste ultra simples para debug
// Execute com: node test-ultra-simple.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testUltraSimple() {
  console.log('🔧 Teste Ultra Simples...\n');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Conectado ao MySQL');

    // 1. Testar query sem LIMIT
    console.log('\n1. Testando query simples sem LIMIT...');
    const [simple] = await connection.query('SELECT COUNT(*) as total FROM Pacientes_Clinica');
    console.log(`Total de pacientes: ${simple[0].total}`);

    // 2. Testar query com LIMIT usando query() diretamente
    console.log('\n2. Testando query com LIMIT usando query()...');
    const [withLimit] = await connection.query('SELECT id, Paciente_Nome FROM Pacientes_Clinica ORDER BY id DESC LIMIT 2');
    console.log(`Resultados com LIMIT: ${withLimit.length}`);
    withLimit.forEach(p => console.log(`- ${p.id}: ${p.Paciente_Nome}`));

    // 3. Testar a query completa que estava falhando
    console.log('\n3. Testando a query completa...');
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
    console.log(`✅ Query completa funcionou! ${fullResult.length} resultados`);
    
    if (fullResult.length > 0) {
      console.log('Primeiro resultado:', {
        id: fullResult[0].id,
        nome: fullResult[0].Paciente_Nome,
        operadora: fullResult[0].operadora_nome,
        prestador: fullResult[0].prestador_nome
      });
    }

    await connection.end();
    console.log('\n✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testUltraSimple();