/**
 * Trace repository: create, get by id, list with filters (WO-25, WO-27).
 */
import type { PoolClient } from 'pg';
import type { Trace } from '@ai-governance/shared';
import type { TraceListFilters } from '@ai-governance/shared';
import type { PaginatedResult, ListOptions } from './repository.js';
export declare function getTraceById(id: string, client?: PoolClient): Promise<Trace | null>;
export declare function createTrace(data: {
    id: string;
    agent_id: string;
    agent_version_id: string;
    run_id?: string | null;
    action_type: string;
    target_resource: string;
    context?: Record<string, unknown> | null;
    reasoning?: string | null;
    request_payload?: Record<string, unknown> | null;
}, client?: PoolClient): Promise<Trace>;
export declare function updateTraceStatus(id: string, status: Trace['status'], client?: PoolClient): Promise<Trace | null>;
export declare function listTraces(options: ListOptions & {
    filters?: TraceListFilters;
}, client?: PoolClient): Promise<PaginatedResult<Trace>>;
