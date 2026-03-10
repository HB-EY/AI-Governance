import { type Options } from '@hey-api/client-fetch';
import type { GetHealthData, GetV1MeData } from './types.gen';
export declare const client: import("@hey-api/client-fetch").Client<Request, Response, unknown, import("@hey-api/client-fetch").RequestOptionsBase<false> & import("@hey-api/client-fetch").Config<false> & {
    headers: Headers;
}>;
/**
 * Health check
 */
export declare const getHealth: <ThrowOnError extends boolean = false>(options?: Options<GetHealthData, ThrowOnError>) => import("@hey-api/client-fetch").RequestResult<{
    status?: "ok";
    timestamp?: string;
}, unknown, ThrowOnError>;
/**
 * Current identity
 */
export declare const getV1Me: <ThrowOnError extends boolean = false>(options?: Options<GetV1MeData, ThrowOnError>) => import("@hey-api/client-fetch").RequestResult<{
    request_id?: string;
    timestamp?: string;
    version?: string;
    data?: {
        agent_id?: string;
        auth_type?: "agent";
    };
}, unknown, ThrowOnError>;
