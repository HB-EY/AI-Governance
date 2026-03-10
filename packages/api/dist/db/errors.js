/**
 * Database error handling: constraint violations, timeouts, mapping to domain errors.
 */
export class DbError extends Error {
    code;
    constraint;
    detail;
    constructor(message, code, constraint, detail) {
        super(message);
        this.code = code;
        this.constraint = constraint;
        this.detail = detail;
        this.name = 'DbError';
    }
}
export function isUniqueViolation(err) {
    const e = err;
    return e?.code === '23505';
}
export function isForeignKeyViolation(err) {
    const e = err;
    return e?.code === '23503';
}
export function isNotNullViolation(err) {
    const e = err;
    return e?.code === '23502';
}
export function wrapDbError(err) {
    const e = err;
    if (e?.code) {
        return new DbError(e.message ?? 'Database error', e.code, e.constraint, e.detail);
    }
    return new DbError(err instanceof Error ? err.message : 'Database error');
}
