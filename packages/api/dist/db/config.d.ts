/**
 * PostgreSQL connection config from environment.
 */
export declare function getDbConfig(): {
    connectionString: string;
    max: number;
} | null;
