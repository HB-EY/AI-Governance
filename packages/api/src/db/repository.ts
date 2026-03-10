/**
 * Base repository interface and types. Entities use typed row mapping.
 */

import type { PoolClient } from 'pg';
import type { Pagination, Sort } from './query-utils.js';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Base list filters (pagination + optional sort). */
export interface ListOptions {
  pagination: Pagination;
  sort?: Sort;
}

/** Base repository: common patterns for CRUD. Specific repos extend and add entity methods. */
export interface BaseRepository<T, Id = string> {
  getById(id: Id, client?: PoolClient): Promise<T | null>;
  list(options: ListOptions, client?: PoolClient): Promise<PaginatedResult<T>>;
}

/** Map a database row (snake_case) to an entity (camelCase or as-is). Override per entity. */
export function mapRow<T>(row: Record<string, unknown>, mapping: Record<string, string>): T {
  const out: Record<string, unknown> = {};
  for (const [dbKey, entityKey] of Object.entries(mapping)) {
    if (row[dbKey] !== undefined) out[entityKey] = row[dbKey];
  }
  return out as T;
}

/** Default: pass through row keys (DB uses snake_case matching our entities). */
export function mapRowDefault<T>(row: Record<string, unknown>): T {
  return { ...row } as T;
}
