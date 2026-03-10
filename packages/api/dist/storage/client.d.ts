/**
 * S3 client for evidence payloads: upload, download, pre-signed URLs. Retry on failure.
 */
import { evidenceKey } from './keys.js';
export declare function isS3Configured(): boolean;
export declare function uploadEvidence(traceId: string, payload: string | Record<string, unknown>): Promise<string | null>;
export declare function downloadEvidence(key: string): Promise<string | null>;
export declare function getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string | null>;
export { evidenceKey };
