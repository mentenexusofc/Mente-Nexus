const { Client } = require('pg');

const connectionString = 'postgresql://postgres:JnE8pBXy43nRbBi7VS9yclL4C5xuUBIK9ZtELgd7g0DZTDCR5VDeoB8IJw4eCY0g@72.60.11.33:5432/mente_nexus';

const sql = `
CREATE TABLE IF NOT EXISTS n8n_historico_mensagens (
  id           BIGSERIAL PRIMARY KEY,
  session_id   VARCHAR(40) NOT NULL,
  message      JSONB NOT NULL,
  created_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_n8n_historico_mensagens_session_id ON n8n_historico_mensagens (session_id);

CREATE TABLE IF NOT EXISTS n8n_fila_mensagens (
  id           BIGSERIAL PRIMARY KEY,
  id_mensagem  VARCHAR(40) NOT NULL,
  telefone     VARCHAR(40) NOT NULL,
  mensagem     TEXT NOT NULL,
  "timestamp"  TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_n8n_fila_mensagens_telefone ON n8n_fila_mensagens (telefone);

CREATE TABLE IF NOT EXISTS n8n_status_atendimento (
  id                   BIGSERIAL PRIMARY KEY,
  session_id           VARCHAR(40) NOT NULL UNIQUE,
  lock_conversa        BOOLEAN NOT NULL DEFAULT FALSE,
  aguardando_followup  BOOLEAN NOT NULL DEFAULT FALSE,
  numero_followup      INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_n8n_status_atendimento_session_id ON n8n_status_atendimento (session_id);
CREATE INDEX IF NOT EXISTS idx_n8n_status_atendimento_aguardando_followup ON n8n_status_atendimento (aguardando_followup);
`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL.');
    await client.query(sql);
    console.log('Tabelas n8n criadas com sucesso!');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  } finally {
    await client.end();
  }
}

run();
