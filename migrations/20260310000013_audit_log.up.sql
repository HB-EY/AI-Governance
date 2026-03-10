CREATE TABLE audit_log (
  id                UUID PRIMARY KEY,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('agent', 'policy', 'approval', 'validation_check')),
  entity_id         UUID NOT NULL,
  action            TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'disable', 'enable')),
  changes           JSONB NOT NULL,
  user_id           TEXT NOT NULL,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address        TEXT,
  user_agent        TEXT
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
