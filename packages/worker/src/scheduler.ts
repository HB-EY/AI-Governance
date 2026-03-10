/**
 * Scheduled task runner: run registered tasks every minute.
 */

const INTERVAL_MS = 60_000; // 1 minute

type ScheduledTask = () => Promise<void>;
const tasks: ScheduledTask[] = [];

let intervalId: ReturnType<typeof setInterval> | null = null;

export function scheduleEveryMinute(task: ScheduledTask): void {
  tasks.push(task);
}

export function startScheduler(): void {
  if (intervalId) return;
  const run = async () => {
    for (const task of tasks) {
      try {
        await task();
      } catch (err) {
        console.error('[scheduler] task error:', err);
      }
    }
  };
  intervalId = setInterval(run, INTERVAL_MS);
  run();
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
