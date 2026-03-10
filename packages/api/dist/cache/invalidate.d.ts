/**
 * Pub-sub channel for cache invalidation. Subscribers invalidate local caches when notified.
 */
export declare const INVALIDATION_CHANNEL = "ai-governance:cache-invalidate";
export type InvalidationMessage = {
    key?: string;
    pattern?: string;
    keys?: string[];
};
export declare function publishInvalidation(msg: InvalidationMessage): Promise<boolean>;
export declare function subscribeInvalidation(onMessage: (msg: InvalidationMessage) => void | Promise<void>): {
    unsubscribe: () => Promise<void>;
};
