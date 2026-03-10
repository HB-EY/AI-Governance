/**
 * Query builder utilities: filters, pagination, sorting. Parameterized for SQL injection safety.
 */
export interface Pagination {
    page: number;
    pageSize: number;
}
export interface Sort {
    column: string;
    order: 'asc' | 'desc';
}
/** Build LIMIT and OFFSET from pagination (1-based page). */
export declare function buildPagination(p: Pagination): {
    limit: number;
    offset: number;
    sql: string;
    values: number[];
};
/** Build ORDER BY clause. Column must be alphanumeric/underscore to avoid injection. */
export declare function buildOrderBy(sort: Sort | undefined, allowedColumns: Set<string>): {
    sql: string;
    values: unknown[];
};
/** Append a simple equality condition (parameterized). */
export declare function addWhereEq(parts: string[], params: unknown[], column: string, value: unknown): void;
/** Append LIKE condition for text search (parameterized). */
export declare function addWhereLike(parts: string[], params: unknown[], column: string, value: string): void;
