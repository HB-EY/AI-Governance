/**
 * API request and response DTOs (API Contracts).
 * Standard response structure: request_id, timestamp, version, data.
 */

import type { ApiErrorCode } from './enums.js';

/** Standard successful response envelope */
export interface ApiResponse<T> {
  request_id: string;
  timestamp: string;
  version: string;
  data: T;
}

/** Pagination metadata (API Contracts) */
export interface PaginationMeta {
  items: unknown[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  request_id: string;
  timestamp: string;
  version: string;
  data: PaginationMeta & { items: T[] };
}

/** Error detail for API error responses */
export interface ApiErrorDetails {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Standard error response envelope */
export interface ApiErrorResponse {
  request_id: string;
  timestamp: string;
  version: string;
  error: ApiErrorDetails;
}

/** List query params: pagination */
export interface ListQueryParams {
  page?: number;
  page_size?: number;
}

/** List query params: sort */
export interface SortQueryParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Common list params (pagination + sort) */
export type ListParams = ListQueryParams & SortQueryParams;
