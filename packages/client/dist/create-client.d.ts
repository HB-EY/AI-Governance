/**
 * Create a configured API client with baseUrl, auth, and retry.
 */
export interface ApiClientConfig {
    baseUrl: string;
    /** Return Bearer token for agent or user auth (e.g. agk_<jwt> or session JWT). */
    getToken?: () => string | Promise<string>;
    retries?: number;
}
export declare function createApiClient(config: ApiClientConfig): {
    client: import("@hey-api/client-fetch").Client<Request, Response, unknown, import("@hey-api/client-fetch").RequestOptionsBase<false> & import("@hey-api/client-fetch").Config<false> & {
        headers: Headers;
    }>;
};
export type ApiClient = ReturnType<typeof createApiClient>;
