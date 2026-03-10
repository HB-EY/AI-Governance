CREATE TABLE policy_versions (
  id                UUID PRIMARY KEY,
  policy_id         UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  rules             JSONB NOT NULL,
  effect            TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  priority          INTEGER NOT NULL DEFAULT 0,
  requires_validation BOOLEAN NOT NULL DEFAULT false,
  validation_types  TEXT[] DEFAULT '{}',
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approver_roles    TEXT[] DEFAULT '{}',
  change_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        TEXT,
  UNIQUE(policy_id, version_number)
);

CREATE INDEX idx_policy_versions_policy ON policy_versions(policy_id, version_number DESC);
CREATE INDEX idx_policy_versions_status ON policy_versions(status);
CREATE INDEX idx_policy_versions_priority ON policy_versions(priority DESC) WHERE status = 'active';

ALTER TABLE policies
  ADD CONSTRAINT fk_policies_current_version
  FOREIGN KEY (current_version_id) REFERENCES policy_versions(id);
