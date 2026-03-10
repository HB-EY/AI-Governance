CREATE TABLE idempotency_keys (
  idempotency_key   TEXT PRIMARY KEY,
  trace_id          UUID NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  response_data     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
