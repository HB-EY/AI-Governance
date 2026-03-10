/**
 * Base repository interface and types. Entities use typed row mapping.
 */
/** Map a database row (snake_case) to an entity (camelCase or as-is). Override per entity. */
export function mapRow(row, mapping) {
    const out = {};
    for (const [dbKey, entityKey] of Object.entries(mapping)) {
        if (row[dbKey] !== undefined)
            out[entityKey] = row[dbKey];
    }
    return out;
}
/** Default: pass through row keys (DB uses snake_case matching our entities). */
export function mapRowDefault(row) {
    return { ...row };
}
