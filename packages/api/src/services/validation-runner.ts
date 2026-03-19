/**
 * Validation runner (WO-33): run checks in parallel with timeout, aggregate pass/fail/warning.
 */

import type { ValidationCheckRow } from '../db/validation-checks.js';
import { validateAgainstSchema } from './schema-validator.js';
import { detectPii, type PiiConfig } from './pii-detector.js';
import { analyzeSentiment } from './sentiment-analyzer.js';
import { validateBusinessRule } from './business-rule-validator.js';

export interface RunCheckInput {
  action?: Record<string, unknown>;
  context?: Record<string, unknown>;
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

const DEFAULT_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Check timeout')), ms)
    ),
  ]);
}

async function runOneCheck(
  check: ValidationCheckRow,
  input: RunCheckInput
): Promise<CheckRunResult> {
  const start = Date.now();
  const timeoutMs = (check.timeout_seconds ?? 5) * 1000 || DEFAULT_TIMEOUT_MS;
  // Include action, context, and output in scanned text so PII in any of them is detected
  const text =
    input.text ??
    (typeof input.output === 'string'
      ? input.output
      : JSON.stringify({
          action: input.action,
          context: input.context,
          output: input.output,
        }));
  const payload = input.output ?? input.action;

  try {
    const result = await withTimeout(
      (async (): Promise<{ result: 'pass' | 'fail' | 'warn'; reason?: string }> => {
        if (check.check_type === 'schema') {
          const schema = check.configuration?.schema as Record<string, unknown> | undefined;
          if (!schema) return { result: 'fail', reason: 'Schema not configured' };
          const r = validateAgainstSchema(schema, payload);
          return { result: r.pass ? 'pass' : 'fail', reason: r.errors?.map((e) => e.message).join('; ') };
        }
        if (check.check_type === 'pii') {
          const config: PiiConfig = {
            types_to_check: check.configuration?.types_to_check as PiiConfig['types_to_check'],
            action: check.configuration?.action as 'fail' | 'warn',
          };
          const r = detectPii(text, config);
          const result = r.pass ? (r.detected_types.length ? 'warn' : 'pass') : 'fail';
          return { result, reason: r.message };
        }
        if (check.check_type === 'sentiment') {
          const r = await analyzeSentiment(text, {
            threshold: check.configuration?.threshold as number | undefined,
            api_url: check.configuration?.api_url as string | undefined,
            api_key: check.configuration?.api_key as string | undefined,
          });
          return { result: r.pass ? 'pass' : 'fail', reason: r.message };
        }
        if (check.check_type === 'business-rule') {
          const endpointUrl = check.configuration?.endpoint_url as string | undefined;
          if (!endpointUrl) return { result: 'fail', reason: 'endpoint_url not configured' };
          const r = await validateBusinessRule((input.action ?? {}) as Record<string, unknown>, {
            endpoint_url: endpointUrl,
            timeout_seconds: check.timeout_seconds,
            method: check.configuration?.method as 'POST' | 'GET' | undefined,
          });
          return { result: r.pass ? 'pass' : 'fail', reason: r.message ?? r.rule_violated };
        }
        return { result: 'fail', reason: `Unsupported check_type: ${check.check_type}` };
      })(),
      timeoutMs
    );
    return {
      check_id: check.id,
      check_type: check.check_type,
      result: result.result,
      reason: result.reason,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Check failed';
    return {
      check_id: check.id,
      check_type: check.check_type,
      result: 'fail',
      reason,
      duration_ms: Date.now() - start,
    };
  }
}

export interface ValidationRunResult {
  result: 'pass' | 'fail' | 'warning';
  checks_run: CheckRunResult[];
  overall_duration_ms: number;
}

export async function runValidation(
  checks: ValidationCheckRow[],
  input: RunCheckInput
): Promise<ValidationRunResult> {
  const start = Date.now();
  const results = await Promise.all(checks.map((c) => runOneCheck(c, input)));
  const overall_duration_ms = Date.now() - start;
  const hasFail = results.some((r) => r.result === 'fail');
  const hasWarn = results.some((r) => r.result === 'warn');
  const result: ValidationRunResult['result'] = hasFail ? 'fail' : hasWarn ? 'warning' : 'pass';
  return { result, checks_run: results, overall_duration_ms };
}
