/**
 * PostgreSQL connection config from environment (same vars as root/api).
 */
export declare function getDbConfig(): {
    connectionString: string;
    max: number;
} | null;
