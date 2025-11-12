/**
 * Script de setup do módulo financeiro
 * Cria estrutura de diretórios e executa SQL de criação de tabelas
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupFinanceiro() {
  const dirs = [
    'uploads/financeiro',
    'uploads/financeiro/documentos',
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    } else {}
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_onkhos',
    multipleStatements: true,
  });

  try {
    const sqlPath = path.join(__dirname, 'database-financeiro.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    await connection.query(sql);
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME LIKE '%financeiro%' OR TABLE_NAME LIKE 'guias_%' OR TABLE_NAME LIKE 'lotes_%'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'bd_onkhos']);

    tables.forEach((table: any) => {});
  } catch (error: any) {
    console.error('❌ Erro ao executar SQL:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Executar setup
setupFinanceiro()
  .then(() => {
  process.exit(0);
})
  .catch((error) => {
    console.error('\n❌ Erro durante o setup:', error);
    process.exit(1);
  });

