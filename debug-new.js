// Debug da nova implementação
// Execute com: node debug-new.js

const mysql = require('mysql2/promise');
require('dotenv').config();

// Simular a função queryWithLimit
async function queryWithLimit(pool, sql, params = [], limit, offset) {
  try {
    // Validar limit e offset
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit))));
    const safeOffset = Math.max(0, Math.floor(Number(offset)));

    // Construir a query final substituindo LIMIT e OFFSET
    const finalSql = sql + ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [results] = params.length > 0 
      ? await pool.execute(finalSql, params)
      : await pool.query(finalSql);

    return results;
  } catch (error) {
    console.error('❌ Erro em queryWithLimit:', error.message);
    throw error;
  }
}

async function debugNew() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Simular exatamente o que o código faz
    const page = 1;
    const limit = 10;
    const search = '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let searchParams = [];

    if (search && search.trim() !== '') {
      whereClause = `WHERE p.Paciente_Nome LIKE ? OR p.Codigo LIKE ? OR p.cpf LIKE ?`;
      const searchTerm = `%${search.trim()}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    }

    // Query base sem LIMIT/OFFSET
    const baseSelectQuery = `
      SELECT 
        p.*,
        o.nome as operadora_nome,
        pr.nome as prestador_nome
      FROM Pacientes_Clinica p
      LEFT JOIN Operadoras o ON p.Operadora = o.id
      LEFT JOIN Prestadores pr ON p.Prestador = pr.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;

    const countQuery = `SELECT COUNT(*) as total FROM Pacientes_Clinica p ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, searchParams);
    const patients = await queryWithLimit(pool, baseSelectQuery, searchParams, limit, offset);

    if (patients.length > 0) {}
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }

  await pool.end();
}

debugNew();