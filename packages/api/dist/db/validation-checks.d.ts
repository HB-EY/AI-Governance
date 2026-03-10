/**
 * Validation check repository (WO-29).
 */
import type { PoolClient } from 'pg';
import type { CreateValidationCheckRequest, UpdateValidationCheckRequest } from '@ai-governance/shared';
export interface ValidationCheckRow {
    id: string;
    name: string;
    check_type: string;
    description: string;
    configuration: Record<string, unknown>;
    status: string;
    timeout_seconds: number;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}
export declare function getValidationCheckById(id: string, client?: PoolClient): Promise<ValidationCheckRow | null>;
export declare function listValidationChecks(filters: {
    check_type?: string;
    status?: string;
}, client?: PoolClient): Promise<ValidationCheckRow[]>;
export declare function createValidationCheck(data: CreateValidationCheckRequest, createdBy?: string | null, client?: PoolClient): Promise<ValidationCheckRow>;
export declare function updateValidationCheck(id: string, data: UpdateValidationCheckRequest, updatedBy?: string | null, client?: PoolClient): Promise<ValidationCheckRow | null>;
export declare function setValidationCheckStatus(id: string, status: 'active' | 'disabled', client?: PoolClient): Promise<ValidationCheckRow | null>;
export declare function findValidationCheckByName(name: string, client?: PoolClient): Promise<ValidationCheckRow | null>;
