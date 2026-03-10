/**
 * Cache key patterns (Data Layer): agent:{id}, policy:{id}, validation:{id}, policies:active.
 */
export const CACHE_PREFIX = {
    agent: 'agent',
    policy: 'policy',
    validation: 'validation',
    policiesActive: 'policies:active',
};
export function agentKey(id) {
    return `${CACHE_PREFIX.agent}:${id}`;
}
export function policyKey(id) {
    return `${CACHE_PREFIX.policy}:${id}`;
}
export function validationKey(id) {
    return `${CACHE_PREFIX.validation}:${id}`;
}
export const POLICIES_ACTIVE_KEY = CACHE_PREFIX.policiesActive;
export function gatewayRequestKey(requestId) {
    return `gateway:request:${requestId}`;
}
export const DASHBOARD_METRICS_KEY = 'dashboard:metrics';
