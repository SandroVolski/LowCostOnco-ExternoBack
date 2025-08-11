// fix-protocolos.js - Script para resolver problemas com protocolos automaticamente

const mysql = require('mysql2/promise');
const axios = require('axios');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456', // Ajuste para sua senha
  database: 'sistema_clinicas'
};

const API_BASE_URL = 'http://localhost:3001/api';

async function fixProtocolos() {
  let connection;
  
  try {
    console.log('🔧 Iniciando correção automática de protocolos...\n');
    
    // 1. Conectar ao banco
    console.log('1️⃣ Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados!');
    
    // 2. Verificar se as tabelas existem
    console.log('\n2️⃣ Verificando tabelas...');
    const [protocolosResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Protocolos'
    `);
    
    const [medicamentosResult] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'sistema_clinicas' 
      AND table_name = 'Medicamentos_Protocolo'
    `);
    
    if (protocolosResult[0].count === 0 || medicamentosResult[0].count === 0) {
      console.log('❌ Tabelas não existem. Criando...');
      
      // Criar tabela Protocolos
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS Protocolos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          clinica_id INT NOT NULL,
          nome VARCHAR(255) NOT NULL,
          descricao TEXT,
          cid VARCHAR(50),
          intervalo_ciclos INT,
          ciclos_previstos INT,
          linha INT,
          status ENUM('ativo', 'inativo') DEFAULT 'ativo',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_clinica_id (clinica_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        )
      `);
      console.log('✅ Tabela Protocolos criada!');
      
      // Criar tabela Medicamentos_Protocolo
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS Medicamentos_Protocolo (
          id INT AUTO_INCREMENT PRIMARY KEY,
          protocolo_id INT NOT NULL,
          nome VARCHAR(255) NOT NULL,
          dose VARCHAR(100),
          unidade_medida VARCHAR(50),
          via_adm VARCHAR(50),
          dias_adm VARCHAR(255),
          frequencia VARCHAR(50),
          observacoes TEXT,
          ordem INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_protocolo_id (protocolo_id),
          INDEX idx_ordem (ordem)
        )
      `);
      console.log('✅ Tabela Medicamentos_Protocolo criada!');
      
      // Inserir dados de exemplo
      console.log('\n3️⃣ Inserindo dados de exemplo...');
      await connection.execute(`
        INSERT INTO Protocolos (clinica_id, nome, descricao, cid, intervalo_ciclos, ciclos_previstos, linha) VALUES
        (1, 'Protocolo AC-T', 'Protocolo padrão para câncer de mama', 'C50', 21, 6, 1),
        (1, 'Protocolo FOLFOX', 'Protocolo para câncer colorretal', 'C18', 14, 12, 1)
      `);
      
      const [protocols] = await connection.execute('SELECT id FROM Protocolos ORDER BY id');
      
      await connection.execute(`
        INSERT INTO Medicamentos_Protocolo (protocolo_id, nome, dose, unidade_medida, via_adm, dias_adm, frequencia, ordem) VALUES
        (?, 'Doxorrubicina', '60', 'mg/m²', 'EV', 'D1', 'único', 1),
        (?, 'Ciclofosfamida', '600', 'mg/m²', 'EV', 'D1', 'único', 2)
      `, [protocols[0].id, protocols[0].id]);
      
      console.log('✅ Dados de exemplo inseridos!');
      
    } else {
      console.log('✅ Tabelas já existem!');
    }
    
    // 4. Testar API
    console.log('\n4️⃣ Testando API...');
    const response = await axios.get(`${API_BASE_URL}/protocolos`);
    console.log('✅ API funcionando!');
    console.log(`📊 Protocolos encontrados: ${response.data.data.data.length}`);
    
    // 5. Testar criação
    console.log('\n5️⃣ Testando criação de protocolo...');
    const novoProtocolo = {
      clinica_id: 1,
      nome: 'Protocolo Teste Fix',
      descricao: 'Protocolo criado pelo script de correção',
      medicamentos: [
        {
          nome: 'Medicamento Teste',
          dose: '100',
          unidade_medida: 'mg',
          via_adm: 'EV',
          dias_adm: 'D1',
          frequencia: 'único',
          ordem: 1
        }
      ]
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/protocolos`, novoProtocolo);
    console.log('✅ Criação de protocolo funcionando!');
    console.log(`📋 Protocolo criado com ID: ${createResponse.data.data.id}`);
    
    console.log('\n🎉 PROBLEMA RESOLVIDO! Protocolos funcionando perfeitamente!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 Tabela não existe. Execute: node setup-protocolos.js');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Servidor não está rodando. Execute: npm start');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Erro 500. Verifique os logs do servidor.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixProtocolos(); 