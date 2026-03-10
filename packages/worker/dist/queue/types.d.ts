export type JobStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'expired';
export interface Job {
    id: string;
    queue: string;
    name: string;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
    status: JobStatus;
    scheduled_at: Date;
    started_at: Date | null;
    completed_at: Date | null;
    locked_at: Date | null;
    locked_by: string | null;
    error_message: string | null;
    created_at: Date;
    updated_at: Date;
}
export type JobHandler = (job: Job) => Promise<void>;
