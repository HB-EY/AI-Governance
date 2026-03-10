DROP INDEX IF EXISTS idx_approvals_trace;
DROP INDEX IF EXISTS idx_approvals_expires;
DROP INDEX IF EXISTS idx_approvals_approver;
DROP INDEX IF EXISTS idx_approvals_status;
DROP TABLE IF EXISTS approval_requests;
ALTER TABLE traces DROP CONSTRAINT IF EXISTS fk_traces_proposal;
