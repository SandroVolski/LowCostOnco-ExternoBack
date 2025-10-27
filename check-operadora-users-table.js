// Script para verificar e criar a tabela OperadoraUsers
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndCreateTable() {
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sistema_clinicas'
    });

    console.log('🔧 Conectado ao banco de dados');

    // Verificar se a tabela existe
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'OperadoraUsers'"
    );

    if (tables.length === 0) {
      console.log('🔧 Tabela OperadoraUsers não existe. Criando...');
      
      // Criar a tabela
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS OperadoraUsers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(100) UNIQUE,
          password VARCHAR(255) NOT NULL,
          operadora_id INT NOT NULL,
          role ENUM('operadora_admin', 'operadora_user') DEFAULT 'operadora_user',
          status ENUM('ativo', 'inativo') DEFAULT 'ativo',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL,
          
          FOREIGN KEY (operadora_id) REFERENCES Operadoras(id) ON DELETE CASCADE,
          
          INDEX idx_email (email),
          INDEX idx_username (username),
          INDEX idx_operadora_id (operadora_id),
          INDEX idx_status (status),
          INDEX idx_role (role)
        )
      `);
      
      console.log('✅ Tabela OperadoraUsers criada com sucesso');
      
      // Inserir usuário admin de exemplo
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(`
        INSERT INTO OperadoraUsers (nome, email, username, password, operadora_id, role, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'Admin Unimed',
        'admin@unimed.com',
        'admin_unimed',
        hashedPassword,
        1, // ID da operadora Unimed
        'operadora_admin',
        'ativo'
      ]);
      
      console.log('✅ Usuário admin de exemplo criado');
      
    } else {
      console.log('✅ Tabela OperadoraUsers já existe');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndCreateTable();
