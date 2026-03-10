/**
 * Cache key patterns (Data Layer): agent:{id}, policy:{id}, validation:{id}, policies:active.
 */
export declare const CACHE_PREFIX: {
    readonly agent: "agent";
    readonly policy: "policy";
    readonly validation: "validation";
    readonly policiesActive: "policies:active";
};
export declare function agentKey(id: string): string;
export declare function policyKey(id: string): string;
export declare function validationKey(id: string): string;
export declare const POLICIES_ACTIVE_KEY: "policies:active";
export declare function gatewayRequestKey(requestId: string): string;
export declare const DASHBOARD_METRICS_KEY = "dashboard:metrics";
