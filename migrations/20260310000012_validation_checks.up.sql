CREATE TABLE validation_checks (
  id                UUID PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  check_type        TEXT NOT NULL CHECK (check_type IN ('schema', 'pii', 'sentiment', 'business-rule', 'format')),
  description       TEXT NOT NULL,
  configuration     JSONB NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  timeout_seconds   INTEGER NOT NULL DEFAULT 5,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        TEXT,
  updated_by        TEXT
);

CREATE INDEX idx_validation_status ON validation_checks(status);
CREATE INDEX idx_validation_type ON validation_checks(check_type);
