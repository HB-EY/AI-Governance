import type { Pool } from 'pg';
export declare function getPool(): Pool | null;
export declare function closePool(): Promise<void>;
