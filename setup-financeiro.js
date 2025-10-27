/**
 * Script de setup do módulo financeiro
 * Cria estrutura de diretórios e executa SQL de criação de tabelas
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupFinanceiro() {
  console.log('🚀 Iniciando setup do módulo financeiro...\n');

  // 1. Criar diretórios para uploads
  console.log('📁 Criando estrutura de diretórios...');
  const dirs = [
    'uploads/financeiro',
    'uploads/financeiro/documentos',
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   ✅ Criado: ${dir}`);
    } else {
      console.log(`   ℹ️  Já existe: ${dir}`);
    }
  }

  // 2. Conectar ao banco de dados
  console.log('\n🔌 Conectando ao banco de dados...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_onkhos',
    multipleStatements: true,
  });

  console.log('   ✅ Conectado ao banco de dados\n');

  // 3. Executar SQL de criação de tabelas
  console.log('📊 Executando SQL de criação de tabelas...');
  
  try {
    const sqlPath = path.join(__dirname, 'database-financeiro.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    await connection.query(sql);
    console.log('   ✅ Tabelas criadas com sucesso!\n');

    // 4. Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME LIKE '%financeiro%' OR TABLE_NAME LIKE 'guias_%' OR TABLE_NAME LIKE 'lotes_%'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'bd_onkhos']);

    tables.forEach((table: any) => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });

    console.log('\n✨ Setup do módulo financeiro concluído com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Reinicie o servidor backend');
    console.log('   2. Acesse /financeiro na interface da clínica');
    console.log('   3. Faça upload de um arquivo XML TISS');
    
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
    console.log('\n✅ Processo finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante o setup:', error);
    process.exit(1);
  });

