/**
 * Validation runner (WO-33): run checks in parallel with timeout, aggregate pass/fail/warning.
 */
import type { ValidationCheckRow } from '../db/validation-checks.js';
export interface RunCheckInput {
    action?: Record<string, unknown>;
    output?: unknown;
    text?: string;
}
export interface CheckRunResult {
    check_id: string;
    check_type: string;
    result: 'pass' | 'fail' | 'warn';
    reason?: string;
    duration_ms: number;
}
export interface ValidationRunResult {
    result: 'pass' | 'fail' | 'warning';
    checks_run: CheckRunResult[];
    overall_duration_ms: number;
}
export declare function runValidation(checks: ValidationCheckRow[], input: RunCheckInput): Promise<ValidationRunResult>;
