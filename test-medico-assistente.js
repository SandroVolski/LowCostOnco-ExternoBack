const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMedicoAssistente() {
  let connection;
  
  try {
    console.log('🔧 Testando consulta médico assistente...');
    
    // Configuração do banco
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao banco de dados MySQL');
    
    // 1. Verificar se a tabela responsaveis_tecnicos existe
    console.log('\n📋 Verificando tabela responsaveis_tecnicos...');
    try {
      const [tabelas] = await connection.execute("SHOW TABLES LIKE 'responsaveis_tecnicos'");
      console.log('Tabela responsaveis_tecnicos existe:', tabelas.length > 0);
      
      if (tabelas.length > 0) {
        const [estrutura] = await connection.execute('DESCRIBE responsaveis_tecnicos');
        console.log('Estrutura da tabela:');
        estrutura.forEach(campo => {
          console.log(`  ${campo.Field}: ${campo.Type}`);
        });
        
        // Verificar registros
        const [registros] = await connection.execute('SELECT * FROM responsaveis_tecnicos LIMIT 5');
        console.log('\nRegistros encontrados:', registros.length);
        registros.forEach((reg, index) => {
          console.log(`  ${index + 1}. ID: ${reg.id}, Nome: ${reg.nome}`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao verificar tabela responsaveis_tecnicos:', error.message);
    }
    
    // 2. Verificar pacientes
    console.log('\n👥 Verificando pacientes...');
    const [pacientes] = await connection.execute('SELECT id, nome, prestador_id FROM pacientes LIMIT 5');
    console.log('Pacientes encontrados:', pacientes.length);
    pacientes.forEach((paciente, index) => {
      console.log(`  ${index + 1}. ID: ${paciente.id}, Nome: ${paciente.nome}, Prestador ID: ${paciente.prestador_id}`);
    });
    
    // 3. Testar JOIN
    console.log('\n🔍 Testando JOIN entre pacientes e responsaveis_tecnicos...');
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
      
      console.log('Resultado do JOIN:');
      joinResult.forEach((row, index) => {
        console.log(`\nPaciente ${index + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Nome: ${row.nome}`);
        console.log(`  Prestador ID: ${row.prestador_id}`);
        console.log(`  RT ID: ${row.rt_id}`);
        console.log(`  Médico Assistente Nome: ${row.medico_assistente_nome || 'NULL'}`);
        console.log(`  Médico Assistente Email: ${row.medico_assistente_email || 'NULL'}`);
      });
    
    // 4. Verificar se existe algum prestador com ID 1
    console.log('\n🔍 Verificando prestador ID 1...');
    try {
      const [prestador1] = await connection.execute('SELECT * FROM responsaveis_tecnicos WHERE id = 1');
      console.log('Prestador ID 1 encontrado:', prestador1.length > 0);
      if (prestador1.length > 0) {
        console.log('Dados do prestador:', prestador1[0]);
      }
    } catch (error) {
      console.log('❌ Erro ao buscar prestador ID 1:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexão fechada.');
    }
  }
}

testMedicoAssistente();
