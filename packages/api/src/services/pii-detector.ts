/**
 * PII detection check (WO-31): regex patterns for SSN, credit card, email, phone.
 * Configurable action: fail (block) or warn (log but allow).
 */

export type PiiType = 'ssn' | 'credit_card' | 'email' | 'phone';

export interface PiiConfig {
  types_to_check?: PiiType[];
  action?: 'fail' | 'warn';
}

const PATTERNS: Record<PiiType, RegExp> = {
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{13,19}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
};

export interface PiiCheckResult {
  pass: boolean;
  action: 'fail' | 'warn';
  detected_types: PiiType[];
  message?: string;
}

export function detectPii(text: string, config: PiiConfig = {}): PiiCheckResult {
  const typesToCheck = config.types_to_check ?? (['ssn', 'credit_card', 'email', 'phone'] as PiiType[]);
  const action = config.action ?? 'fail';
  const detected: PiiType[] = [];

  for (const type of typesToCheck) {
    const re = PATTERNS[type];
    if (!re) continue;
    re.lastIndex = 0;
    if (re.test(text)) detected.push(type);
  }

  const pass = action === 'warn' || detected.length === 0;
  return {
    pass,
    action,
    detected_types: detected,
    message: detected.length > 0 ? `PII detected: ${detected.join(', ')}` : undefined,
  };
}
