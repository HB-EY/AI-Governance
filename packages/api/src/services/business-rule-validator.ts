/**
 * Business rule check (WO-32): call configured HTTP endpoint with action data, parse pass/fail, timeout.
 */

export interface BusinessRuleConfig {
  endpoint_url: string;
  timeout_seconds?: number;
  method?: 'POST' | 'GET';
}

export interface BusinessRuleCheckResult {
  pass: boolean;
  message?: string;
  rule_violated?: string;
}

export async function validateBusinessRule(
  actionData: Record<string, unknown>,
  config: BusinessRuleConfig
): Promise<BusinessRuleCheckResult> {
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
    const data = (await res.json()) as { pass?: boolean; valid?: boolean; violated_rule?: string; message?: string };
    const pass = data.pass ?? data.valid ?? false;
    return {
      pass,
      message: data.message,
      rule_violated: data.violated_rule,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Business rule check failed';
    return { pass: false, message };
  }
}
