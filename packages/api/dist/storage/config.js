/**
 * S3-compatible storage config from environment.
 */
export function getS3Config() {
    const bucket = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET;
    if (!bucket)
        return null;
    const region = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT ?? process.env.AWS_S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
    return {
        bucket,
        region,
        ...(endpoint && { endpoint, forcePathStyle: true }),
        ...(accessKeyId && secretAccessKey && { credentials: { accessKeyId, secretAccessKey } }),
    };
}
