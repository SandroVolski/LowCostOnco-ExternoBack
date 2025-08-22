-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  clinica_id       BIGINT NOT NULL,
  tipo             VARCHAR(32) NOT NULL,
  titulo           VARCHAR(160) NOT NULL,
  mensagem         VARCHAR(500) NOT NULL,
  lida             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  solicitacao_id   BIGINT NULL,
  paciente_id      BIGINT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notif_clinica_created ON notificacoes (clinica_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_clinica_lida ON notificacoes (clinica_id, lida);
CREATE INDEX IF NOT EXISTS idx_notif_solicitacao ON notificacoes (solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_notif_paciente ON notificacoes (paciente_id); 