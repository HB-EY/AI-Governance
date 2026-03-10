/**
 * Agent repository: CRUD, list with filters, status updates.
 */
import type { PoolClient } from 'pg';
import type { Agent } from '@ai-governance/shared';
import type { PaginatedResult, ListOptions } from './repository.js';
import type { AgentListFilters } from '@ai-governance/shared';
export declare function getAgentById(id: string, client?: PoolClient): Promise<Agent | null>;
export declare function listAgents(options: ListOptions & {
    filters?: AgentListFilters;
}, client?: PoolClient): Promise<PaginatedResult<Agent>>;
/** Create agent and first version in a transaction; returns agent. */
export declare function createAgent(data: {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    owner_email: string | null;
    api_key_hash: string;
    created_by?: string | null;
}, capabilities: string[]): Promise<Agent>;
export declare function updateAgentMetadata(id: string, data: {
    description?: string;
    owner_id?: string;
    owner_email?: string | null;
    capabilities?: string[];
}, client?: PoolClient): Promise<Agent | null>;
export declare function updateAgentStatus(id: string, status: 'active' | 'disabled' | 'suspended', client?: PoolClient): Promise<Agent | null>;
export declare function findAgentByName(name: string, client?: PoolClient): Promise<Agent | null>;
