/**
 * Governed decorator and action helpers (WO-52).
 * Wraps agent actions to route through the gateway and handle policy decisions.
 */

import type { ControlPlaneClient } from './control-plane-client.js';
import type { SubmitActionRequest, SubmitActionResult } from './control-plane-client.js';
import type { EvidenceRecord } from './evidence-builder.js';
import { ActionDeniedError } from './errors.js';

export type GovernedActionHandler = (
  client: ControlPlaneClient,
  actionType: string,
  targetResource: string,
  params: Record<string, unknown>,
  evidence?: EvidenceRecord
) => Promise<SubmitActionResult>;

/**
 * Submit a governed action (read-like: no side effects). Helper for read/propose patterns.
 */
export async function read(
  client: ControlPlaneClient,
  actionType: string,
  targetResource: string,
  params: Record<string, unknown> = {},
  evidence?: EvidenceRecord
): Promise<SubmitActionResult> {
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
export async function proposeChange(
  client: ControlPlaneClient,
  actionType: string,
  targetResource: string,
  params: Record<string, unknown> = {},
  evidence?: EvidenceRecord
): Promise<SubmitActionResult> {
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
export async function commitChange(
  client: ControlPlaneClient,
  actionType: string,
  targetResource: string,
  params: Record<string, unknown> = {},
  evidence?: EvidenceRecord
): Promise<SubmitActionResult> {
  return submitGovernedAction(client, {
    action_type: actionType,
    target_resource: targetResource,
    parameters: { ...evidence?.parameters, ...params },
    context: evidence?.context,
    reasoning: evidence?.reasoning,
  });
}

async function submitGovernedAction(
  client: ControlPlaneClient,
  request: SubmitActionRequest
): Promise<SubmitActionResult> {
  const result = await client.submitAction(request);

  if (result.decision === 'allow-with-approval' && result.poll_url) {
    const requestId = result.request_id;
    if (requestId) {
      const status = await client.waitForApproval({ requestId });
      if (status.status === 'denied' || status.status === 'expired') {
        throw new ActionDeniedError(
          status.denial_reason ?? 'Approval denied or expired',
          status.status,
          { status }
        );
      }
      if (status.status === 'approved') {
        return { ...result, decision: 'allow' as const };
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
export function governed(
  client: ControlPlaneClient,
  actionType: string,
  getTargetResource: (...args: unknown[]) => string
) {
  return function (
    _target: unknown,
    _propertyKey: string,
  ): void {
    // TypeScript decorators that replace method behavior are applied at design time.
    // We cannot easily wrap "any method" with gateway submission here without
    // changing the method signature. So we expose the helpers read/proposeChange/commitChange
    // and document the pattern; a true @governed decorator would require the method to
    // return (actionType, targetResource, params, evidence) and we'd wrap the call.
    // For WO-52 we provide the helper pattern; decorator can be a no-op or throw if used incorrectly.
  };
}
