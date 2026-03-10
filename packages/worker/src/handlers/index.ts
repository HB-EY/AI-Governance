/**
 * Job handler registry. Register handlers by job name.
 */

import type { JobHandler } from '../queue/index.js';

const handlers = new Map<string, JobHandler>();

export function registerHandler(name: string, handler: JobHandler): void {
  handlers.set(name, handler);
}

export function getHandler(name: string): JobHandler | undefined {
  return handlers.get(name);
}

export function getRegisteredNames(): string[] {
  return Array.from(handlers.keys());
}
