/**
 * Database error handling: constraint violations, timeouts, mapping to domain errors.
 */
export declare class DbError extends Error {
    readonly code?: string | undefined;
    readonly constraint?: string | undefined;
    readonly detail?: string | undefined;
    constructor(message: string, code?: string | undefined, constraint?: string | undefined, detail?: string | undefined);
}
export declare function isUniqueViolation(err: unknown): boolean;
export declare function isForeignKeyViolation(err: unknown): boolean;
export declare function isNotNullViolation(err: unknown): boolean;
export declare function wrapDbError(err: unknown): DbError;
