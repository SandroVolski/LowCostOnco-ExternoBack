const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

async function setupFinanceiroOrganizado() {
  let connection;
  
  try {
    console.log('🚀 Iniciando setup do módulo financeiro organizado...\n');
    
    // Conectar ao banco usando as mesmas credenciais do sistema
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ Conectado ao banco de dados bd_onkhos\n');

    // Verificar tabelas existentes
    console.log('🔍 Verificando tabelas existentes...');
    const [existingTables] = await connection.execute('SHOW TABLES');
    const tableNames = existingTables.map(table => Object.values(table)[0]);
    
    console.log(`📋 Encontradas ${tableNames.length} tabelas:`);
    tableNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

    // Verificar se as tabelas financeiras já existem
    const financeiroTables = [
      'financeiro_lotes',
      'financeiro_guias', 
      'financeiro_procedimentos',
      'financeiro_despesas',
      'financeiro_documentos',
      'financeiro_historico'
    ];

    const existingFinanceiroTables = financeiroTables.filter(table => 
      tableNames.includes(table)
    );

    if (existingFinanceiroTables.length > 0) {
      console.log(`\n⚠️  Tabelas financeiras já existentes: ${existingFinanceiroTables.join(', ')}`);
      console.log('   As tabelas existentes serão mantidas (CREATE TABLE IF NOT EXISTS)');
    }

    // Ler e executar o script SQL
    console.log('\n📄 Executando script de criação das tabelas...');
    const sqlScript = fs.readFileSync(path.join(__dirname, 'create-financeiro-tables.sql'), 'utf8');
    
    // Dividir o script em comandos individuais
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`   Executando ${commands.length} comandos SQL...\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        if (command.toLowerCase().includes('create table')) {
          const tableName = command.match(/create table.*?(\w+)/i)?.[1];
          console.log(`   ${i + 1}. Criando tabela: ${tableName || 'desconhecida'}`);
        } else if (command.toLowerCase().includes('create view')) {
          const viewName = command.match(/create.*?view.*?(\w+)/i)?.[1];
          console.log(`   ${i + 1}. Criando view: ${viewName || 'desconhecida'}`);
        } else {
          console.log(`   ${i + 1}. Executando comando SQL...`);
        }
        
        await connection.execute(command);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_VIEW_EXISTS_ERROR') {
          console.log(`   ⚠️  Já existe, pulando...`);
        } else {
          console.error(`   ❌ Erro no comando ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Verificar tabelas criadas
    console.log('\n🔍 Verificando tabelas financeiras criadas...');
    const [newTables] = await connection.execute('SHOW TABLES LIKE "financeiro_%"');
    const newTableNames = newTables.map(table => Object.values(table)[0]);
    
    console.log(`✅ Tabelas financeiras disponíveis (${newTableNames.length}):`);
    newTableNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

    // Verificar views criadas
    console.log('\n🔍 Verificando views criadas...');
    const [views] = await connection.execute('SHOW FULL TABLES WHERE Table_type = "VIEW" AND Tables_in_bd_onkhos LIKE "vw_financeiro_%"');
    const viewNames = views.map(view => Object.values(view)[0]);
    
    if (viewNames.length > 0) {
      console.log(`✅ Views financeiras disponíveis (${viewNames.length}):`);
      viewNames.forEach((name, index) => {
        console.log(`   ${index + 1}. ${name}`);
      });
    }

    // Criar diretório de uploads se não existir
    console.log('\n📁 Verificando diretório de uploads...');
    const uploadsDir = path.join(__dirname, 'uploads', 'financeiro', 'documentos');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`✅ Diretório criado: ${uploadsDir}`);
    } else {
      console.log(`✅ Diretório já existe: ${uploadsDir}`);
    }

    console.log('\n🎉 Setup do módulo financeiro concluído com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Reinicie o backend para carregar as novas rotas');
    console.log('   2. Teste o upload de XML TISS na interface');
    console.log('   3. Verifique se os dados estão sendo salvos corretamente');

  } catch (error) {
    console.error('\n❌ Erro durante o setup:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Dica: Verifique as credenciais do banco de dados');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Dica: Verifique se o banco de dados "bd_onkhos" existe');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar o setup
setupFinanceiroOrganizado();
