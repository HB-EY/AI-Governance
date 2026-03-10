ALTER TABLE policies DROP CONSTRAINT IF EXISTS fk_policies_current_version;
DROP INDEX IF EXISTS idx_policy_versions_priority;
DROP INDEX IF EXISTS idx_policy_versions_status;
DROP INDEX IF EXISTS idx_policy_versions_policy;
DROP TABLE IF EXISTS policy_versions;
