/**
 * Job handler registry. Register handlers by job name.
 */
const handlers = new Map();
export function registerHandler(name, handler) {
    handlers.set(name, handler);
}
export function getHandler(name) {
    return handlers.get(name);
}
export function getRegisteredNames() {
    return Array.from(handlers.keys());
}
