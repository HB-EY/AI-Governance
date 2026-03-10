/**
 * Scheduled task runner: run registered tasks every minute.
 */
const INTERVAL_MS = 60_000; // 1 minute
const tasks = [];
let intervalId = null;
export function scheduleEveryMinute(task) {
    tasks.push(task);
}
export function startScheduler() {
    if (intervalId)
        return;
    const run = async () => {
        for (const task of tasks) {
            try {
                await task();
            }
            catch (err) {
                console.error('[scheduler] task error:', err);
            }
        }
    };
    intervalId = setInterval(run, INTERVAL_MS);
    run();
}
export function stopScheduler() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
