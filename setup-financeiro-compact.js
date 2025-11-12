const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

async function setupFinanceiroCompact() {
  let connection;
  
  try {
    // Conectar ao banco usando as mesmas credenciais do sistema
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    const [existingTables] = await connection.execute('SHOW TABLES');
    const tableNames = existingTables.map(table => Object.values(table)[0]);

    tableNames.forEach((name, index) => {});

    // Verificar se as tabelas financeiras já existem
    const financeiroTables = [
      'financeiro_lotes',
      'financeiro_items', 
      'financeiro_anexos'
    ];

    const existingFinanceiroTables = financeiroTables.filter(table => 
      tableNames.includes(table)
    );

    if (existingFinanceiroTables.length > 0) {}

    const sqlScript = fs.readFileSync(path.join(__dirname, 'create-financeiro-compact.sql'), 'utf8');

    // Dividir o script em comandos individuais
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        if (command.toLowerCase().includes('create table')) {
          const tableName = command.match(/create table.*?(\w+)/i)?.[1];
        } else if (command.toLowerCase().includes('create view')) {
          const viewName = command.match(/create.*?view.*?(\w+)/i)?.[1];
        } else {}
        
        await connection.execute(command);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_VIEW_EXISTS_ERROR') {} else {
          console.error(`   ❌ Erro no comando ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    const [newTables] = await connection.execute('SHOW TABLES LIKE "financeiro_%"');
    const newTableNames = newTables.map(table => Object.values(table)[0]);

    newTableNames.forEach((name, index) => {});

    const [views] = await connection.execute('SHOW FULL TABLES WHERE Table_type = "VIEW" AND Tables_in_bd_onkhos LIKE "vw_financeiro_%"');
    const viewNames = views.map(view => Object.values(view)[0]);

    if (viewNames.length > 0) {
      viewNames.forEach((name, index) => {});
    }

    const uploadsDir = path.join(__dirname, 'uploads', 'financeiro', 'documentos');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } else {}
  } catch (error) {
    console.error('\n❌ Erro durante o setup:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {} else if (error.code === 'ER_BAD_DB_ERROR') {}
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar o setup
setupFinanceiroCompact();
