/**
 * PII detection check (WO-31): regex patterns for SSN, credit card, email, phone.
 * Configurable action: fail (block) or warn (log but allow).
 */
export type PiiType = 'ssn' | 'credit_card' | 'email' | 'phone';
export interface PiiConfig {
    types_to_check?: PiiType[];
    action?: 'fail' | 'warn';
}
export interface PiiCheckResult {
    pass: boolean;
    action: 'fail' | 'warn';
    detected_types: PiiType[];
    message?: string;
}
export declare function detectPii(text: string, config?: PiiConfig): PiiCheckResult;
