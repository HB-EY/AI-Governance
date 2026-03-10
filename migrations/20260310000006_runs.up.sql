CREATE TABLE runs (
  id                UUID PRIMARY KEY,
  agent_id          UUID NOT NULL REFERENCES agents(id),
  agent_version_id  UUID NOT NULL REFERENCES agent_versions(id),
  task_description  TEXT,
  status            TEXT NOT NULL CHECK (status IN ('in_progress', 'success', 'failed', 'denied')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_runs_agent ON runs(agent_id, started_at DESC);
CREATE INDEX idx_runs_status ON runs(status);
