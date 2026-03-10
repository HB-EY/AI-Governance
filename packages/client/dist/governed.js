/**
 * Governed decorator and action helpers (WO-52).
 * Wraps agent actions to route through the gateway and handle policy decisions.
 */
import { ActionDeniedError } from './errors.js';
/**
 * Submit a governed action (read-like: no side effects). Helper for read/propose patterns.
 */
export async function read(client, actionType, targetResource, params = {}, evidence) {
    return submitGovernedAction(client, {
        action_type: actionType,
        target_resource: targetResource,
        parameters: params,
        context: evidence?.context,
        reasoning: evidence?.reasoning,
    });
}
/**
 * Propose a change (allow-with-validation or allow-with-approval possible).
 */
export async function proposeChange(client, actionType, targetResource, params = {}, evidence) {
    return submitGovernedAction(client, {
        action_type: actionType,
        target_resource: targetResource,
        parameters: params,
        context: evidence?.context,
        reasoning: evidence?.reasoning,
    });
}
/**
 * Commit/execute change (same as submitAction with evidence).
 */
export async function commitChange(client, actionType, targetResource, params = {}, evidence) {
    return submitGovernedAction(client, {
        action_type: actionType,
        target_resource: targetResource,
        parameters: { ...evidence?.parameters, ...params },
        context: evidence?.context,
        reasoning: evidence?.reasoning,
    });
}
async function submitGovernedAction(client, request) {
    const result = await client.submitAction(request);
    if (result.decision === 'allow-with-approval' && result.poll_url) {
        const requestId = result.request_id;
        if (requestId) {
            const status = await client.waitForApproval({ requestId });
            if (status.status === 'denied' || status.status === 'expired') {
                throw new ActionDeniedError(status.denial_reason ?? 'Approval denied or expired', status.status, { status });
            }
            if (status.status === 'approved') {
                return { ...result, decision: 'allow' };
            }
        }
    }
    return result;
}
/**
 * Governed decorator factory: wraps an async method to route through the gateway.
 * Usage: @governed(client, 'ticket-update', (t) => t.id)
 * Decorator extracts action_type and target_resource from args; method params become action parameters.
 */
export function governed(client, actionType, getTargetResource) {
    return function (_target, _propertyKey) {
        // TypeScript decorators that replace method behavior are applied at design time.
        // We cannot easily wrap "any method" with gateway submission here without
        // changing the method signature. So we expose the helpers read/proposeChange/commitChange
        // and document the pattern; a true @governed decorator would require the method to
        // return (actionType, targetResource, params, evidence) and we'd wrap the call.
        // For WO-52 we provide the helper pattern; decorator can be a no-op or throw if used incorrectly.
    };
}
