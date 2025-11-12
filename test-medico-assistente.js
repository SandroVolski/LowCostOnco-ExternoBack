const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMedicoAssistente() {
  let connection;
  
  try {
    // Configuração do banco
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    };

    connection = await mysql.createConnection(config);
    try {
      const [tabelas] = await connection.execute("SHOW TABLES LIKE 'responsaveis_tecnicos'");

      if (tabelas.length > 0) {
        const [estrutura] = await connection.execute('DESCRIBE responsaveis_tecnicos');
        estrutura.forEach(campo => {});

        // Verificar registros
        const [registros] = await connection.execute('SELECT * FROM responsaveis_tecnicos LIMIT 5');
        registros.forEach((reg, index) => {});
      }
    } catch (error) {}

    const [pacientes] = await connection.execute('SELECT id, nome, prestador_id FROM pacientes LIMIT 5');
    pacientes.forEach((paciente, index) => {});

    const [joinResult] = await connection.execute(`
        SELECT 
          p.id,
          p.nome,
          p.prestador_id,
          rt.id as rt_id,
          rt.nome as medico_assistente_nome,
          rt.email as medico_assistente_email,
          rt.telefone as medico_assistente_telefone,
          rt.especialidade as medico_assistente_especialidade
        FROM pacientes p
        LEFT JOIN responsaveis_tecnicos rt ON p.prestador_id = rt.id
        ORDER BY p.id
        LIMIT 5
      `);

    joinResult.forEach((row, index) => {});

    try {
      const [prestador1] = await connection.execute('SELECT * FROM responsaveis_tecnicos WHERE id = 1');
      if (prestador1.length > 0) {}
    } catch (error) {}
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testMedicoAssistente();
