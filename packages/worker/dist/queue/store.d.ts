/**
 * Job queue: enqueue, poll with row-level locking, update status.
 */
import type { Pool } from 'pg';
import type { Job } from './types.js';
export declare function enqueue(pool: Pool, name: string, payload: Record<string, unknown>, options?: {
    queue?: string;
    scheduled_at?: Date;
}): Promise<string>;
export declare function pollNext(pool: Pool, queue?: string): Promise<Job | null>;
export declare function complete(pool: Pool, jobId: string): Promise<void>;
export declare function fail(pool: Pool, jobId: string, errorMessage: string): Promise<void>;
