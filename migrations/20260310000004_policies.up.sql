CREATE TABLE policies (
  id                UUID PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  description       TEXT NOT NULL,
  current_version_id UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        TEXT,
  updated_by        TEXT
);

CREATE INDEX idx_policies_name ON policies(name);
