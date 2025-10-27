// setup-protocolos.js - Script para configurar as tabelas de protocolos

const mysql = require('mysql2/promise');

// Configuração do banco de dados (ajuste conforme necessário)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456', // Ajuste para sua senha
  database: 'sistema_clinicas'
};

async function setupProtocolos() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Conectado ao banco de dados!');
    
    // Criar tabela de Protocolos
    console.log('🔧 Criando tabela Protocolos...');
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
    
    // Criar tabela de Medicamentos_Protocolo
    console.log('🔧 Criando tabela Medicamentos_Protocolo...');
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
    
    // Verificar se já existem dados de exemplo
    const [existingProtocols] = await connection.execute('SELECT COUNT(*) as count FROM Protocolos');
    
    if (existingProtocols[0].count === 0) {
      console.log('🔧 Inserindo dados de exemplo...');
      
      // Inserir protocolos de exemplo
      await connection.execute(`
        INSERT INTO Protocolos (clinica_id, nome, descricao, cid, intervalo_ciclos, ciclos_previstos, linha) VALUES
        (1, 'Protocolo AC-T', 'Protocolo padrão para câncer de mama - Doxorrubicina + Ciclofosfamida seguido de Paclitaxel', 'C50', 21, 6, 1),
        (1, 'Protocolo FOLFOX', 'Protocolo para câncer colorretal - Oxaliplatina + Leucovorina + 5-FU', 'C18', 14, 12, 1),
        (1, 'Protocolo Carboplatina + Paclitaxel', 'Protocolo para câncer de ovário - Carboplatina + Paclitaxel', 'C56', 21, 6, 1)
      `);
      
      // Buscar IDs dos protocolos inseridos
      const [protocols] = await connection.execute('SELECT id FROM Protocolos ORDER BY id');
      
      // Inserir medicamentos para o protocolo AC-T (ID 1)
      await connection.execute(`
        INSERT INTO Medicamentos_Protocolo (protocolo_id, nome, dose, unidade_medida, via_adm, dias_adm, frequencia, ordem) VALUES
        (?, 'Doxorrubicina', '60', 'mg/m²', 'EV', 'D1', 'único', 1),
        (?, 'Ciclofosfamida', '600', 'mg/m²', 'EV', 'D1', 'único', 2),
        (?, 'Paclitaxel', '175', 'mg/m²', 'EV', 'D1', 'único', 3)
      `, [protocols[0].id, protocols[0].id, protocols[0].id]);
      
      // Inserir medicamentos para o protocolo FOLFOX (ID 2)
      await connection.execute(`
        INSERT INTO Medicamentos_Protocolo (protocolo_id, nome, dose, unidade_medida, via_adm, dias_adm, frequencia, ordem) VALUES
        (?, 'Oxaliplatina', '85', 'mg/m²', 'EV', 'D1', 'único', 1),
        (?, 'Leucovorina', '400', 'mg/m²', 'EV', 'D1,D2', '1x', 2),
        (?, '5-Fluorouracil', '400', 'mg/m²', 'EV', 'D1,D2', '1x', 3),
        (?, '5-Fluorouracil', '2400', 'mg/m²', 'EV', 'D1,D2', 'infusão contínua', 4)
      `, [protocols[1].id, protocols[1].id, protocols[1].id, protocols[1].id]);
      
      // Inserir medicamentos para o protocolo Carboplatina + Paclitaxel (ID 3)
      await connection.execute(`
        INSERT INTO Medicamentos_Protocolo (protocolo_id, nome, dose, unidade_medida, via_adm, dias_adm, frequencia, ordem) VALUES
        (?, 'Carboplatina', 'AUC 6', 'AUC', 'EV', 'D1', 'único', 1),
        (?, 'Paclitaxel', '175', 'mg/m²', 'EV', 'D1', 'único', 2)
      `, [protocols[2].id, protocols[2].id]);
      
      console.log('✅ Dados de exemplo inseridos!');
    } else {
      console.log('ℹ️ Dados de exemplo já existem, pulando inserção...');
    }
    
    // Verificar dados inseridos
    const [protocolsCount] = await connection.execute('SELECT COUNT(*) as count FROM Protocolos');
    const [medicamentosCount] = await connection.execute('SELECT COUNT(*) as count FROM Medicamentos_Protocolo');
    
    console.log('\n📊 Resumo da configuração:');
    console.log(`   Protocolos: ${protocolsCount[0].count}`);
    console.log(`   Medicamentos: ${medicamentosCount[0].count}`);
    
    console.log('\n✅ Configuração de Protocolos concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar configuração
setupProtocolos(); 