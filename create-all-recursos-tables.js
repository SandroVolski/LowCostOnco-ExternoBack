const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAllTables() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recursos_glosas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guia_id INT NOT NULL COMMENT 'ID do financeiro_items (guia)',
        lote_id INT NOT NULL,
        clinica_id INT NOT NULL,
        operadora_registro_ans VARCHAR(50) NOT NULL,
        justificativa TEXT NOT NULL,
        motivos_glosa TEXT,
        valor_guia DECIMAL(12, 2) NOT NULL,
        status_recurso ENUM(
          'pendente',
          'em_analise_operadora',
          'solicitado_parecer',
          'em_analise_auditor',
          'parecer_emitido',
          'deferido',
          'indeferido',
          'devolvido_clinica'
        ) DEFAULT 'pendente',
        data_envio_clinica TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_recebimento_operadora TIMESTAMP NULL,
        data_solicitacao_parecer TIMESTAMP NULL,
        data_recebimento_auditor TIMESTAMP NULL,
        data_emissao_parecer TIMESTAMP NULL,
        data_decisao_final TIMESTAMP NULL,
        usuario_clinica_id INT,
        usuario_operadora_id INT,
        auditor_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (guia_id) REFERENCES financeiro_items(id) ON DELETE CASCADE,
        FOREIGN KEY (lote_id) REFERENCES financeiro_lotes(id) ON DELETE CASCADE,
        FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE,
        FOREIGN KEY (auditor_id) REFERENCES auditores(id) ON DELETE SET NULL,
        INDEX idx_guia (guia_id),
        INDEX idx_lote (lote_id),
        INDEX idx_clinica (clinica_id),
        INDEX idx_status (status_recurso),
        INDEX idx_auditor (auditor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recursos_glosas_documentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recurso_glosa_id INT NOT NULL,
        tipo_documento VARCHAR(50) NOT NULL,
        nome_original VARCHAR(255) NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(500) NOT NULL,
        tamanho_arquivo INT,
        mime_type VARCHAR(100),
        enviado_por ENUM('clinica', 'operadora', 'auditor') NOT NULL,
        usuario_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
        INDEX idx_recurso (recurso_glosa_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recursos_glosas_pareceres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recurso_glosa_id INT NOT NULL,
        auditor_id INT NOT NULL,
        parecer_tecnico TEXT NOT NULL,
        recomendacao ENUM('aprovar', 'negar', 'solicitar_documentos', 'parcial') NOT NULL,
        valor_recomendado DECIMAL(12, 2),
        justificativa_tecnica TEXT,
        cids_analisados TEXT,
        procedimentos_analisados TEXT,
        data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tempo_analise_minutos INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
        FOREIGN KEY (auditor_id) REFERENCES auditores(id) ON DELETE CASCADE,
        INDEX idx_recurso (recurso_glosa_id),
        INDEX idx_auditor (auditor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recursos_glosas_historico (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recurso_glosa_id INT NOT NULL,
        acao VARCHAR(100) NOT NULL,
        status_anterior VARCHAR(50),
        status_novo VARCHAR(50),
        realizado_por ENUM('clinica', 'operadora', 'auditor', 'sistema') NOT NULL,
        usuario_id INT,
        usuario_nome VARCHAR(255),
        descricao TEXT,
        dados_adicionais TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
        INDEX idx_recurso (recurso_glosa_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recursos_glosas_chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recurso_glosa_id INT NOT NULL,
        tipo_remetente ENUM('operadora', 'auditor') NOT NULL,
        remetente_id INT NOT NULL,
        remetente_nome VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        anexos TEXT,
        lida BOOLEAN DEFAULT FALSE,
        data_leitura TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
        INDEX idx_recurso (recurso_glosa_id),
        INDEX idx_lida (lida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recursos_glosas_notificacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recurso_glosa_id INT NOT NULL,
        destinatario_tipo ENUM('clinica', 'operadora', 'auditor') NOT NULL,
        destinatario_id INT NOT NULL,
        tipo_notificacao VARCHAR(50) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        link VARCHAR(500),
        lida BOOLEAN DEFAULT FALSE,
        data_leitura TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recurso_glosa_id) REFERENCES recursos_glosas(id) ON DELETE CASCADE,
        INDEX idx_recurso (recurso_glosa_id),
        INDEX idx_destinatario (destinatario_tipo, destinatario_id),
        INDEX idx_lida (lida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE OR REPLACE VIEW vw_recursos_glosas_completo AS
      SELECT
        rg.id,
        rg.guia_id,
        rg.lote_id,
        rg.clinica_id,
        rg.operadora_registro_ans,
        rg.justificativa,
        rg.motivos_glosa,
        rg.valor_guia,
        rg.status_recurso,
        rg.data_envio_clinica,
        rg.auditor_id,
        g.numero_guia_prestador,
        g.numero_guia_operadora,
        g.numero_carteira,
        g.status_pagamento,
        l.numero_lote,
        l.competencia,
        l.operadora_nome,
        c.nome as clinica_nome,
        a.nome as auditor_nome,
        (SELECT COUNT(*) FROM recursos_glosas_documentos WHERE recurso_glosa_id = rg.id) as total_documentos,
        (SELECT COUNT(*) FROM recursos_glosas_historico WHERE recurso_glosa_id = rg.id) as total_historico,
        rg.created_at,
        rg.updated_at
      FROM recursos_glosas rg
      LEFT JOIN financeiro_items g ON rg.guia_id = g.id
      LEFT JOIN financeiro_lotes l ON rg.lote_id = l.id
      LEFT JOIN clinicas c ON rg.clinica_id = c.id
      LEFT JOIN auditores a ON rg.auditor_id = a.id
    `);

    // Verificar
    const [tables] = await conn.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND (TABLE_NAME LIKE '%recursos_glosas%' OR TABLE_NAME LIKE 'auditor%')
      ORDER BY TABLE_NAME
    `);

    tables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`));
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

createAllTables()
  .then(() => {
  process.exit(0);
})
  .catch(err => {
    console.error('💥 Falha na configuração:', err);
    process.exit(1);
  });
