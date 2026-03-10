/**
 * Database error handling: constraint violations, timeouts, mapping to domain errors.
 */

import type { DatabaseError } from 'pg';

export class DbError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly constraint?: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'DbError';
  }
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as DatabaseError;
  return e?.code === '23505';
}

export function isForeignKeyViolation(err: unknown): boolean {
  const e = err as DatabaseError;
  return e?.code === '23503';
}

export function isNotNullViolation(err: unknown): boolean {
  const e = err as DatabaseError;
  return e?.code === '23502';
}

export function wrapDbError(err: unknown): DbError {
  const e = err as DatabaseError;
  if (e?.code) {
    return new DbError(e.message ?? 'Database error', e.code, e.constraint, e.detail);
  }
  return new DbError(err instanceof Error ? err.message : 'Database error');
}
