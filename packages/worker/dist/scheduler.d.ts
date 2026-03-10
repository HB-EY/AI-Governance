/**
 * Scheduled task runner: run registered tasks every minute.
 */
type ScheduledTask = () => Promise<void>;
export declare function scheduleEveryMinute(task: ScheduledTask): void;
export declare function startScheduler(): void;
export declare function stopScheduler(): void;
export {};
