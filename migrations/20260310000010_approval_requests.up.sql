-- Add proposal_id FK to traces for reverse reference (traces.proposal_id -> proposals)
ALTER TABLE traces
  ADD CONSTRAINT fk_traces_proposal
  FOREIGN KEY (proposal_id) REFERENCES proposals(id);

CREATE TABLE approval_requests (
  id                UUID PRIMARY KEY,
  trace_id          UUID NOT NULL REFERENCES traces(id),
  proposal_id       UUID NOT NULL REFERENCES proposals(id),
  agent_id          UUID NOT NULL REFERENCES agents(id),
  action_type       TEXT NOT NULL,
  action_summary    TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'awaiting-info')),
  approver_roles    TEXT[] NOT NULL,
  assigned_approvers TEXT[],
  approver_id       TEXT,
  approval_token    TEXT,
  decision_reason   TEXT,
  decided_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,
  escalated         BOOLEAN NOT NULL DEFAULT false,
  escalated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approvals_status ON approval_requests(status);
CREATE INDEX idx_approvals_approver ON approval_requests USING gin(assigned_approvers);
CREATE INDEX idx_approvals_expires ON approval_requests(expires_at) WHERE status = 'pending';
CREATE INDEX idx_approvals_trace ON approval_requests(trace_id);
