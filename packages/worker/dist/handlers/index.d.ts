/**
 * Job handler registry. Register handlers by job name.
 */
import type { JobHandler } from '../queue/index.js';
export declare function registerHandler(name: string, handler: JobHandler): void;
export declare function getHandler(name: string): JobHandler | undefined;
export declare function getRegisteredNames(): string[];
