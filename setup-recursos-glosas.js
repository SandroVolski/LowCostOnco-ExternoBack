const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupRecursosGlosas() {
  let connection;

  try {
    console.log('🔧 Iniciando configuração do Sistema de Recursos de Glosas...\n');

    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Conectado ao banco de dados\n');

    // Ler arquivo SQL
    const sqlFilePath = path.join(__dirname, 'create-recursos-glosas-sem-triggers.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Executando SQL para criar tabelas...\n');

    // Dividir o SQL em statements individuais para melhor tratamento de erros
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Pular comentários e delimiters
        if (statement.includes('DELIMITER') || statement.startsWith('/*') || statement.startsWith('--')) {
          continue;
        }

        await connection.query(statement + ';');

        // Extrair nome da tabela/view para log
        const match = statement.match(/CREATE\s+(OR REPLACE\s+)?(?:TABLE|VIEW)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
        if (match) {
          const objectName = match[2];
          console.log(`  ✓ ${objectName} criado com sucesso`);
          successCount++;
        }
      } catch (error) {
        // Ignorar erros de "já existe"
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          const match = statement.match(/CREATE\s+(?:TABLE|VIEW)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          if (match) {
            console.log(`  ℹ ${match[1]} já existe (pulando)`);
          }
        } else {
          console.error(`  ✗ Erro ao executar statement:`, error.message);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Sucesso: ${successCount}`);
    console.log(`   Erros: ${errorCount}\n`);

    // Criar auditor de teste
    console.log('👤 Criando auditor de teste...');

    try {
      const [auditorResult] = await connection.execute(
        `INSERT INTO auditores (nome, cpf, email, telefone, registro_profissional, especialidade, ativo)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        ['Dr. João Silva', '123.456.789-00', 'auditor@sistema.com', '(11) 98765-4321', 'CRM 12345', 'Auditoria Médica']
      );

      const auditorId = auditorResult.insertId;

      // Hash temporário simples (em produção, usar bcrypt)
      const tempHash = '$2b$10$YourHashHere';

      await connection.execute(
        `INSERT INTO auditor_users (auditor_id, username, password_hash, ativo)
         VALUES (?, ?, ?, TRUE)`,
        [auditorId, 'auditor', tempHash]
      );

      console.log('✅ Auditor de teste criado:');
      console.log('   Username: auditor');
      console.log('   (Senha será configurada depois)\n');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('ℹ  Auditor de teste já existe (pulando)\n');
      } else {
        console.error('❌ Erro ao criar auditor de teste:', error.message, '\n');
      }
    }

    // Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...');

    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE '%recursos_glosas%' OR TABLE_NAME LIKE 'auditor%'
      ORDER BY TABLE_NAME
    `);

    console.log('\n📋 Tabelas do sistema:');
    tables.forEach(table => {
      console.log(`   • ${table.TABLE_NAME} - ${table.TABLE_COMMENT || 'Sem descrição'}`);
    });

    console.log('\n✅ Configuração concluída com sucesso!');
    console.log('\n🚀 Sistema de Recursos de Glosas está pronto para uso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Implementar controllers e rotas no backend');
    console.log('   2. Criar interfaces frontend para Operadora e Auditor');
    console.log('   3. Implementar sistema de notificações');
    console.log('   4. Testar fluxo completo\n');

  } catch (error) {
    console.error('❌ Erro durante configuração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco fechada\n');
    }
  }
}

// Executar
setupRecursosGlosas().catch(console.error);
