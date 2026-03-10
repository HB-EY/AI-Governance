/**
 * Enums and literal types for the Agent Governance Control Plane.
 * Values use lowercase kebab-case per API Contracts.
 */

/** Agent version lifecycle status */
export type AgentVersionStatus = 'draft' | 'active' | 'deprecated';

/** Agent risk tier for policy evaluation */
export type AgentRiskTier = 'low' | 'medium' | 'high' | 'critical';

/** Policy version status */
export type PolicyVersionStatus = 'active' | 'disabled';

/** Policy effect */
export type PolicyEffect = 'allow' | 'deny';

/** Run execution status */
export type RunStatus = 'in_progress' | 'success' | 'failed' | 'denied';

/** Trace/action request status */
export type TraceStatus = 'success' | 'denied' | 'failed' | 'pending';

/** Trace span type */
export type TraceSpanType =
  | 'policy_evaluation'
  | 'validation'
  | 'approval'
  | 'downstream_call';

/** Proposal status */
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'committed';

/** Approval request status */
export type ApprovalRequestStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'awaiting-info';

/** Validation check type */
export type ValidationCheckType =
  | 'schema'
  | 'pii'
  | 'sentiment'
  | 'business-rule'
  | 'format';

/** Validation check status */
export type ValidationCheckStatus = 'active' | 'disabled';

/** Idempotency key status */
export type IdempotencyKeyStatus = 'pending' | 'success' | 'failed';

/** Audit log entity type */
export type AuditEntityType =
  | 'agent'
  | 'policy'
  | 'approval'
  | 'validation_check'
  | 'trace';

/** Audit action */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'disable'
  | 'enable'
  | 'export';

/** API error codes */
export type ApiErrorCode =
  | 'invalid_request'
  | 'authentication_required'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'internal_error'
  | 'service_unavailable';

/** Decision type for policy evaluation (used in gateway) */
export type PolicyDecisionType =
  | 'allow'
  | 'deny'
  | 'allow-with-validation'
  | 'allow-with-approval';
