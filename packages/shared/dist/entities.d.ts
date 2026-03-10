/**
 * Entity types matching the PostgreSQL schema (Data Layer).
 * UUIDs and timestamps align with API Contracts (ISO 8601, string UUIDs).
 */
import type { AgentVersionStatus, AgentRiskTier, PolicyVersionStatus, PolicyEffect, RunStatus, TraceStatus, TraceSpanType, ProposalStatus, ApprovalRequestStatus, ValidationCheckType, ValidationCheckStatus, AuditEntityType, AuditAction } from './enums.js';
/** ISO 8601 UTC timestamp string */
export type Timestamp = string;
/** UUID as string (lowercase, with or without hyphens per API) */
export type UUID = string;
/** Standard audit fields on entities */
export interface AuditFields {
    created_at: Timestamp;
    updated_at: Timestamp;
    created_by?: string | null;
    updated_by?: string | null;
}
export interface Agent {
    id: UUID;
    name: string;
    description: string | null;
    owner_id: string;
    owner_email: string | null;
    current_version_id: UUID | null;
    api_key_hash: string;
    created_at: Timestamp;
    updated_at: Timestamp;
    created_by: string | null;
    updated_by: string | null;
    last_active_at: Timestamp | null;
}
export interface AgentVersion {
    id: UUID;
    agent_id: UUID;
    version_number: number;
    status: AgentVersionStatus;
    purpose: string;
    risk_tier: AgentRiskTier;
    approved_models: string[];
    approved_tools: string[];
    capabilities: string[];
    change_reason: string | null;
    created_at: Timestamp;
    created_by: string | null;
}
export interface Policy {
    id: UUID;
    name: string;
    description: string;
    current_version_id: UUID | null;
    created_at: Timestamp;
    updated_at: Timestamp;
    created_by: string | null;
    updated_by: string | null;
}
export interface PolicyVersion {
    id: UUID;
    policy_id: UUID;
    version_number: number;
    status: PolicyVersionStatus;
    rules: Record<string, unknown>;
    effect: PolicyEffect;
    priority: number;
    requires_validation: boolean;
    validation_types: string[];
    requires_approval: boolean;
    approver_roles: string[];
    change_reason: string | null;
    created_at: Timestamp;
    created_by: string | null;
}
export interface Run {
    id: UUID;
    agent_id: UUID;
    agent_version_id: UUID;
    task_description: string | null;
    status: RunStatus;
    started_at: Timestamp;
    completed_at: Timestamp | null;
    created_at: Timestamp;
}
export interface Trace {
    id: UUID;
    run_id: UUID | null;
    agent_id: UUID;
    agent_version_id: UUID;
    action_type: string;
    target_resource: string;
    status: TraceStatus;
    context: Record<string, unknown> | null;
    reasoning: string | null;
    proposal_id: UUID | null;
    request_payload: Record<string, unknown> | null;
    request_timestamp: Timestamp;
    completed_at: Timestamp | null;
    created_at: Timestamp;
}
export interface TraceSpan {
    id: UUID;
    trace_id: UUID;
    span_type: TraceSpanType;
    span_data: Record<string, unknown>;
    started_at: Timestamp;
    completed_at: Timestamp | null;
    created_at: Timestamp;
}
export interface Proposal {
    id: UUID;
    trace_id: UUID;
    agent_id: UUID;
    proposal_hash: string;
    proposal_content: Record<string, unknown>;
    evidence_ids: UUID[] | null;
    status: ProposalStatus;
    created_at: Timestamp;
    updated_at: Timestamp;
}
export interface ApprovalRequest {
    id: UUID;
    trace_id: UUID;
    proposal_id: UUID;
    agent_id: UUID;
    action_type: string;
    action_summary: string;
    status: ApprovalRequestStatus;
    approver_roles: string[];
    assigned_approvers: string[] | null;
    approver_id: string | null;
    approval_token: string | null;
    decision_reason: string | null;
    decided_at: Timestamp | null;
    expires_at: Timestamp;
    escalated: boolean;
    escalated_at: Timestamp | null;
    created_at: Timestamp;
    updated_at: Timestamp;
}
export interface ValidationCheck {
    id: UUID;
    name: string;
    check_type: ValidationCheckType;
    description: string;
    configuration: Record<string, unknown>;
    status: ValidationCheckStatus;
    timeout_seconds: number;
    created_at: Timestamp;
    updated_at: Timestamp;
    created_by: string | null;
    updated_by: string | null;
}
export interface AuditLog {
    id: UUID;
    entity_type: AuditEntityType;
    entity_id: UUID;
    action: AuditAction;
    changes: Record<string, unknown>;
    user_id: string;
    timestamp: Timestamp;
    ip_address: string | null;
    user_agent: string | null;
}
/** Evidence trace (logical view over Trace + spans for API) */
export type EvidenceTrace = Trace;
//# sourceMappingURL=entities.d.ts.map