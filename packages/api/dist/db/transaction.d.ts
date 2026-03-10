/**
 * Transaction wrapper with rollback support.
 */
import type { PoolClient } from 'pg';
export declare function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
