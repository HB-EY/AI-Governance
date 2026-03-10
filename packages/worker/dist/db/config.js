/**
 * PostgreSQL connection config from environment (same vars as root/api).
 */
function getConnectionString() {
    if (process.env.DATABASE_URL)
        return process.env.DATABASE_URL;
    const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;
    if (PG_HOST && PG_PORT && PG_USER && PG_DATABASE) {
        const auth = PG_PASSWORD ? `${PG_USER}:${encodeURIComponent(PG_PASSWORD)}` : PG_USER;
        return `postgresql://${auth}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
    }
    return null;
}
export function getDbConfig() {
    const connectionString = getConnectionString();
    if (!connectionString)
        return null;
    return {
        connectionString,
        max: parseInt(process.env.PG_POOL_SIZE ?? '5', 10),
    };
}
