CREATE TABLE proposals (
  id                UUID PRIMARY KEY,
  trace_id          UUID NOT NULL REFERENCES traces(id),
  agent_id          UUID NOT NULL REFERENCES agents(id),
  proposal_hash     TEXT NOT NULL,
  proposal_content  JSONB NOT NULL,
  evidence_ids      UUID[],
  status            TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'committed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proposals_trace ON proposals(trace_id);
CREATE INDEX idx_proposals_agent ON proposals(agent_id, created_at DESC);
CREATE INDEX idx_proposals_hash ON proposals(proposal_hash);
