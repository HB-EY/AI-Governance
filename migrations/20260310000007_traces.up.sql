CREATE TABLE traces (
  id                UUID PRIMARY KEY,
  run_id            UUID REFERENCES runs(id),
  agent_id          UUID NOT NULL REFERENCES agents(id),
  agent_version_id  UUID NOT NULL REFERENCES agent_versions(id),
  action_type       TEXT NOT NULL,
  target_resource   TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('success', 'denied', 'failed', 'pending')),
  context           JSONB,
  reasoning         TEXT,
  proposal_id       UUID,
  request_payload   JSONB,
  request_timestamp TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_traces_run ON traces(run_id, request_timestamp DESC);
CREATE INDEX idx_traces_agent ON traces(agent_id, request_timestamp DESC);
CREATE INDEX idx_traces_status ON traces(status);
CREATE INDEX idx_traces_action_type ON traces(action_type);
CREATE INDEX idx_traces_timestamp ON traces(request_timestamp DESC);
