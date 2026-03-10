/**
 * Policy repository: CRUD, list with filters, disable/enable via version status.
 */
import type { PoolClient } from 'pg';
import type { Policy, PolicyVersion } from '@ai-governance/shared';
import type { PolicyListFilters } from '@ai-governance/shared';
import type { PaginatedResult, ListOptions } from './repository.js';
import type { CreatePolicyRequest, UpdatePolicyRequest } from '@ai-governance/shared';
export interface PolicyWithVersion extends Policy {
    version?: PolicyVersion | null;
}
export declare function getPolicyById(id: string, client?: PoolClient): Promise<PolicyWithVersion | null>;
export declare function listPolicies(options: ListOptions & {
    filters?: PolicyListFilters;
}, client?: PoolClient): Promise<PaginatedResult<Policy & {
    status?: string;
}>>;
export declare function createPolicy(data: CreatePolicyRequest, createdBy?: string | null, client?: PoolClient): Promise<PolicyWithVersion>;
export declare function updatePolicy(id: string, data: UpdatePolicyRequest, updatedBy?: string | null, client?: PoolClient): Promise<PolicyWithVersion | null>;
export declare function setPolicyVersionStatus(policyId: string, status: 'active' | 'disabled', client?: PoolClient): Promise<PolicyWithVersion | null>;
export declare function findPolicyByName(name: string, client?: PoolClient): Promise<Policy | null>;
/** List active policy versions for evaluation (by priority desc). */
export declare function listActivePolicyVersions(client?: PoolClient): Promise<PolicyVersion[]>;
