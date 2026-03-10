/**
 * Business rule check (WO-32): call configured HTTP endpoint with action data, parse pass/fail, timeout.
 */
export async function validateBusinessRule(actionData, config) {
    const url = config.endpoint_url;
    const timeoutMs = (config.timeout_seconds ?? 10) * 1000;
    try {
        const res = await fetch(url, {
            method: config.method ?? 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actionData),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
            return { pass: false, message: `Business rule endpoint returned ${res.status}` };
        }
        const data = (await res.json());
        const pass = data.pass ?? data.valid ?? false;
        return {
            pass,
            message: data.message,
            rule_violated: data.violated_rule,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Business rule check failed';
        return { pass: false, message };
    }
}
