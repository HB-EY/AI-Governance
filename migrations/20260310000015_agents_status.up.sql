-- Agent-level status for disable/enable (WO-18)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
