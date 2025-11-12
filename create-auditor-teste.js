const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createTestAuditor() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    // Verificar se já existe
    const [existing] = await conn.query(
      'SELECT id FROM auditores WHERE cpf = ?',
      ['123.456.789-00']
    );

    if (existing.length > 0) {
      await conn.query('DELETE FROM auditor_users WHERE auditor_id = ?', [existing[0].id]);
      await conn.query('DELETE FROM auditores WHERE id = ?', [existing[0].id]);
    }

    // Criar auditor
    const [resultAuditor] = await conn.query(
      `INSERT INTO auditores (nome, cpf, email, telefone, registro_profissional, especialidade, ativo)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        'Dr. João Silva',
        '123.456.789-00',
        'auditor@sistema.com',
        '(11) 98765-4321',
        'CRM 12345/SP',
        'Auditoria Médica'
      ]
    );

    const auditorId = resultAuditor.insertId;

    // Criar hash da senha
    const passwordHash = await bcrypt.hash('auditor123', 10);

    // Criar usuário
    await conn.query(
      `INSERT INTO auditor_users (auditor_id, username, password_hash, ativo)
       VALUES (?, ?, ?, TRUE)`,
      [auditorId, 'auditor', passwordHash]
    );
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await conn.end();
  }
}

createTestAuditor();
