/**
 * Schema validation check (WO-30): validate payload against JSON schema.
 */
export interface SchemaCheckResult {
    pass: boolean;
    errors?: Array<{
        path: string;
        message: string;
    }>;
}
export declare function validateAgainstSchema(schema: Record<string, unknown>, payload: unknown): SchemaCheckResult;
