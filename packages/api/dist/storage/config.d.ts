/**
 * S3-compatible storage config from environment.
 */
export declare function getS3Config(): {
    bucket: string;
    region: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
} | null;
