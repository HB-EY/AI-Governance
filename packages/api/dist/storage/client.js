/**
 * S3 client for evidence payloads: upload, download, pre-signed URLs. Retry on failure.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Config } from './config.js';
import { evidenceKey } from './keys.js';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;
let client = null;
function getClient() {
    if (client)
        return client;
    const config = getS3Config();
    if (!config)
        return null;
    client = new S3Client({
        region: config.region,
        ...(config.endpoint && { endpoint: config.endpoint, forcePathStyle: config.forcePathStyle }),
        ...(config.credentials && { credentials: config.credentials }),
    });
    return client;
}
async function withRetry(fn) {
    let lastErr = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await fn();
        }
        catch (e) {
            lastErr = e instanceof Error ? e : new Error(String(e));
            if (i < MAX_RETRIES - 1) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
            }
        }
    }
    throw lastErr ?? new Error('S3 operation failed');
}
export function isS3Configured() {
    return getS3Config() !== null;
}
export async function uploadEvidence(traceId, payload) {
    const c = getClient();
    const config = getS3Config();
    if (!c || !config)
        return null;
    const key = evidenceKey(traceId);
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    try {
        await withRetry(() => c.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: body,
            ContentType: 'application/json',
        })));
        return key;
    }
    catch {
        return null;
    }
}
export async function downloadEvidence(key) {
    const c = getClient();
    const config = getS3Config();
    if (!c || !config)
        return null;
    try {
        const res = await withRetry(() => c.send(new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
        })));
        const body = res.Body;
        if (!body)
            return null;
        return await body.transformToString();
    }
    catch {
        return null;
    }
}
export async function getPresignedDownloadUrl(key, expiresInSeconds = 3600) {
    const c = getClient();
    const config = getS3Config();
    if (!c || !config)
        return null;
    try {
        const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
        return await getSignedUrl(c, command, { expiresIn: expiresInSeconds });
    }
    catch {
        return null;
    }
}
export { evidenceKey };
