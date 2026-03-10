/**
 * Query builder utilities: filters, pagination, sorting. Parameterized for SQL injection safety.
 */
const ALLOWED_SORT_ORDER = new Set(['asc', 'desc']);
/** Build LIMIT and OFFSET from pagination (1-based page). */
export function buildPagination(p) {
    const limit = Math.min(Math.max(1, p.pageSize), 100);
    const offset = (Math.max(1, p.page) - 1) * limit;
    return { limit, offset, sql: ' LIMIT $1 OFFSET $2 ', values: [limit, offset] };
}
/** Build ORDER BY clause. Column must be alphanumeric/underscore to avoid injection. */
export function buildOrderBy(sort, allowedColumns) {
    if (!sort || !allowedColumns.has(sort.column))
        return { sql: '', values: [] };
    const order = ALLOWED_SORT_ORDER.has(sort.order) ? sort.order : 'asc';
    const col = sort.column.replace(/[^a-zA-Z0-9_]/g, '');
    return { sql: ` ORDER BY "${col}" ${order} `, values: [] };
}
/** Append a simple equality condition (parameterized). */
export function addWhereEq(parts, params, column, value) {
    if (value === undefined || value === null)
        return;
    const idx = params.length + 1;
    parts.push(` AND "${column.replace(/[^a-zA-Z0-9_]/g, '')}" = $${idx} `);
    params.push(value);
}
/** Append LIKE condition for text search (parameterized). */
export function addWhereLike(parts, params, column, value) {
    if (!value.trim())
        return;
    const idx = params.length + 1;
    parts.push(` AND "${column.replace(/[^a-zA-Z0-9_]/g, '')}" ILIKE $${idx} `);
    params.push(`%${value.trim()}%`);
}
