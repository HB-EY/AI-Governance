import pg from 'pg';
import { getDbConfig } from './config.js';
let pool = null;
export function getPool() {
    if (pool)
        return pool;
    const config = getDbConfig();
    if (!config)
        return null;
    pool = new pg.Pool(config);
    return pool;
}
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
