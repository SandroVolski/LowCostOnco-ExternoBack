// Script de debug para identificar o problema na criação de clínicas
const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE_URL = 'http://localhost:3001/api';

async function debugClinicCreation() {
  try {
    const dbConfig = {
      host: '191.252.1.143',
      user: 'douglas',
      password: 'Douglas193',
      database: 'bd_onkhos',
      port: 3306
    };

    const connection = await mysql.createConnection(dbConfig);
    const [initialClinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');
    const [initialUsuarios] = await connection.execute('SELECT COUNT(*) as count FROM usuarios WHERE role = "clinica"');

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

    const response = await axios.post(`${API_BASE_URL}/clinicas/admin`, clinicData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos

    const [afterClinicas] = await connection.execute('SELECT COUNT(*) as count FROM clinicas');
    const [afterUsuarios] = await connection.execute('SELECT COUNT(*) as count FROM usuarios WHERE role = "clinica"');

    const [clinicaEspecifica] = await connection.execute(
      'SELECT * FROM clinicas WHERE codigo = ?', 
      [clinicData.codigo]
    );

    if (clinicaEspecifica.length > 0) {
      const [usuarioClinica] = await connection.execute(
        'SELECT * FROM usuarios WHERE clinica_id = ? AND username = ?',
        [clinicaEspecifica[0].id, clinicData.usuario]
      );

      if (usuarioClinica.length > 0) {} else {
        // Testar inserção manual
        try {
          const [insertResult] = await connection.execute(`
            INSERT INTO usuarios (username, password_hash, role, clinica_id, operadora_id, status, created_at, updated_at)
            VALUES (?, ?, 'clinica', ?, ?, 'ativo', NOW(), NOW())
          `, [
            clinicData.usuario + '_manual', 
            '$2a$10$test', // hash de teste
            clinicaEspecifica[0].id,
            clinicData.operadora_id
          ]);

          // Limpar teste
          await connection.execute('DELETE FROM usuarios WHERE id = ?', [insertResult.insertId]);
        } catch (insertError) {}
      }
    } else {}

    await connection.end();
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
    if (error.response) {
      console.error('📋 Resposta da API:', error.response.data);
    }
  }
}

debugClinicCreation();
