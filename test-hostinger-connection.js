// Script para testar conexão com o banco de dados Hostinger
// Uso: node test-hostinger-connection.js

require('dotenv').config();
const mysql = require('mysql2/promise');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  log('\n🔍 Testando Conexão com Banco de Dados Hostinger\n', 'cyan');
  
  // 1. Verificar variáveis de ambiente
  log('📋 Verificando variáveis de ambiente...', 'blue');
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_onkhos',
    port: parseInt(process.env.DB_PORT || '3306')
  };
  
  log(`   ✓ Host: ${config.host}`, 'green');
  log(`   ✓ User: ${config.user}`, 'green');
  log(`   ✓ Password: ${'*'.repeat(Math.min(config.password.length, 20))}`, 'green');
  log(`   ✓ Database: ${config.database}`, 'green');
  log(`   ✓ Port: ${config.port}`, 'green');
  
  if (!config.host || config.host === 'localhost') {
    log('\n⚠️  AVISO: DB_HOST está como "localhost"', 'yellow');
    log('   Se estiver usando Hostinger, configure o host correto no .env\n', 'yellow');
  }
  
  if (!config.password) {
    log('\n❌ ERRO: DB_PASSWORD não está configurado no .env\n', 'red');
    process.exit(1);
  }
  
  // 2. Testar conexão
  log('\n🔌 Tentando conectar ao banco...', 'blue');
  let connection;
  
  try {
    connection = await mysql.createConnection({
      ...config,
      connectTimeout: 10000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
    
    log('   ✅ Conexão estabelecida com sucesso!', 'green');
    
  } catch (error) {
    log(`   ❌ Falha ao conectar: ${error.message}`, 'red');
    
    if (error.code === 'ENOTFOUND') {
      log('\n💡 Dica: Verifique se o DB_HOST está correto', 'yellow');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('\n💡 Dica: Verifique DB_USER e DB_PASSWORD', 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log('\n💡 Dica: Verifique se o MySQL está rodando e se a porta está correta', 'yellow');
    }
    
    process.exit(1);
  }
  
  // 3. Testar query simples
  log('\n🧪 Testando query SELECT 1...', 'blue');
  try {
    const [rows] = await connection.execute('SELECT 1 as test');
    log(`   ✅ Query executada: resultado = ${rows[0].test}`, 'green');
  } catch (error) {
    log(`   ❌ Erro ao executar query: ${error.message}`, 'red');
    await connection.end();
    process.exit(1);
  }
  
  // 4. Verificar tabelas principais
  log('\n📊 Verificando tabelas principais...', 'blue');
  const tabelasEsperadas = [
    'usuarios',
    'clinicas',
    'operadoras',
    'pacientes',
    'solicitacoes',
    'protocolos'
  ];
  
  try {
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    log(`   ✓ Total de tabelas: ${tableNames.length}`, 'green');
    
    let todasEncontradas = true;
    for (const tabela of tabelasEsperadas) {
      const existe = tableNames.includes(tabela);
      if (existe) {
        log(`   ✅ ${tabela}`, 'green');
      } else {
        log(`   ❌ ${tabela} (não encontrada)`, 'red');
        todasEncontradas = false;
      }
    }
    
    if (!todasEncontradas) {
      log('\n⚠️  Algumas tabelas estão faltando!', 'yellow');
      log('   Execute o script de migração: 01_create_bd_onkhos_COMPLETO.sql', 'yellow');
    }
    
  } catch (error) {
    log(`   ❌ Erro ao verificar tabelas: ${error.message}`, 'red');
  }
  
  // 5. Verificar contadores
  log('\n📈 Verificando dados nas tabelas...', 'blue');
  try {
    const counts = await Promise.all([
      connection.execute('SELECT COUNT(*) as total FROM usuarios'),
      connection.execute('SELECT COUNT(*) as total FROM clinicas'),
      connection.execute('SELECT COUNT(*) as total FROM operadoras'),
      connection.execute('SELECT COUNT(*) as total FROM pacientes'),
      connection.execute('SELECT COUNT(*) as total FROM solicitacoes')
    ]);
    
    const [usuarios] = counts[0][0];
    const [clinicas] = counts[1][0];
    const [operadoras] = counts[2][0];
    const [pacientes] = counts[3][0];
    const [solicitacoes] = counts[4][0];
    
    log(`   ✓ Usuários: ${usuarios.total}`, usuarios.total > 0 ? 'green' : 'yellow');
    log(`   ✓ Clínicas: ${clinicas.total}`, clinicas.total > 0 ? 'green' : 'yellow');
    log(`   ✓ Operadoras: ${operadoras.total}`, operadoras.total > 0 ? 'green' : 'yellow');
    log(`   ✓ Pacientes: ${pacientes.total}`, pacientes.total > 0 ? 'green' : 'yellow');
    log(`   ✓ Solicitações: ${solicitacoes.total}`, solicitacoes.total > 0 ? 'green' : 'yellow');
    
  } catch (error) {
    log(`   ⚠️  Não foi possível contar registros: ${error.message}`, 'yellow');
  }
  
  // 6. Testar charset/collation
  log('\n🔤 Verificando charset e collation...', 'blue');
  try {
    const [dbInfo] = await connection.execute(`
      SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME = ?
    `, [config.database]);
    
    if (dbInfo.length > 0) {
      log(`   ✓ Charset: ${dbInfo[0].DEFAULT_CHARACTER_SET_NAME}`, 'green');
      log(`   ✓ Collation: ${dbInfo[0].DEFAULT_COLLATION_NAME}`, 'green');
      
      if (dbInfo[0].DEFAULT_CHARACTER_SET_NAME !== 'utf8mb4') {
        log('   ⚠️  Recomendado: utf8mb4 para suporte completo a caracteres', 'yellow');
      }
    }
  } catch (error) {
    log(`   ⚠️  Não foi possível verificar charset: ${error.message}`, 'yellow');
  }
  
  // 7. Fechar conexão
  await connection.end();
  
  // Resultado final
  log('\n' + '='.repeat(50), 'cyan');
  log('✅ TESTE DE CONEXÃO CONCLUÍDO COM SUCESSO!', 'green');
  log('='.repeat(50) + '\n', 'cyan');
  
  log('🚀 Próximos passos:', 'blue');
  log('   1. Se estiver em desenvolvimento local, está tudo pronto!');
  log('   2. Se for fazer deploy na Hostinger:');
  log('      - Configure o .env com as credenciais da Hostinger');
  log('      - Execute este teste novamente na VPS');
  log('      - Inicie o backend com PM2\n');
  
  process.exit(0);
}

// Executar teste
testConnection().catch(error => {
  log(`\n❌ Erro inesperado: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

