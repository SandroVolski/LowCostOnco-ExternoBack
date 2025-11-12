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
    connection = await mysql.createConnection(dbConfig);
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
    } else {}

    const response = await axios.get(`${API_BASE_URL}/protocolos`);
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
  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {} else if (error.code === 'ECONNREFUSED') {} else if (error.response?.status === 500) {}
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixProtocolos(); 