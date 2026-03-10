ALTER TABLE agents DROP CONSTRAINT IF EXISTS fk_agents_current_version;
DROP INDEX IF EXISTS idx_agent_versions_status;
DROP INDEX IF EXISTS idx_agent_versions_agent;
DROP TABLE IF EXISTS agent_versions;
