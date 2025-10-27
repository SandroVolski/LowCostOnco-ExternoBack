// Teste de debug para as queries
// Execute com: node debug-query.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDirectQuery() {
  console.log('🔍 Debug das queries SQL...\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });
  
  console.log('✅ Conectado diretamente ao MySQL');

  try {
    // 1. Testar estrutura das tabelas
    console.log('\n1. Verificando estrutura da tabela Pacientes_Clinica...');
    const [columns] = await connection.execute('SHOW COLUMNS FROM Pacientes_Clinica');
    console.log('Colunas encontradas:', columns.map(col => col.Field).join(', '));

    // 2. Contar total de registros
    console.log('\n2. Contando registros...');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM Pacientes_Clinica');
    console.log(`Total de pacientes na tabela: ${countResult[0].total}`);

    if (countResult[0].total === 0) {
      console.log('❌ Tabela está vazia! Vamos inserir um registro de teste...');
      
      const insertQuery = `
        INSERT INTO Pacientes_Clinica 
        (clinica_id, Paciente_Nome, Operadora, Prestador, Codigo, Data_Nascimento, Sexo, Cid_Diagnostico, Data_Primeira_Solicitacao, status)
        VALUES (1, 'Paciente Teste', 1, 1, 'TEST001', '1980-01-01', 'Masculino', 'C50', '2024-01-01', 'ativo')
      `;
      
      try {
        await connection.execute(insertQuery);
        console.log('✅ Paciente de teste inserido!');
      } catch (error) {
        console.log('❌ Erro ao inserir paciente de teste:', error.message);
      }
    }

    // 3. Testar query simples
    console.log('\n3. Testando query simples...');
    const simpleQuery = 'SELECT * FROM Pacientes_Clinica ORDER BY created_at DESC LIMIT 5';
    const [simpleResult] = await connection.execute(simpleQuery);
    console.log(`Resultado da query simples: ${simpleResult.length} registros`);
    
    if (simpleResult.length > 0) {
      console.log('Primeiro registro:', {
        id: simpleResult[0].id,
        nome: simpleResult[0].Paciente_Nome,
        codigo: simpleResult[0].Codigo
      });
    }

    // 4. Testar query com LIMIT e OFFSET
    console.log('\n4. Testando query com LIMIT e OFFSET...');
    const limitQuery = 'SELECT * FROM Pacientes_Clinica ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const [limitResult] = await connection.execute(limitQuery, [10, 0]);
    console.log(`Resultado da query com LIMIT/OFFSET: ${limitResult.length} registros`);

    // 5. Testar query com JOINs
    console.log('\n5. Testando query com JOINs...');
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
      console.log(`✅ Query com JOINs funcionou: ${joinResult.length} registros`);
      
      if (joinResult.length > 0) {
        console.log('Primeiro registro com JOINs:', {
          id: joinResult[0].id,
          nome: joinResult[0].Paciente_Nome,
          operadora: joinResult[0].operadora_nome,
          prestador: joinResult[0].prestador_nome
        });
      }
    } catch (error) {
      console.log('❌ Erro na query com JOINs:', error.message);
    }

    // 6. Verificar se as tabelas relacionadas existem
    console.log('\n6. Verificando tabelas relacionadas...');
    
    try {
      const [operadoras] = await connection.execute('SELECT COUNT(*) as total FROM Operadoras');
      console.log(`Operadoras na tabela: ${operadoras[0].total}`);
    } catch (error) {
      console.log('❌ Tabela Operadoras não existe ou tem problema:', error.message);
    }
    
    try {
      const [prestadores] = await connection.execute('SELECT COUNT(*) as total FROM Prestadores');
      console.log(`Prestadores na tabela: ${prestadores[0].total}`);
    } catch (error) {
      console.log('❌ Tabela Prestadores não existe ou tem problema:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await connection.end();
    console.log('\n✨ Conexão fechada');
  }
}

testDirectQuery().catch(console.error);