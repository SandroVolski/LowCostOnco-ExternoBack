const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupRecursosGlosas() {
  let connection;

  try {
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bd_onkhos',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    // Ler arquivo SQL
    const sqlFilePath = path.join(__dirname, 'create-recursos-glosas-sem-triggers.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

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
          successCount++;
        }
      } catch (error) {
        // Ignorar erros de "já existe"
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          const match = statement.match(/CREATE\s+(?:TABLE|VIEW)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          if (match) {}
        } else {
          console.error(`  ✗ Erro ao executar statement:`, error.message);
          errorCount++;
        }
      }
    }

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
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {} else {
        console.error('❌ Erro ao criar auditor de teste:', error.message, '\n');
      }
    }

    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE '%recursos_glosas%' OR TABLE_NAME LIKE 'auditor%'
      ORDER BY TABLE_NAME
    `);

    tables.forEach(table => {});
  } catch (error) {
    console.error('❌ Erro durante configuração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar
setupRecursosGlosas().catch(console.error);
