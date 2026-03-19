/**
 * Validation runner (WO-33): run checks in parallel with timeout, aggregate pass/fail/warning.
 */
import { validateAgainstSchema } from './schema-validator.js';
import { detectPii } from './pii-detector.js';
import { analyzeSentiment } from './sentiment-analyzer.js';
import { validateBusinessRule } from './business-rule-validator.js';
const DEFAULT_TIMEOUT_MS = 5000;
function withTimeout(p, ms) {
    return Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Check timeout')), ms)),
    ]);
}
async function runOneCheck(check, input) {
    const start = Date.now();
    const timeoutMs = (check.timeout_seconds ?? 5) * 1000 || DEFAULT_TIMEOUT_MS;
    // Include action, context, and output in scanned text so PII in any of them is detected
    const text = input.text ??
        (typeof input.output === 'string'
            ? input.output
            : JSON.stringify({
                action: input.action,
                context: input.context,
                output: input.output,
            }));
    const payload = input.output ?? input.action;
    try {
        const result = await withTimeout((async () => {
            if (check.check_type === 'schema') {
                const schema = check.configuration?.schema;
                if (!schema)
                    return { result: 'fail', reason: 'Schema not configured' };
                const r = validateAgainstSchema(schema, payload);
                return { result: r.pass ? 'pass' : 'fail', reason: r.errors?.map((e) => e.message).join('; ') };
            }
            if (check.check_type === 'pii') {
                const config = {
                    types_to_check: check.configuration?.types_to_check,
                    action: check.configuration?.action,
                };
                const r = detectPii(text, config);
                const result = r.pass ? (r.detected_types.length ? 'warn' : 'pass') : 'fail';
                return { result, reason: r.message };
            }
            if (check.check_type === 'sentiment') {
                const r = await analyzeSentiment(text, {
                    threshold: check.configuration?.threshold,
                    api_url: check.configuration?.api_url,
                    api_key: check.configuration?.api_key,
                });
                return { result: r.pass ? 'pass' : 'fail', reason: r.message };
            }
            if (check.check_type === 'business-rule') {
                const endpointUrl = check.configuration?.endpoint_url;
                if (!endpointUrl)
                    return { result: 'fail', reason: 'endpoint_url not configured' };
                const r = await validateBusinessRule((input.action ?? {}), {
                    endpoint_url: endpointUrl,
                    timeout_seconds: check.timeout_seconds,
                    method: check.configuration?.method,
                });
                return { result: r.pass ? 'pass' : 'fail', reason: r.message ?? r.rule_violated };
            }
            return { result: 'fail', reason: `Unsupported check_type: ${check.check_type}` };
        })(), timeoutMs);
        return {
            check_id: check.id,
            check_type: check.check_type,
            result: result.result,
            reason: result.reason,
            duration_ms: Date.now() - start,
        };
    }
    catch (err) {
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
export async function runValidation(checks, input) {
    const start = Date.now();
    const results = await Promise.all(checks.map((c) => runOneCheck(c, input)));
    const overall_duration_ms = Date.now() - start;
    const hasFail = results.some((r) => r.result === 'fail');
    const hasWarn = results.some((r) => r.result === 'warn');
    const result = hasFail ? 'fail' : hasWarn ? 'warning' : 'pass';
    return { result, checks_run: results, overall_duration_ms };
}
