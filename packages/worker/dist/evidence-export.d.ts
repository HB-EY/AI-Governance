/**
 * Evidence export job (WO-45): query traces, build JSON/CSV, upload to S3, set result_key on job.
 */
import type { Job } from './queue/index.js';
export declare function runEvidenceExport(job: Job): Promise<void>;
