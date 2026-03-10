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
export declare function validateBusinessRule(actionData: Record<string, unknown>, config: BusinessRuleConfig): Promise<BusinessRuleCheckResult>;
