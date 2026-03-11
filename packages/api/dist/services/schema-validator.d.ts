/**
 * Schema validation check (WO-30): validate payload against JSON schema.
 * Use createRequire so ajv works when the package is ESM or CJS.
 */
export interface SchemaCheckResult {
    pass: boolean;
    errors?: Array<{
        path: string;
        message: string;
    }>;
}
export declare function validateAgainstSchema(schema: Record<string, unknown>, payload: unknown): SchemaCheckResult;
