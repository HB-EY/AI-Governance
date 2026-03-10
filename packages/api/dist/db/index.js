/**
 * Data access layer: pool, transactions, base repository, query utils, errors.
 */
export { getPool, closePool } from './pool.js';
export { getDbConfig } from './config.js';
export { withTransaction } from './transaction.js';
export { DbError, wrapDbError, isUniqueViolation, isForeignKeyViolation, isNotNullViolation, } from './errors.js';
export { buildPagination, buildOrderBy, addWhereEq, addWhereLike } from './query-utils.js';
export { mapRow, mapRowDefault } from './repository.js';
