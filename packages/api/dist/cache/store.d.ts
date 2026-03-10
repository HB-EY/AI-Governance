/**
 * Cache get/set/delete with error handling and graceful degradation.
 */
export declare function cacheGet<T = string>(key: string): Promise<T | null>;
export declare function cacheSet(key: string, value: string | object, ttlSeconds?: number): Promise<boolean>;
export declare function cacheDelete(key: string): Promise<boolean>;
export declare function cacheDeleteMany(keys: string[]): Promise<boolean>;
