// Script de debug para identificar o problema na criação de clínicas
const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE_URL = 'http://localhost:3001/api';

async function debugClinicCreation() {
  try {
    console.log('🔧 Iniciando debug da criação de clínicas...');
    
    // 1. Verificar conexão com banco
    console.log('\n📋 1. Verificando conexão com banco...');
    const dbConfig = {
      host: '191.252.1.143',
      user: 'douglas',
      password: 'Douglas193',
      database: 'bd_onkhos',
      port: 3306
    };
    
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexão com banco estabelecida');
    
    // 2. Verificar estado inicial das tabelas
    console.log('\n📋 2. Estado inicial das tabelas...');
    const [initialClinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');
    const [initialUsuarios] = await connection.execute('SELECT COUNT(*) as count FROM usuarios WHERE role = "clinica"');
    
    console.log(`📊 Clínicas existentes: ${initialClinicas[0].count}`);
    console.log(`📊 Usuários de clínicas existentes: ${initialUsuarios[0].count}`);
    
    // 3. Testar criação via API
    console.log('\n📋 3. Testando criação via API...');
    const clinicData = {
      nome: 'Clínica Debug Test',
      codigo: 'CLI_DEBUG_001',
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua Debug, 123',
      cidade: 'Teresina',
      estado: 'PI',
      cep: '64000-000',
      telefones: ['(86) 99999-9999'],
      emails: ['debug@clinicatest.com'],
      website: 'https://www.debug.com',
      observacoes: 'Clínica para debug',
      usuario: 'clinicadebug_test',
      senha: 'senha123',
      status: 'ativo',
      operadora_id: 1
    };

    console.log('📤 Enviando dados para API...');
    const response = await axios.post(`${API_BASE_URL}/clinicas/admin`, clinicData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('📥 Resposta da API:', response.data);

    // 4. Verificar estado após criação
    console.log('\n📋 4. Estado após criação...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
    
    const [afterClinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');
    const [afterUsuarios] = await connection.execute('SELECT COUNT(*) as count FROM usuarios WHERE role = "clinica"');
    
    console.log(`📊 Clínicas após criação: ${afterClinicas[0].count}`);
    console.log(`📊 Usuários de clínicas após criação: ${afterUsuarios[0].count}`);
    
    // 5. Verificar se a clínica específica foi criada
    console.log('\n📋 5. Verificando clínica específica...');
    const [clinicaEspecifica] = await connection.execute(
      'SELECT * FROM clinicas WHERE codigo = ?', 
      [clinicData.codigo]
    );
    
    if (clinicaEspecifica.length > 0) {
      console.log('✅ Clínica foi criada:', clinicaEspecifica[0]);
      
      // 6. Verificar se usuário foi criado para esta clínica
      console.log('\n📋 6. Verificando usuário para esta clínica...');
      const [usuarioClinica] = await connection.execute(
        'SELECT * FROM usuarios WHERE clinica_id = ? AND username = ?',
        [clinicaEspecifica[0].id, clinicData.usuario]
      );
      
      if (usuarioClinica.length > 0) {
        console.log('✅ Usuário foi criado:', usuarioClinica[0]);
      } else {
        console.log('❌ Usuário NÃO foi criado para esta clínica');
        
        // 7. Verificar logs de erro no banco
        console.log('\n📋 7. Verificando se há problemas na query de inserção...');
        
        // Testar inserção manual
        try {
          console.log('🧪 Testando inserção manual de usuário...');
          const [insertResult] = await connection.execute(`
            INSERT INTO usuarios (username, password_hash, role, clinica_id, operadora_id, status, created_at, updated_at)
            VALUES (?, ?, 'clinica', ?, ?, 'ativo', NOW(), NOW())
          `, [
            clinicData.usuario + '_manual', 
            '$2a$10$test', // hash de teste
            clinicaEspecifica[0].id,
            clinicData.operadora_id
          ]);
          
          console.log('✅ Inserção manual funcionou, ID:', insertResult.insertId);
          
          // Limpar teste
          await connection.execute('DELETE FROM usuarios WHERE id = ?', [insertResult.insertId]);
          console.log('🧹 Teste removido');
          
        } catch (insertError) {
          console.log('❌ Erro na inserção manual:', insertError.message);
        }
      }
    } else {
      console.log('❌ Clínica NÃO foi criada');
    }
    
    await connection.end();
    console.log('\n✅ Debug concluído');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
    if (error.response) {
      console.error('📋 Resposta da API:', error.response.data);
    }
  }
}

debugClinicCreation();
