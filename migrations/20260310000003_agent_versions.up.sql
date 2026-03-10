CREATE TABLE agent_versions (
  id                UUID PRIMARY KEY,
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('draft', 'active', 'deprecated')),
  purpose           TEXT NOT NULL,
  risk_tier         TEXT NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
  approved_models   TEXT[] NOT NULL DEFAULT '{}',
  approved_tools    TEXT[] NOT NULL DEFAULT '{}',
  capabilities      TEXT[] NOT NULL DEFAULT '{}',
  change_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        TEXT,
  UNIQUE(agent_id, version_number)
);

CREATE INDEX idx_agent_versions_agent ON agent_versions(agent_id, version_number DESC);
CREATE INDEX idx_agent_versions_status ON agent_versions(status);

ALTER TABLE agents
  ADD CONSTRAINT fk_agents_current_version
  FOREIGN KEY (current_version_id) REFERENCES agent_versions(id);
