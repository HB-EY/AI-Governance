CREATE TABLE agents (
  id                UUID PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  owner_id          TEXT NOT NULL,
  owner_email       TEXT,
  current_version_id UUID,
  api_key_hash      TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        TEXT,
  updated_by        TEXT,
  last_active_at    TIMESTAMPTZ
);

CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_name_search ON agents USING gin(to_tsvector('english', name));
